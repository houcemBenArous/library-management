// main.js
// Gestion de la navigation et du contenu dynamique

let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
  const main = document.getElementById('main-content');
  document.getElementById('nav-home').onclick = showHome;
  document.getElementById('nav-search').onclick = showSearch;
  document.getElementById('nav-admin').onclick = showAdminLogin;
  showHome();
  showUserNav();
});

function showHome() {
  document.getElementById('main-content').innerHTML = `
    <h2>Bienvenue à la Mini Bibliothèque</h2>
    <p>Utilisez la navigation pour rechercher des livres ou accéder à l'espace administrateur.</p>
  `;
}

function showSearch() {
  document.getElementById('main-content').innerHTML = `
    <h2>Recherche de livres</h2>
    <form id="search-form">
      <input type="text" id="search-title" placeholder="Titre">
      <input type="text" id="search-author" placeholder="Auteur">
      <input type="text" id="search-category" placeholder="Catégorie">
      <button type="submit">Rechercher</button>
    </form>
    <div id="search-results"></div>
  `;
  document.getElementById('search-form').onsubmit = handleSearch;
  // Afficher tous les livres par défaut
  fetchAllBooks();
}

async function handleSearch(e) {
  e.preventDefault();
  const title = document.getElementById('search-title').value;
  const author = document.getElementById('search-author').value;
  const category = document.getElementById('search-category').value;
  // Appel GraphQL
  const query = `query { books(titre: "${title}", auteur: "${author}", categorie: "${category}") { id titre auteur categorie disponible } }`;
  const res = await fetch('http://localhost:4000/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  const data = await res.json();
  displayResults(data.data.books);
}

async function fetchAllBooks() {
  const query = `query { books { id titre auteur categorie disponible } }`;
  const res = await fetch('http://localhost:4000/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  const data = await res.json();
  displayResults(data.data.books);
}

function displayResults(books) {
  const results = document.getElementById('search-results');
  if (!books || books.length === 0) {
    results.innerHTML = '<div class="alert alert-warning">Aucun livre trouvé.</div>';
    return;
  }
  results.innerHTML = `<div class="row">` + books.map(book => `
    <div class="col-md-4">
      <div class="card book-card shadow-sm mb-4">
        <div class="card-body">
          <h5 class="card-title">${book.titre}</h5>
          <h6 class="card-subtitle mb-2 text-muted">${book.auteur}</h6>
          <span class="badge bg-info mb-2">${book.categorie}</span><br>
          <span class="badge ${book.disponible ? 'bg-success' : 'bg-secondary'} mb-2">${book.disponible ? 'Disponible' : 'Indisponible'}</span>
          <div class="mt-2">
            <button class="btn btn-outline-primary btn-sm me-2" onclick="showBookDetail(${book.id})">Détails</button>
            ${book.disponible ? `<button class="btn btn-success btn-sm" onclick="reserveBook(${book.id})">Réserver</button>` : ''}
          </div>
        </div>
      </div>
    </div>
  `).join('') + `</div>`;
}

window.showBookDetail = async function(id) {
  // Appel GraphQL pour détails
  const query = `query { book(id: ${id}) { id titre auteur categorie disponible } }`;
  const res = await fetch('http://localhost:4000/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  const book = (await res.json()).data.book;
  document.getElementById('main-content').innerHTML = `
    <h2>Détail du livre</h2>
    <p><strong>Titre :</strong> ${book.titre}</p>
    <p><strong>Auteur :</strong> ${book.auteur}</p>
    <p><strong>Catégorie :</strong> ${book.categorie}</p>
    <p><strong>Disponible :</strong> ${book.disponible ? 'Oui' : 'Non'}</p>
    <button onclick="showSearch()">Retour</button>
    ${book.disponible ? `<button onclick="reserveBook(${book.id})">Réserver</button>` : ''}
  `;
}

window.reserveBook = async function(id) {
  if (!currentUser) {
    alert('Vous devez être connecté pour réserver.');
    showUserLogin();
    return;
  }
  const userId = currentUser.id;
  const res = await fetch('http://localhost:4000/api/reservations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, book_id: id })
  });
  if (res.ok) {
    alert('Réservation effectuée !');
    showSearch();
  } else {
    alert('Erreur lors de la réservation.');
  }
}

function showAdminLogin() {
  document.getElementById('main-content').innerHTML = `
    <h2>Connexion Administrateur</h2>
    <form id="admin-login-form">
      <input type="email" id="admin-email" placeholder="Email" required>
      <input type="password" id="admin-password" placeholder="Mot de passe" required>
      <button type="submit">Connexion</button>
    </form>
    <div id="admin-login-error" style="color:red;"></div>
  `;
  document.getElementById('admin-login-form').onsubmit = handleAdminLogin;
}

async function handleAdminLogin(e) {
  e.preventDefault();
  const email = document.getElementById('admin-email').value;
  const mot_de_passe = document.getElementById('admin-password').value;
  const res = await fetch('http://localhost:4000/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, mot_de_passe })
  });
  if (res.ok) {
    showAdminDashboard();
  } else {
    document.getElementById('admin-login-error').innerText = 'Identifiants invalides.';
  }
}

function showAdminDashboard() {
  document.getElementById('main-content').innerHTML = `
    <h2>Tableau de bord Administrateur</h2>
    <button onclick="showBookList()">Gérer les livres</button>
    <button onclick="showReservations()">Voir les réservations</button>
    <button onclick="showHome()">Déconnexion</button>
    <div id="admin-content"></div>
  `;
}

window.showBookList = async function() {
  const res = await fetch('http://localhost:4000/admin/books');
  const books = await res.json();
  document.getElementById('admin-content').innerHTML = `
    <h3>Livres</h3>
    <button onclick="showAddBookForm()">Ajouter un livre</button>
    <ul>
      ${books.map(book => `
        <li>
          <strong>${book.titre}</strong> par ${book.auteur} [${book.categorie}] - Disponible : ${book.disponible ? 'Oui' : 'Non'}
          <button onclick="showEditBookForm(${book.id})">Modifier</button>
          <button onclick="deleteBook(${book.id})">Supprimer</button>
          ${!book.disponible ? `<button onclick="retourLivre(${book.id})">Retour</button>` : ''}
        </li>
      `).join('')}
    </ul>
  `;
}

window.showAddBookForm = function() {
  document.getElementById('admin-content').innerHTML = `
    <h3>Ajouter un livre</h3>
    <form id="add-book-form">
      <input type="text" id="add-titre" placeholder="Titre" required>
      <input type="text" id="add-auteur" placeholder="Auteur" required>
      <input type="text" id="add-categorie" placeholder="Catégorie" required>
      <button type="submit">Ajouter</button>
    </form>
  `;
  document.getElementById('add-book-form').onsubmit = async function(e) {
    e.preventDefault();
    const titre = document.getElementById('add-titre').value;
    const auteur = document.getElementById('add-auteur').value;
    const categorie = document.getElementById('add-categorie').value;
    const res = await fetch('http://localhost:4000/admin/books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titre, auteur, categorie })
    });
    if (res.ok) showBookList();
  };
}

