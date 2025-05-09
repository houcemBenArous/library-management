const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./library.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titre TEXT NOT NULL,
    auteur TEXT NOT NULL,
    categorie TEXT NOT NULL,
    disponible INTEGER DEFAULT 1
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    mot_de_passe TEXT NOT NULL,
    is_admin INTEGER DEFAULT 0
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    book_id INTEGER NOT NULL,
    date_reservation TEXT NOT NULL,
    statut TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(book_id) REFERENCES books(id)
  )`);

  // Insertion d'un admin par défaut
  db.run(`INSERT OR IGNORE INTO users (nom, email, mot_de_passe, is_admin) VALUES ('Admin', 'admin@admin.com', 'admin123', 1)`);
  // Insertion d'un utilisateur simple par défaut
  db.run(`INSERT OR IGNORE INTO users (nom, email, mot_de_passe, is_admin) VALUES ('Utilisateur', 'user@user.com', 'user123', 0)`);

  console.log('Base de données, tables et utilisateurs par défaut créés avec succès.');
});

db.close();