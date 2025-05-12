# Mini application de gestion de bibliothèque – Architecture Microservices

## Introduction

Cette application est une solution complète de gestion de bibliothèque basée sur une architecture microservices. Elle permet la consultation, la réservation et la gestion de livres, ainsi que la collecte de statistiques d’utilisation. Le projet illustre l’intégration de plusieurs technologies modernes (REST, GraphQL, gRPC, SQLite) dans un environnement Node.js.

## Architecture générale

L’application est composée de plusieurs services indépendants :

- **Frontend** (HTML/CSS/JS) : Interface utilisateur pour la recherche, la réservation et la gestion des livres.
- **Backend principal** (Express.js) : Point d’entrée unique pour le frontend, expose des API REST et GraphQL, orchestre les appels vers les microservices.
- **Microservice Inventaire** (`inventoryService`) : Gère le stock et la disponibilité des livres (gRPC).
- **Microservice Statistiques** (`statisticsService`) : Collecte et expose des statistiques sur les réservations (gRPC).
- **Base de données** (SQLite) : Stocke les livres, utilisateurs et réservations.

### Schéma d’architecture

```
[Frontend] ⇄ [Backend (REST/GraphQL)] ⇄ [InventoryService (gRPC)]
                                         ⇄ [StatisticsService (gRPC)]
                                         ⇄ [SQLite DB]
```

## Fonctionnalités principales

- 🔎 Recherche et consultation de livres (GraphQL)
- 📚 Réservation directe de livres (REST + gRPC)
- 🛠️ Gestion du catalogue (admin, REST)
- 📊 Statistiques de réservation (gRPC)
- ❌ Annulation de réservation par l’utilisateur (REST + gRPC)

## Détail des microservices

### 1. InventoryService

- **Port** : 50051
- **Protocole** : gRPC
- **Rôle** : Gestion du stock, consultation et mise à jour de la disponibilité des livres (ReserveBook, CheckAvailability, ReturnBook).

### 2. StatisticsService

- **Port** : 50053
- **Protocole** : gRPC
- **Rôle** : Collecte et exposition des statistiques de réservation (nombre de réservations par livre, etc.)

## Base de données

- `books (id, titre, auteur, categorie, disponible)`
- `users (id, nom, email, mot_de_passe, is_admin)`
- `reservations (id, user_id, book_id, date_reservation, statut)`

## Installation et démarrage rapide (Quickstart)

### Prérequis

- Node.js >= 18
- npm
- Windows 11

### Étapes

1. **Cloner le projet**
2. **Installer les dépendances**
   ```bash
   cd backend && npm install
   cd ../services/inventoryService && npm install
   cd ../services/statisticsService && npm install
   ```
3. **Créer la base de données**
   ```bash
   cd ../../db
   node create_db.js
   ```
4. **Lancer les microservices** (dans 2 terminaux séparés)
   ```bash
   # Terminal 1
   cd services/inventoryService && node index.js
   # Terminal 2
   cd ../statisticsService && node index.js
   ```
5. **Lancer le backend principal**
   ```bash
   cd backend
   node index.js
   ```
6. **Lancer le frontend**
   Ouvrir `frontend/index.html` dans votre navigateur.


   

## Exemples d’utilisation

### Réserver un livre (REST)

```http
POST http://localhost:5000/api/reservations
Content-Type: application/json

{
  "user_id": 1,
  "book_id": 2
}
```

### Annuler une réservation (REST)

```http
DELETE http://localhost:5000/api/reservations/1
```

### Requête GraphQL (recherche de livres)

```graphql
query {
  books(titre: "Harry") {
    id
    titre
    auteur
    disponible
  }
}
```
## Gestion des utilisateurs/admin

- Les comptes admin sont à créer manuellement dans la table `users` (champ `is_admin` à 1).
- L’authentification est basique (login/password).

## Technologies utilisées

- Node.js, Express.js, GraphQL, gRPC, SQLite
- HTML, CSS, JavaScript (vanilla)

## Contribution

- Forkez le projet, créez une branche, proposez une Pull Request.
- Pour toute question ou bug, ouvrez une issue.

## Auteur

- Réalisé par [Votre Nom] – 2025
