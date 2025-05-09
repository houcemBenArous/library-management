const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const PROTO_PATH = path.join(__dirname, 'inventory.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true });
const inventoryProto = grpc.loadPackageDefinition(packageDefinition).inventory;

const db = new sqlite3.Database(path.join(__dirname, '../../db/library.db'));

const server = new grpc.Server();

const inventoryService = {
  ReserveBook: (call, callback) => {
    const { book_id } = call.request;
    db.get('SELECT disponible FROM books WHERE id = ?', [book_id], (err, row) => {
      if (err || !row) return callback(null, { success: false, message: 'Livre introuvable' });
      if (!row.disponible) return callback(null, { success: false, message: 'Livre non disponible' });
      db.run('UPDATE books SET disponible = 0 WHERE id = ?', [book_id], function(err2) {
        if (err2) return callback(null, { success: false, message: 'Erreur lors de la réservation' });
        callback(null, { success: true, message: 'Réservation réussie' });
      });
    });
  },
  CheckAvailability: (call, callback) => {
    const { book_id } = call.request;
    db.get('SELECT disponible FROM books WHERE id = ?', [book_id], (err, row) => {
      if (err || !row) return callback(null, { disponible: false });
      callback(null, { disponible: !!row.disponible });
    });
  },
  ReturnBook: (call, callback) => {
    const { book_id } = call.request;
    db.run('UPDATE books SET disponible = 1 WHERE id = ?', [book_id], function(err) {
      if (err) return callback(null, { success: false, message: 'Erreur lors du retour' });
      callback(null, { success: true, message: 'Livre rendu disponible' });
    });
  }
};

server.addService(inventoryProto.InventoryService.service, inventoryService);
server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), () => {
  console.log('InventoryService gRPC server démarré sur le port 50051');
  server.start();
});