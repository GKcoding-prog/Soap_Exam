/* ═══════════════════════════════════════════════════════════
   HOTEL MANAGER — FRONTEND APP (app.js)
   Vanilla JS, no dependencies
═══════════════════════════════════════════════════════════ */

const API = '/api';
let token = localStorage.getItem('hotel_token');
let currentUser = JSON.parse(localStorage.getItem('hotel_user') || 'null');
let allServices = [];

/* ─────────────────────────────────────────
   UTILS
───────────────────────────────────────── */
const $ = (id) => document.getElementById(id);
const fmt = (n) => Number(n || 0).toLocaleString('fr-FR');
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';
const fmtDatetime = (d) => d ? new Date(d).toLocaleString('fr-FR') : '—';

async function api(method, path, body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API + path, opts);
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.message || 'Erreur serveur');
    err.status = res.status;
    throw err;
  }
  return data;
}

function toast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const icons = { success: '✅', error: '❌', warning: '⚠️' };
  el.innerHTML = `<span>${icons[type] || '💬'}</span><span>${msg}</span>`;
  $('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

function statusBadge(s) {
  const map = {
    confirmee:   ['badge-blue', 'Confirmée'],
    en_cours:    ['badge-green', 'En cours'],
    terminee:    ['badge-gray', 'Terminée'],
    cloturee:    ['badge-green', 'Clôturée'],
    annulee:     ['badge-red', 'Annulée'],
    en_attente:  ['badge-yellow', 'En attente'],
    payee:       ['badge-green', 'Payée'],
    non_defini:  ['badge-gray', 'Non défini'],
  };
  const [cls, lbl] = map[s] || ['badge-gray', s];
  return `<span class="badge ${cls}">${lbl}</span>`;
}

/* ─────────────────────────────────────────
   AUTH
───────────────────────────────────────── */
function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach((t, i) =>
    t.classList.toggle('active', (i === 0) === (tab === 'login')));
  $('login-form').classList.toggle('active', tab === 'login');
  $('register-form').classList.toggle('active', tab === 'register');
}

async function login() {
  try {
    const res = await api('POST', '/auth/connexion', {
      email: $('login-email').value.trim(),
      motDePasse: $('login-password').value,
    });
    token = res.token;
    currentUser = res.data;
    localStorage.setItem('hotel_token', token);
    localStorage.setItem('hotel_user', JSON.stringify(currentUser));
    initApp();
  } catch (e) { toast(e.message, 'error'); }
}

async function register() {
  try {
    const res = await api('POST', '/auth/inscription', {
      nom: $('reg-nom').value.trim(),
      prenom: $('reg-prenom').value.trim(),
      email: $('reg-email').value.trim(),
      telephone: $('reg-tel').value.trim(),
      motDePasse: $('reg-password').value,
    });
    token = res.token;
    currentUser = res.data;
    localStorage.setItem('hotel_token', token);
    localStorage.setItem('hotel_user', JSON.stringify(currentUser));
    initApp();
    toast('Compte créé avec succès !');
  } catch (e) { toast(e.message, 'error'); }
}

function logout() {
  token = null; currentUser = null;
  localStorage.removeItem('hotel_token');
  localStorage.removeItem('hotel_user');
  $('auth-page').classList.add('active');
  $('app-page').style.display = 'none';
  $('auth-page').style.display = 'flex';
}

/* ─────────────────────────────────────────
   APP INIT
───────────────────────────────────────── */
function initApp() {
  $('auth-page').style.display = 'none';
  $('app-page').style.display = 'block';

  const isAdmin = currentUser.role === 'admin';
  $('user-info-sidebar').innerHTML = `<strong>${currentUser.prenom} ${currentUser.nom}</strong>${currentUser.role}`;

  // Show/hide role-specific nav items
  document.querySelectorAll('.admin-only').forEach(el => el.style.display = isAdmin ? '' : 'none');
  document.querySelectorAll('.client-only').forEach(el => el.style.display = !isAdmin ? '' : 'none');

  loadDashboard();
  loadNotifications();
  loadServices(); // cache services for dropdowns
}

