# 🏨 Hotel Management API

REST API complète — Node.js + Express + MongoDB

---

## ⚙️ Installation

```bash
npm install
cp .env.example .env   # Remplir MONGO_URI et JWT_SECRET
npm run seed           # Données de test
npm run dev            # Démarrer en mode développement
```

---

## 🔐 Authentification

Toutes les routes protégées nécessitent un header :
```
Authorization: Bearer <token>
```

| Route | Méthode | Description |
|-------|---------|-------------|
| `/api/auth/inscription` | POST | Créer un compte client |
| `/api/auth/connexion` | POST | Se connecter |
| `/api/auth/moi` | GET | Profil connecté |
| `/api/auth/moi` | PUT | Modifier son profil |

**Body connexion :**
```json
{ "email": "admin@hotel.com", "motDePasse": "admin123" }
```

---

## 🛏️ Chambres

| Route | Méthode | Auth | Description |
|-------|---------|------|-------------|
| `/api/chambres` | GET | Public | Lister toutes les chambres |
| `/api/chambres/disponibles?dateArrivee=&dateDepart=` | GET | Public | Chambres dispo sur une période |
| `/api/chambres/:id` | GET | Public | Détail d'une chambre |
| `/api/chambres` | POST | Admin | Créer une chambre |
| `/api/chambres/:id` | PUT | Admin | Modifier une chambre |
| `/api/chambres/:id` | DELETE | Admin | Supprimer une chambre |

**Types :** `simple` | `double` | `suite` | `familiale`

---

## 📅 Réservations

| Route | Méthode | Auth | Description |
|-------|---------|------|-------------|
| `/api/reservations` | POST | Client/Admin | Créer une réservation |
| `/api/reservations` | GET | Client/Admin | Lister les réservations |
| `/api/reservations/:id` | GET | Client/Admin | Détail d'une réservation |
| `/api/reservations/:id/checkin` | PUT | Admin | Check-in |
| `/api/reservations/:id/checkout` | PUT | Admin | Check-out + génération facture |
| `/api/reservations/:id/services` | POST | Client/Admin | Ajouter un service au séjour |
| `/api/reservations/:id/evaluation` | POST | Client | Évaluer le séjour (1-5 étoiles) |
| `/api/reservations/:id/annuler` | PUT | Client/Admin | Annuler |

**Statuts :** `en_attente` → `confirmee` → `en_cours` → `terminee` | `annulee`

**Body création :**
```json
{
  "chambreId": "...",
  "dateArrivee": "2024-12-20",
  "dateDepart": "2024-12-25",
  "nombrePersonnes": 2
}
```

---

## 🍽️ Services

| Route | Méthode | Auth | Description |
|-------|---------|------|-------------|
| `/api/services` | GET | Connecté | Lister les services |
| `/api/services/:id` | GET | Connecté | Détail |
| `/api/services` | POST | Admin | Créer |
| `/api/services/:id` | PUT | Admin | Modifier |
| `/api/services/:id` | DELETE | Admin | Supprimer |

**Catégories :** `restauration` | `spa` | `transport` | `blanchisserie` | `autre`

---

## 🧾 Factures

| Route | Méthode | Auth | Description |
|-------|---------|------|-------------|
| `/api/factures` | GET | Client/Admin | Lister les factures |
| `/api/factures/stats` | GET | Admin | Statistiques revenus |
| `/api/factures/:id` | GET | Client/Admin | Détail facture |
| `/api/factures/:id/payer` | PUT | Admin | Enregistrer un paiement manuel (espèces, virement) |
| `/api/factures/:id/payer-carte` | POST | Admin | Payer par carte via la passerelle bancaire SOAP — corps `{ "cardToken": "..." }` |

> Les factures sont **générées automatiquement** lors du checkout.
> Elles incluent la TVA (18%) et le numéro auto-incrémenté `FACT-YYYY-XXXX`.
> Une fois la facture payée, la réservation passe au statut `cloturee`.

### 💳 Paiement par carte (passerelle SOAP)

Le paiement par carte est délégué à la passerelle bancaire legacy (Spring Boot / SOAP) du dépôt
[Soap_Exam](https://github.com/GKcoding-prog/Soap_Exam), qui doit tourner sur le port 8080.
Si le paiement est accepté, la facture enregistre le `transactionId`, le code d'autorisation et le reçu XML.

| Réponse | Signification |
|---------|---------------|
| 200 | Paiement accepté — facture `payee`, réservation `cloturee` |
| 402 | Carte refusée (`cardToken` = `DECLINED`) — tentative enregistrée |
| 422 | `<soap:Fault>` de la passerelle (devise non supportée, montant trop élevé…) |
| 503 / 504 | Passerelle arrêtée ou trop lente — facture inchangée |

Variables `.env` : `PAYMENT_GATEWAY_WSDL_URL`, `PAYMENT_GATEWAY_TIMEOUT_MS`, `PAYMENT_CURRENCY` (voir `.env.example`).

---

## 👥 Clients (Admin)

| Route | Méthode | Auth | Description |
|-------|---------|------|-------------|
| `/api/clients` | GET | Admin | Lister les clients |
| `/api/clients/:id` | GET | Admin | Détail client |
| `/api/clients/:id/historique` | GET | Admin/Owner | Historique des séjours |
| `/api/clients/:id` | PUT | Admin | Modifier un client |

---

## 📁 Structure du projet

```
hotel-api/
├── config/
│   └── db.js               # Connexion MongoDB
├── controllers/
│   ├── authController.js
│   ├── chambreController.js
│   ├── reservationController.js
│   ├── serviceController.js
│   ├── factureController.js
│   └── clientController.js
├── middleware/
│   └── auth.js             # JWT + rôles
├── models/
│   ├── User.js
│   ├── Chambre.js
│   ├── Service.js
│   ├── Reservation.js
│   └── Facture.js
├── routes/
│   └── index.js
├── seed.js                 # Données de test
├── server.js
└── .env.example
```

---

## 🔒 Rôles

| Action | Client | Admin |
|--------|--------|-------|
| Créer une réservation | ✅ | ✅ |
| Voir ses réservations | ✅ | ✅ (toutes) |
| Annuler sa réservation | ✅ | ✅ |
| Check-in / Check-out | ❌ | ✅ |
| Gérer les chambres | ❌ | ✅ |
| Gérer les services | ❌ | ✅ |
| Voir ses factures | ✅ | ✅ (toutes) |
| Enregistrer paiement | ❌ | ✅ |
| Évaluer un séjour | ✅ | ❌ |

---

## ➕ Créer un compte depuis la ligne de commande

Un petit utilitaire `create_user.js` permet de créer un utilisateur sans lancer le frontend :

```bash
# Création d'un admin
npm run create-user -- --email admin2@hotel.com --password admin123 --role admin --nom Admin --prenom Hotel

# Création d'un client
npm run create-user -- --email user1@hotel.com --password userpass --role client --nom Dupont --prenom Jean
```

Le script lit `MONGO_URI` depuis `.env` si présent, ou utilise `mongodb://localhost:27017/hotel` par défaut.