window.showEditBookForm = async function(id) {
  const res = await fetch(`http://localhost:4000/admin/books/${id}`);
  const book = await res.json();
  document.getElementById('admin-content').innerHTML = `
    <h3>Modifier le livre</h3>
    <form id="edit-book-form">
      <input type="text" id="edit-titre" value="${book.titre}" required>
      <input type="text" id="edit-auteur" value="${book.auteur}" required>
      <input type="text" id="edit-categorie" value="${book.categorie}" required>
      <button type="submit">Enregistrer</button>
    </form>
  `;
  document.getElementById('edit-book-form').onsubmit = async function(e) {
    e.preventDefault();
    const titre = document.getElementById('edit-titre').value;
    const auteur = document.getElementById('edit-auteur').value;
    const categorie = document.getElementById('edit-categorie').value;
    const res = await fetch(`http://localhost:4000/admin/books/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titre, auteur, categorie })
    });
    if (res.ok) showBookList();
  };
}

window.deleteBook = async function(id) {
  if (!confirm('Supprimer ce livre ?')) return;
  const res = await fetch(`http://localhost:4000/admin/books/${id}`, { method: 'DELETE' });
  if (res.ok) showBookList();
}

window.showReservations = async function() {
  const res = await fetch('http://localhost:4000/admin/reservations');
  const reservations = await res.json();
  document.getElementById('admin-content').innerHTML = `
    <h3>Réservations</h3>
    <ul>
      ${reservations.map(r => `
        <li>
          Livre <b>${r.book_titre}</b> réservé par <b>${r.user_nom}</b> le ${r.date_reservation} - Statut : <b>${r.statut}</b>
        </li>
      `).join('')}
    </ul>
  `;
}

// Ajout pour l'utilisateur : voir et annuler ses réservations
window.showUserReservations = async function() {
  if (!currentUser) return;
  const res = await fetch('http://localhost:4000/admin/reservations');
  const reservations = await res.json();
  const myReservations = reservations.filter(r => r.user_id === currentUser.id);
  document.getElementById('main-content').innerHTML = `
    <h2>Mes réservations</h2>
    <ul>
      ${myReservations.map(r => `
        <li>
          Livre <b>${r.book_titre}</b> réservé le ${r.date_reservation} - Statut : <b>${r.statut}</b>
          <button onclick="cancelReservation(${r.id})">Annuler</button>
        </li>
      `).join('')}
    </ul>
    <button onclick="showSearch()">Retour</button>
  `;
}

window.cancelReservation = async function(reservationId) {
  if (!confirm('Annuler cette réservation ?')) return;
  const res = await fetch(`http://localhost:4000/api/reservations/${reservationId}`, { method: 'DELETE' });
  if (res.ok) window.showUserReservations();
  else alert('Erreur lors de l\'annulation.');
}

window.retourLivre = async function(bookId) {
  const res = await fetch(`http://localhost:4000/admin/books/${bookId}/retour`, { method: 'POST' });
  if (res.ok) showBookList();
}

function showUserNav() {
  const nav = document.querySelector('nav');
  let userBtn = document.getElementById('nav-user');
  if (!userBtn) {
    userBtn = document.createElement('button');
    userBtn.id = 'nav-user';
    nav.appendChild(userBtn);
  }
  if (currentUser) {
    userBtn.textContent = 'Déconnexion (' + currentUser.nom + ')';
    userBtn.onclick = () => { logoutUser(); };
    // Ajout bouton "Mes réservations"
    let resBtn = document.getElementById('nav-res');
    if (!resBtn) {
      resBtn = document.createElement('button');
      resBtn.id = 'nav-res';
      nav.appendChild(resBtn);
    }
    resBtn.textContent = 'Mes réservations';
    resBtn.onclick = window.showUserReservations;
  } else {
    userBtn.textContent = 'Connexion';
    userBtn.onclick = showUserLogin;
    let resBtn = document.getElementById('nav-res');
    if (resBtn) resBtn.remove();
  }
}

function showUserLogin() {
  document.getElementById('main-content').innerHTML = `
    <h2>Connexion Utilisateur</h2>
    <form id="user-login-form">
      <input type="email" id="user-email" placeholder="Email" required>
      <input type="password" id="user-password" placeholder="Mot de passe" required>
      <button type="submit">Connexion</button>
    </form>
    <p>Pas de compte ? <a href="#" id="show-register">Créer un compte</a></p>
    <div id="user-login-error" style="color:red;"></div>
  `;
  document.getElementById('user-login-form').onsubmit = handleUserLogin;
  document.getElementById('show-register').onclick = showUserRegister;
}

function showUserRegister() {
  document.getElementById('main-content').innerHTML = `
    <h2>Créer un compte</h2>
    <form id="user-register-form">
      <input type="text" id="register-nom" placeholder="Nom" required>
      <input type="email" id="register-email" placeholder="Email" required>
      <input type="password" id="register-password" placeholder="Mot de passe" required>
      <button type="submit">S'inscrire</button>
    </form>
    <div id="user-register-error" style="color:red;"></div>
  `;
  document.getElementById('user-register-form').onsubmit = handleUserRegister;
}

async function handleUserLogin(e) {
  e.preventDefault();
  const email = document.getElementById('user-email').value;
  const mot_de_passe = document.getElementById('user-password').value;
  const res = await fetch('http://localhost:4000/user/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, mot_de_passe })
  });
  if (res.ok) {
    const user = await res.json();
    currentUser = user;
    localStorage.setItem('user', JSON.stringify(user));
    showUserNav();
    showHome();
  } else {
    document.getElementById('user-login-error').innerText = 'Identifiants invalides.';
  }
}

async function handleUserRegister(e) {
  e.preventDefault();
  const nom = document.getElementById('register-nom').value;
  const email = document.getElementById('register-email').value;
  const mot_de_passe = document.getElementById('register-password').value;
  const res = await fetch('http://localhost:4000/user/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nom, email, mot_de_passe })
  });
  if (res.ok) {
    alert('Compte créé, vous pouvez vous connecter.');
    showUserLogin();
  } else {
    document.getElementById('user-register-error').innerText = 'Erreur lors de la création du compte.';
  }
}

function logoutUser() {
  currentUser = null;
  localStorage.removeItem('user');
  showUserNav();
  showHome();
}

// Charger l'utilisateur depuis localStorage au chargement
if (localStorage.getItem('user')) {
  currentUser = JSON.parse(localStorage.getItem('user'));
}