/* ─────────────────────────────────────────
   NAVIGATION
───────────────────────────────────────── */
const pageTitles = {
  dashboard: 'Tableau de bord',
  chambres: 'Chambres',
  reservations: 'Réservations',
  clients: 'Gestion des clients',
  'services-admin': 'Gestion des services',
  'services-client': 'Services disponibles',
  factures: 'Factures',
  'mes-factures': 'Mes factures',
};

function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

  const pageEl = $('page-' + page);
  if (pageEl) pageEl.classList.add('active');
  $('page-title').textContent = pageTitles[page] || page;

  // Highlight nav link
  document.querySelectorAll('.nav-link').forEach(l => {
    if (l.getAttribute('onclick')?.includes(`'${page}'`)) l.classList.add('active');
  });

  // Lazy-load
  const loaders = {
    dashboard: loadDashboard,
    chambres: loadChambres,
    reservations: loadReservations,
    clients: loadClients,
    'services-admin': loadServicesAdmin,
    'services-client': loadServicesClient,
    factures: loadFactures,
    'mes-factures': loadMesFactures,
  };
  loaders[page]?.();
}

/* ─────────────────────────────────────────
   DASHBOARD
───────────────────────────────────────── */
async function loadDashboard() {
  try {
    const [chambresRes, resRes] = await Promise.all([
      api('GET', '/chambres?disponible=true'),
      api('GET', '/reservations?statut=confirmee'),
    ]);

    $('stat-chambres').textContent = chambresRes.total;
    $('stat-reservations').textContent = resRes.total;

    if (currentUser.role === 'admin') {
      const [clientsRes, facturesRes] = await Promise.all([
        api('GET', '/clients'),
        api('GET', '/factures/stats'),
      ]);
      $('stat-clients').textContent = clientsRes.total;
      $('stat-revenus').textContent = fmt(facturesRes.data.revenuTotal);
    }

    // Latest reservations (last 5)
    const all = await api('GET', '/reservations');
    const rows = all.data.slice(0, 5).map(r => `
      <tr>
        <td>${r.client?.prenom || ''} ${r.client?.nom || ''}</td>
        <td>${r.chambre?.numero || '—'}</td>
        <td>${fmtDate(r.dateArrivee)}</td>
        <td>${fmtDate(r.dateDepart)}</td>
        <td>${statusBadge(r.statut)}</td>
      </tr>`).join('') || '<tr><td colspan="5" class="text-muted" style="text-align:center">Aucune réservation</td></tr>';

    $('dashboard-reservations').innerHTML = rows;
  } catch (e) { toast(e.message, 'error'); }
}

/* ─────────────────────────────────────────
   CHAMBRES
───────────────────────────────────────── */
async function loadChambres() {
  try {
    const res = await api('GET', '/chambres');
    renderRooms(res.data);
  } catch (e) { toast(e.message, 'error'); }
}

async function searchAvailable() {
  const arrivee = $('search-arrivee').value;
  const depart = $('search-depart').value;
  const capacite = $('search-capacite').value;
  if (!arrivee || !depart) { toast('Veuillez saisir les dates', 'warning'); return; }
  try {
    const res = await api('GET', `/chambres/disponibles?dateArrivee=${arrivee}&dateDepart=${depart}&capacite=${capacite}`);
    renderRooms(res.data, arrivee, depart);
    if (res.total === 0) toast('Aucune chambre disponible pour ces dates', 'warning');
  } catch (e) { toast(e.message, 'error'); }
}

const roomIcons = { simple: '🛏️', double: '🛏️🛏️', suite: '👑', familiale: '👨‍👩‍👧‍👦' };

