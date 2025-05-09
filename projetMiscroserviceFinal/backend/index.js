const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { graphqlHTTP } = require('express-graphql');
const { buildSchema } = require('graphql');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const app = express();
const PORT = 4000;

app.use(cors());
app.use(bodyParser.json());

// Connexion à la base SQLite
const db = new sqlite3.Database(path.join(__dirname, '../db/library.db'));

// Chargement du proto pour gRPC
const PROTO_PATH = path.join(__dirname, '../services/inventoryService/inventory.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true });
const inventoryProto = grpc.loadPackageDefinition(packageDefinition).inventory;
const inventoryClient = new inventoryProto.InventoryService('localhost:50051', grpc.credentials.createInsecure());

// Schéma GraphQL
const schema = buildSchema(`
  type Book {
    id: ID!
    titre: String!
    auteur: String!
    categorie: String!
    disponible: Boolean!
  }
  type Query {
    books(titre: String, auteur: String, categorie: String): [Book]
    book(id: ID!): Book
  }
`);

const root = {
  books: ({ titre = '', auteur = '', categorie = '' }) => {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM books WHERE titre LIKE ? AND auteur LIKE ? AND categorie LIKE ?`,
        [`%${titre}%`, `%${auteur}%`, `%${categorie}%`],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows.map(b => ({ ...b, disponible: !!b.disponible })));
        }
      );
    });
  },
  book: ({ id }) => {
    return new Promise((resolve, reject) => {
      db.get(`SELECT * FROM books WHERE id = ?`, [id], (err, row) => {
        if (err) reject(err);
        else if (!row) resolve(null);
        else resolve({ ...row, disponible: !!row.disponible });
      });
    });
  }
};

app.use('/graphql', graphqlHTTP({
  schema,
  rootValue: root,
  graphiql: true
}));

// Authentification admin (REST)
app.post('/admin/login', (req, res) => {
  const { email, mot_de_passe } = req.body;
  db.get(`SELECT * FROM users WHERE email = ? AND mot_de_passe = ? AND is_admin = 1`, [email, mot_de_passe], (err, user) => {
    if (err || !user) return res.status(401).json({ error: 'Identifiants invalides' });
    res.json({ message: 'Connexion réussie' });
  });
});

// Inscription utilisateur
app.post('/user/register', (req, res) => {
  const { nom, email, mot_de_passe } = req.body;
  if (!nom || !email || !mot_de_passe) return res.status(400).json({ error: 'Champs manquants' });
  db.run(`INSERT INTO users (nom, email, mot_de_passe, is_admin) VALUES (?, ?, ?, 0)`, [nom, email, mot_de_passe], function(err) {
    if (err) return res.status(400).json({ error: 'Email déjà utilisé ou erreur.' });
    res.json({ success: true });
  });
});

// Connexion utilisateur
app.post('/user/login', (req, res) => {
  const { email, mot_de_passe } = req.body;
  db.get(`SELECT id, nom, email FROM users WHERE email = ? AND mot_de_passe = ? AND is_admin = 0`, [email, mot_de_passe], (err, user) => {
    if (err || !user) return res.status(401).json({ error: 'Identifiants invalides' });
    res.json(user);
  });
});

// CRUD Livres (REST)
app.get('/admin/books', (req, res) => {
  db.all(`SELECT * FROM books`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(b => ({ ...b, disponible: !!b.disponible })));
  });
});

app.get('/admin/books/:id', (req, res) => {
  db.get(`SELECT * FROM books WHERE id = ?`, [req.params.id], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Livre non trouvé' });
    res.json({ ...row, disponible: !!row.disponible });
  });
});

app.post('/admin/books', (req, res) => {
  const { titre, auteur, categorie } = req.body;
  db.run(`INSERT INTO books (titre, auteur, categorie, disponible) VALUES (?, ?, ?, 1)`, [titre, auteur, categorie], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, titre, auteur, categorie, disponible: true });
  });
});

app.put('/admin/books/:id', (req, res) => {
  const { titre, auteur, categorie } = req.body;
  db.run(`UPDATE books SET titre = ?, auteur = ?, categorie = ? WHERE id = ?`, [titre, auteur, categorie, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: req.params.id, titre, auteur, categorie });
  });
});

app.delete('/admin/books/:id', (req, res) => {
  db.run(`DELETE FROM books WHERE id = ?`, [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Liste des réservations (admin)
app.get('/admin/reservations', (req, res) => {
  db.all(`SELECT r.id, r.user_id, r.book_id, r.date_reservation, r.statut, u.nom as user_nom, b.titre as book_titre FROM reservations r JOIN users u ON r.user_id = u.id JOIN books b ON r.book_id = b.id`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Réservation directe par l'utilisateur (si livre disponible)
app.post('/api/reservations', (req, res) => {
  const { user_id, book_id } = req.body;
  if (!user_id || !book_id) return res.status(400).json({ error: 'Champs manquants' });
  db.get(`SELECT id FROM users WHERE id = ?`, [user_id], (err, user) => {
    if (err || !user) return res.status(401).json({ error: 'Utilisateur non authentifié' });
    // Vérifier disponibilité via gRPC
    inventoryClient.CheckAvailability({ book_id }, (err, response) => {
      if (err || !response.disponible) return res.status(400).json({ error: 'Livre non disponible' });
      // Réserver le livre via gRPC
      inventoryClient.ReserveBook({ book_id }, (err2, response2) => {
        if (err2 || !response2.success) return res.status(400).json({ error: 'Réservation impossible' });
        db.run(
          `INSERT INTO reservations (user_id, book_id, date_reservation, statut) VALUES (?, ?, datetime('now'), 'active')`,
          [user_id, book_id],
          function(err3) {
            if (err3) return res.status(500).json({ error: err3.message });
            res.json({ success: true });
          }
        );
      });
    });
  });
});

// Annulation de réservation par l'utilisateur
app.delete('/api/reservations/:id', (req, res) => {
  const reservationId = req.params.id;
  db.get(`SELECT * FROM reservations WHERE id = ?`, [reservationId], (err, reservation) => {
    if (err || !reservation) return res.status(404).json({ error: 'Réservation non trouvée' });
    // Rendre le livre disponible via gRPC
    inventoryClient.ReturnBook({ book_id: reservation.book_id }, (err2, response2) => {
      if (err2 || !response2.success) return res.status(500).json({ error: 'Erreur lors de la remise du livre' });
      db.run(`DELETE FROM reservations WHERE id = ?`, [reservationId], function(err3) {
        if (err3) return res.status(500).json({ error: err3.message });
        res.json({ success: true });
      });
    });
  });
});

// Admin : retour d'un livre (rendre disponible)
app.post('/admin/books/:id/retour', (req, res) => {
  const bookId = req.params.id;
  db.run(`UPDATE books SET disponible = 1 WHERE id = ?`, [bookId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.listen(PORT, () => {
  console.log(`Backend principal démarré sur http://localhost:${PORT}`);
});