function renderRooms(rooms, arrivee = null, depart = null) {
  if (!rooms.length) {
    $('rooms-grid').innerHTML = `<div class="empty-state"><div class="empty-icon">🛏️</div><p>Aucune chambre trouvée.</p></div>`;
    return;
  }
  $('rooms-grid').innerHTML = rooms.map(r => `
    <div class="room-card">
      <div class="room-card-img">${roomIcons[r.type] || '🛏️'}</div>
      <div class="room-card-body">
        <div class="room-card-title">Chambre ${r.numero}</div>
        <div class="room-card-sub">${r.type.charAt(0).toUpperCase() + r.type.slice(1)} — Étage ${r.etage} — ${r.capacite} pers.</div>
        <div style="font-size:.78rem;color:var(--muted);margin-bottom:8px">${(r.equipements || []).join(' · ') || '—'}</div>
        <div class="room-card-price">${fmt(r.prixParNuit)} <span>BIF / nuit</span></div>
      </div>
      <div class="room-card-footer">
        ${r.disponible
          ? `<button class="btn btn-accent btn-sm w-full" onclick="openReservationModal('${r._id}','${r.numero}','${r.type}',${r.prixParNuit},'${arrivee || ''}','${depart || ''}')">Réserver</button>`
          : `<span class="badge badge-red" style="width:100%;text-align:center">Indisponible</span>`}
        ${currentUser.role === 'admin' ? `<button class="btn btn-danger btn-sm" onclick="deleteChambre('${r._id}')">🗑️</button>` : ''}
      </div>
    </div>`).join('');
}

async function saveChambre() {
  try {
    const body = {
      numero: $('c-numero').value.trim(),
      type: $('c-type').value,
      prixParNuit: Number($('c-prix').value),
      capacite: Number($('c-capacite').value),
      etage: Number($('c-etage').value) || 1,
      equipements: $('c-equipements').value.split(',').map(s => s.trim()).filter(Boolean),
      description: $('c-description').value,
    };
    await api('POST', '/chambres', body);
    toast('Chambre créée !');
    closeModal('modal-chambre');
    loadChambres();
  } catch (e) { toast(e.message, 'error'); }
}

async function deleteChambre(id) {
  if (!confirm('Supprimer cette chambre ?')) return;
  try {
    await api('DELETE', `/chambres/${id}`);
    toast('Chambre supprimée');
    loadChambres();
  } catch (e) { toast(e.message, 'error'); }
}

/* ─────────────────────────────────────────
   RESERVATIONS
───────────────────────────────────────── */
function openReservationModal(id, numero, type, prix, arrivee = '', depart = '') {
  $('res-chambre-id').value = id;
  $('modal-res-room').textContent = `Chambre ${numero} — ${type} — ${fmt(prix)} BIF/nuit`;
  if (arrivee) $('res-arrivee').value = arrivee;
  if (depart) $('res-depart').value = depart;
  // Attach price preview
  $('res-arrivee').onchange = $('res-depart').onchange = () => previewPrice(prix);
  if (arrivee && depart) previewPrice(prix);
  openModal('modal-reservation');
}

function previewPrice(prixNuit) {
  const a = new Date($('res-arrivee').value);
  const d = new Date($('res-depart').value);
  if (a && d && d > a) {
    const nuits = Math.ceil((d - a) / 86400000);
    $('res-price-preview').style.display = 'block';
    $('res-price-total').textContent = fmt(nuits * prixNuit);
  }
}

async function saveReservation() {
  try {
    await api('POST', '/reservations', {
      chambreId: $('res-chambre-id').value,
      dateArrivee: $('res-arrivee').value,
      dateDepart: $('res-depart').value,
      nombrePersonnes: Number($('res-personnes').value),
      notes: $('res-notes').value,
    });
    toast('Réservation confirmée ! 🎉');
    closeModal('modal-reservation');
    loadNotifications();
    navigate('reservations');
  } catch (e) { toast(e.message, 'error'); }
}

async function loadReservations() {
  const statut = $('filter-statut').value;
  try {
    const res = await api('GET', `/reservations${statut ? '?statut=' + statut : ''}`);
    const isAdmin = currentUser.role === 'admin';

    $('reservations-tbody').innerHTML = res.data.map((r, i) => `
      <tr>
        <td>#${i + 1}</td>
        <td>${r.client?.prenom || ''} ${r.client?.nom || ''}</td>
        <td>Chambre ${r.chambre?.numero || '—'}</td>
        <td>${fmtDate(r.dateArrivee)}</td>
        <td>${fmtDate(r.dateDepart)}</td>
        <td><strong>${fmt(r.prixTotal)}</strong> BIF</td>
        <td>${statusBadge(r.statut)}</td>
        <td>
          ${isAdmin && r.statut === 'confirmee' ? `<button class="btn btn-success btn-sm" onclick="checkin('${r._id}')">Check-in</button>` : ''}
          ${isAdmin && r.statut === 'en_cours' ? `
            <button class="btn btn-primary btn-sm" onclick="openAddService('${r._id}')">+ Service</button>
            <button class="btn btn-accent btn-sm" onclick="checkout('${r._id}')">Check-out</button>` : ''}
          ${!isAdmin && r.statut === 'en_cours' ? `<button class="btn btn-outline btn-sm" onclick="openAddService('${r._id}')">+ Service</button>` : ''}
          ${['terminee','cloturee'].includes(r.statut) && !r.evaluation?.note ? `<button class="btn btn-outline btn-sm" onclick="openEval('${r._id}')">⭐ Évaluer</button>` : ''}
          ${r.evaluation?.note ? `<span class="stars">${'⭐'.repeat(r.evaluation.note)}</span>` : ''}
          ${['en_attente','confirmee'].includes(r.statut) ? `<button class="btn btn-danger btn-sm" onclick="annuler('${r._id}')">Annuler</button>` : ''}
        </td>
      </tr>`).join('') || `<tr><td colspan="8" class="text-muted" style="text-align:center;padding:20px">Aucune réservation</td></tr>`;
  } catch (e) { toast(e.message, 'error'); }
}

async function checkin(id) {
  try {
    await api('PUT', `/reservations/${id}/checkin`);
    toast('Check-in effectué ✅');
    loadReservations();
  } catch (e) { toast(e.message, 'error'); }
}

async function checkout(id) {
  if (!confirm('Effectuer le check-out et générer la facture ?')) return;
  try {
    await api('PUT', `/reservations/${id}/checkout`);
    toast('Check-out effectué. Facture générée 🧾');
    loadReservations();
    loadNotifications();
  } catch (e) { toast(e.message, 'error'); }
}

async function annuler(id) {
  if (!confirm('Annuler cette réservation ?')) return;
  try {
    await api('PUT', `/reservations/${id}/annuler`);
    toast('Réservation annulée', 'warning');
    loadReservations();
  } catch (e) { toast(e.message, 'error'); }
}

/* ─────────────────────────────────────────
   SERVICES
───────────────────────────────────────── */
async function loadServices() {
  try {
    const res = await api('GET', '/services');
    allServices = res.data;
  } catch (e) { /* ignore if not yet authed */ }
}

async function loadServicesAdmin() {
  try {
    const res = await api('GET', '/services');
    allServices = res.data;
    $('services-admin-tbody').innerHTML = res.data.map(s => `
      <tr>
        <td>${s.nom}</td>
        <td><span class="badge badge-blue">${s.categorie}</span></td>
        <td>${fmt(s.prix)}</td>
        <td>${s.disponible ? '✅' : '❌'}</td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="toggleService('${s._id}',${!s.disponible})">${s.disponible ? 'Désactiver' : 'Activer'}</button>
          <button class="btn btn-danger btn-sm" onclick="deleteService('${s._id}')">🗑️</button>
        </td>
      </tr>`).join('');
  } catch (e) { toast(e.message, 'error'); }
}

async function loadServicesClient() {
  try {
    const res = await api('GET', '/services?disponible=true');
    $('services-client-tbody').innerHTML = res.data.map(s => `
      <tr>
        <td>${s.nom}</td>
        <td><span class="badge badge-blue">${s.categorie}</span></td>
        <td><strong>${fmt(s.prix)}</strong> BIF</td>
        <td>${s.description || '—'}</td>
      </tr>`).join('');
  } catch (e) { toast(e.message, 'error'); }
}

async function saveService() {
  try {
    await api('POST', '/services', {
      nom: $('s-nom').value.trim(),
      categorie: $('s-categorie').value,
      prix: Number($('s-prix').value),
      description: $('s-description').value,
    });
    toast('Service créé !');
    closeModal('modal-service');
    loadServicesAdmin();
  } catch (e) { toast(e.message, 'error'); }
}

async function toggleService(id, disponible) {
  try {
    await api('PUT', `/services/${id}`, { disponible });
    toast('Service mis à jour');
    loadServicesAdmin();
  } catch (e) { toast(e.message, 'error'); }
}

async function deleteService(id) {
  if (!confirm('Supprimer ce service ?')) return;
  try {
    await api('DELETE', `/services/${id}`);
    toast('Service supprimé');
    loadServicesAdmin();
  } catch (e) { toast(e.message, 'error'); }
}

function openAddService(resId) {
  $('add-service-res-id').value = resId;
  // Populate dropdown
  $('add-service-id').innerHTML = allServices
    .filter(s => s.disponible)
    .map(s => `<option value="${s._id}">${s.nom} — ${fmt(s.prix)} BIF</option>`)
    .join('');
  openModal('modal-add-service');
}

async function addServiceToReservation() {
  try {
    await api('POST', `/reservations/${$('add-service-res-id').value}/services`, {
      serviceId: $('add-service-id').value,
      quantite: Number($('add-service-qty').value),
      notes: $('add-service-notes').value,
    });
    toast('Service ajouté au séjour ✅');
    closeModal('modal-add-service');
    loadReservations();
  } catch (e) { toast(e.message, 'error'); }
}

/* ─────────────────────────────────────────
   EVALUATION
───────────────────────────────────────── */
function openEval(resId) {
  $('eval-res-id').value = resId;
  openModal('modal-eval');
}

async function submitEval() {
  try {
    await api('POST', `/reservations/${$('eval-res-id').value}/evaluation`, {
      note: Number($('eval-note').value),
      commentaire: $('eval-comment').value,
    });
    toast('Merci pour votre évaluation ⭐');
    closeModal('modal-eval');
    loadReservations();
  } catch (e) { toast(e.message, 'error'); }
}

/* ─────────────────────────────────────────
   CLIENTS (Admin)
───────────────────────────────────────── */
async function loadClients() {
  try {
    const res = await api('GET', '/clients');
    $('clients-tbody').innerHTML = res.data.map(c => `
      <tr>
        <td>${c.prenom} ${c.nom}</td>
        <td>${c.email}</td>
        <td>${c.telephone || '—'}</td>
        <td>${fmtDate(c.createdAt)}</td>
        <td>${c.actif ? '<span class="badge badge-green">Actif</span>' : '<span class="badge badge-red">Inactif</span>'}</td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="voirHistorique('${c._id}','${c.prenom} ${c.nom}')">Historique</button>
          <button class="btn btn-outline btn-sm" onclick="toggleClient('${c._id}',${!c.actif})">${c.actif ? 'Désactiver' : 'Activer'}</button>
        </td>
      </tr>`).join('');
  } catch (e) { toast(e.message, 'error'); }
}

async function toggleClient(id, actif) {
  try {
    await api('PUT', `/clients/${id}`, { actif });
    toast('Client mis à jour');
    loadClients();
  } catch (e) { toast(e.message, 'error'); }
}

async function voirHistorique(id, nom) {
  try {
    const res = await api('GET', `/clients/${id}/historique`);
    const content = res.data.length
      ? res.data.map(r => `• ${fmtDate(r.dateArrivee)} → ${fmtDate(r.dateDepart)} | ${r.chambre?.numero || '?'} | ${statusBadge(r.statut)}`).join('\n')
      : 'Aucune réservation.';
    alert(`Historique de ${nom}:\n\n${res.data.map(r => `${fmtDate(r.dateArrivee)} - ${fmtDate(r.dateDepart)} | Ch.${r.chambre?.numero || '?'} | ${r.statut}`).join('\n') || 'Aucune réservation.'}`);
  } catch (e) { toast(e.message, 'error'); }
}

/* ─────────────────────────────────────────
   FACTURES
───────────────────────────────────────── */
async function loadFactures() {
  try {
    const [factRes, statsRes] = await Promise.all([
      api('GET', '/factures'),
      api('GET', '/factures/stats'),
    ]);
    $('revenue-total').textContent = `Total encaissé : ${fmt(statsRes.data.revenuTotal)} BIF`;
    $('factures-tbody').innerHTML = factRes.data.map(f => `
      <tr>
        <td><strong>${f.numero || '—'}</strong></td>
        <td>${f.client?.prenom || ''} ${f.client?.nom || ''}</td>
        <td>${fmt(f.sousTotal)} BIF</td>
        <td>${fmt(f.montantTVA)} BIF</td>
        <td><strong>${fmt(f.montantTotal)} BIF</strong></td>
        <td>${statusBadge(f.statut)}</td>
        <td>
          ${f.statut !== 'payee' ? `<button class="btn btn-success btn-sm" onclick="payerFacture('${f._id}','${f.numero}',${f.montantTotal})">💳 Payer</button>` : '<span class="text-muted">—</span>'}
        </td>
      </tr>`).join('');
  } catch (e) { toast(e.message, 'error'); }
}

function payerFacture(id, numero, montant) {
  $('pay-facture-id').value = id;
  $('pay-facture-info').textContent = `Facture ${numero} — ${fmt(montant)} BIF`;
  $('pay-methode').value = 'carte';
  togglePayCard();
  openModal('modal-paiement');
}

function togglePayCard() {
  $('pay-card-group').style.display = $('pay-methode').value === 'carte' ? '' : 'none';
}

async function submitPaiement() {
  const id = $('pay-facture-id').value;
  const methode = $('pay-methode').value;
  const btn = $('pay-submit');
  btn.disabled = true;
  try {
    if (methode === 'carte') {
      const cardToken = $('pay-card-token').value.trim();
      if (!cardToken) return toast('Saisissez un token de carte.', 'warning');
      const res = await api('POST', `/factures/${id}/payer-carte`, { cardToken });
      const p = res.data.paiement;
      toast(`Paiement accepté 💳 — ${p.transactionId} (${p.authorizationCode})`);
    } else {
      await api('PUT', `/factures/${id}/payer`, { methodePaiement: methode });
      toast('Paiement enregistré 💰');
    }
    closeModal('modal-paiement');
  } catch (e) {
    toast(e.message, e.status === 402 ? 'warning' : 'error');
  } finally {
    btn.disabled = false;
    loadFactures();
  }
}

async function loadMesFactures() {
  try {
    const res = await api('GET', '/factures');
    $('mes-factures-tbody').innerHTML = res.data.map(f => `
      <tr>
        <td><strong>${f.numero || '—'}</strong></td>
        <td>${fmtDate(f.createdAt)}</td>
        <td><strong>${fmt(f.montantTotal)}</strong> BIF</td>
        <td>${statusBadge(f.statut)}</td>
      </tr>`).join('') || `<tr><td colspan="4" class="text-muted" style="text-align:center;padding:20px">Aucune facture</td></tr>`;
  } catch (e) { toast(e.message, 'error'); }
}

/* ─────────────────────────────────────────
   NOTIFICATIONS
───────────────────────────────────────── */
async function loadNotifications() {
  try {
    const res = await api('GET', '/notifications');
    const badge = $('notif-count');
    if (res.nonLues > 0) {
      badge.textContent = res.nonLues;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }

    $('notif-list').innerHTML = res.data.length
      ? res.data.map(n => `
        <div class="notif-item ${n.lu ? '' : 'unread'}" onclick="markRead('${n._id}')">
          <div class="notif-item-title">${n.titre}</div>
          <div class="notif-item-msg">${n.message}</div>
          <div class="notif-item-time">${fmtDatetime(n.createdAt)}</div>
        </div>`).join('')
      : '<p class="text-muted" style="padding:16px">Aucune notification.</p>';
  } catch (e) { /* silent */ }
}

function toggleNotifPanel() {
  $('notif-panel').classList.toggle('open');
}

async function markRead(id) {
  try {
    await api('PUT', `/notifications/${id}/lire`);
    loadNotifications();
  } catch (e) { /* silent */ }
}

async function markAllRead() {
  try {
    await api('PUT', '/notifications/tout-lire');
    loadNotifications();
    toast('Toutes les notifications marquées comme lues');
  } catch (e) { /* silent */ }
}

// Close notif panel when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('#notif-panel') && !e.target.closest('.notif-btn')) {
    $('notif-panel').classList.remove('open');
  }
});

/* ─────────────────────────────────────────
   MODALS
───────────────────────────────────────── */
function openModal(id) { $(id).classList.add('open'); }
function closeModal(id) { $(id).classList.remove('open'); }

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

/* ─────────────────────────────────────────
   BOOT
───────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', () => {
  if (token && currentUser) {
    initApp();
  } else {
    $('auth-page').style.display = 'flex';
  }
});
