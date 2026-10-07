# Projet F — Gestion Hôtelière : Passerelle de Paiement SOAP

Projet d'examen **API SOAP : Intégration & Interopérabilité (SOAP / REST)** — UPG TIC/GL4 2025-2026, Groupe 6.

Lors du check-out d'un client, l'application hôtelière moderne (Node.js / Express / MongoDB)
envoie la facture à une passerelle de paiement bancaire « legacy » (Spring Boot / SQL / SOAP).
La passerelle enregistre la transaction et le reçu dans sa base SQL, puis renvoie le statut,
le numéro de transaction, le code d'autorisation et le reçu XML. Si le paiement réussit,
Node.js marque la facture comme payée (avec le `transactionId`) et clôture la réservation dans MongoDB.

---

## Sommaire

1. [Architecture](#1-architecture)
2. [Prérequis](#2-prérequis)
3. [Récupérer le projet](#3-récupérer-le-projet)
4. [Lancer la passerelle SOAP (Spring Boot)](#4-lancer-la-passerelle-soap-spring-boot)
5. [Lancer MongoDB](#5-lancer-mongodb)
6. [Lancer l'API hôtelière (Node.js)](#6-lancer-lapi-hôtelière-nodejs)
7. [Tester avec Postman (recommandé)](#7-tester-avec-postman-recommandé)
8. [Tester en ligne de commande (alternative)](#8-tester-en-ligne-de-commande-alternative)
9. [Contrat SOAP (WSDL / XSD)](#9-contrat-soap-wsdl--xsd)
10. [API REST Node.js](#10-api-rest-nodejs)
11. [Correspondance avec les critères d'évaluation](#11-correspondance-avec-les-critères-dévaluation)
12. [Structure du dépôt](#12-structure-du-dépôt)
13. [Dépannage](#13-dépannage)

---

## 1. Architecture

```
 Client REST (Postman)
        │  POST /api/invoices/:id/pay   { cardToken }
        ▼
┌──────────────────────────────┐        SOAP 1.1 / XML         ┌───────────────────────────────┐
│  hotel-api (Node.js)         │ ────────────────────────────▶ │ legacy-payment-gateway         │
│  Express + Mongoose          │  processPaymentAndGenerate-   │ Spring Boot + Spring-WS        │
│  client SOAP : lib "soap"    │  ReceiptRequest               │ @Endpoint / @PayloadRoot       │
│  port 3000                   │ ◀──────────────────────────── │ port 8080                      │
└──────────────┬───────────────┘   Response ou <soap:Fault>    └───────────────┬───────────────┘
               │                                                               │ Spring Data JPA
               ▼                                                               ▼
        MongoDB (port 27017)                                       H2 en mémoire (SQL)
        reservations, invoices                                     payment_transaction,
                                                                   transaction_receipt
```

| Application | Rôle | Technologies |
|---|---|---|
| `legacy-payment-gateway` | Serveur SOAP (système legacy) | Java 25, Spring Boot 3.5, Spring-WS, Spring Data JPA, H2, jaxb2-maven-plugin |
| `hotel-api` | Client SOAP + API REST (système moderne) | Node.js 22.9+, Express 5, Mongoose 8, librairie `soap` |

---

## 2. Prérequis

| Outil | Version | Vérification |
|---|---|---|
| JDK | **25** | `java -version` |
| Maven | 3.9+ | `mvn -v` (la ligne « Java version » doit indiquer 25) |
| Node.js | **22.9+** (testé avec 24) | `node -v` |
| MongoDB Community Server | 6+ (testé avec 9.0) | service démarré sur `localhost:27017` |
| Postman | toute version récente | pour importer la collection fournie |

> **Important :** Maven utilise le JDK désigné par la variable `JAVA_HOME`. Elle doit pointer vers un **JDK 25**,
> sinon la compilation échoue avec `release version 25 not supported`.

Installation rapide sous Windows (winget) si nécessaire :

```powershell
winget install Oracle.JDK.25
winget install MongoDB.Server
winget install OpenJS.NodeJS.LTS
```

Ports utilisés : **8080** (Spring Boot), **3000** (Node.js), **27017** (MongoDB).

---

## 3. Récupérer le projet

```bash
git clone https://github.com/GKcoding-prog/Soap_Exam.git
cd Soap_Exam
```

---

## 4. Lancer la passerelle SOAP (Spring Boot)

Dans un **premier terminal** :

```bash
cd legacy-payment-gateway
mvn spring-boot:run
```

Le premier lancement télécharge les dépendances Maven et génère les classes Java à partir du XSD
(`target/generated-sources/jaxb`). Le service est prêt quand la console affiche
`Started LegacyPaymentGatewayApplication`.

**Vérifications :**

| Quoi | URL |
|---|---|
| WSDL | http://localhost:8080/ws/payment-gateway.wsdl |
| Endpoint SOAP | `POST` http://localhost:8080/ws |
| Console de la base SQL (H2) | http://localhost:8080/h2-console |

Connexion à la console H2 : JDBC URL `jdbc:h2:mem:paymentdb`, utilisateur `sa`, mot de passe vide.
Les requêtes `SELECT * FROM PAYMENT_TRANSACTION;` et `SELECT * FROM TRANSACTION_RECEIPT;` montrent les
écritures effectuées par chaque appel SOAP.

> La base H2 est en mémoire (`create-drop`) : les tables sont recréées vides à chaque démarrage.

---

## 5. Lancer MongoDB

MongoDB doit tourner sur `mongodb://127.0.0.1:27017`.

- **Windows** (installé comme service) : il démarre automatiquement. Sinon : `net start MongoDB` (terminal administrateur).
- **Linux / macOS** : `sudo systemctl start mongod` ou `brew services start mongodb-community`.

La base `hotel_management` et ses collections sont créées automatiquement au premier enregistrement.

---

## 6. Lancer l'API hôtelière (Node.js)

Dans un **deuxième terminal** :

```bash
cd hotel-api
npm install
```

Créer le fichier de configuration `.env` à partir de l'exemple :

```bash
cp .env.example .env        # Linux / macOS / Git Bash
copy .env.example .env      # Windows (cmd / PowerShell)
```

Puis démarrer :

```bash
npm start
```

La console doit afficher :

```
Connected to MongoDB (hotel_management)
Hotel API listening on http://localhost:3000
```

Variables de `.env` :

| Variable | Valeur par défaut | Rôle |
|---|---|---|
| `PORT` | `3000` | Port de l'API REST |
| `PAYMENT_GATEWAY_WSDL_URL` | `http://localhost:8080/ws/payment-gateway.wsdl` | WSDL chargé par `soap.createClientAsync` |
| `PAYMENT_GATEWAY_TIMEOUT_MS` | `10000` | Délai maximal d'attente de la passerelle |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/hotel_management` | Connexion MongoDB |

> Si MongoDB n'est pas démarré, l'API s'arrête avec le message `Cannot connect to MongoDB`.

---

## 7. Tester avec Postman (recommandé)

Importer le fichier **`postman/soap-payment.postman_collection.json`** (Postman → *Import*).
La collection contient trois dossiers :

### Dossier 1 — SOAP : Legacy Payment Gateway (Spring Boot)

Appels SOAP directs à la passerelle. Chaque requête contient l'**enveloppe XML envoyée** et, dans
*Examples*, la **réponse XML complète** reçue du Spring Boot (livrable demandé).

| Requête | Résultat attendu |
|---|---|
| Get WSDL | Le WSDL généré |
| Payment - SUCCESS | `status` = `SUCCESS`, `transactionId`, `authorizationCode`, reçu XML |
| Payment - DECLINED (`cardToken` = `DECLINED`) | `status` = `DECLINED`, pas de code d'autorisation |
| Fault - XSD validation | `<soap:Fault>` `Client` listant les violations du XSD |
| Fault - UNSUPPORTED_CURRENCY | `<soap:Fault>` `Client` avec le code métier dans `<detail>` |
| Fault - AMOUNT_LIMIT_EXCEEDED | `<soap:Fault>` `Client` avec le code métier dans `<detail>` |

### Dossier 2 — REST : Hotel API (Node.js + MongoDB)

Scénario complet de check-out. Les identifiants (`reservationId`, `invoiceId`) sont enregistrés
automatiquement d'une requête à l'autre ; chaque requête vérifie son code HTTP.
**Le plus simple : clic droit sur le dossier → *Run folder*** (Collection Runner).

| # | Requête | Attendu |
|---|---|---|
| 1 | Créer une réservation (3 nuits × 85,50 USD) | 201, total 256,50 |
| 2 | Créer la facture | 201, statut `UNPAID` |
| 3 | Payer avec une carte refusée | 402, facture toujours `UNPAID`, tentative journalisée |
| 4 | Payer avec une carte valide | 200, facture `PAID` + `transactionId`, réservation `CHECKED_OUT` |
| 5 | Lire la facture | 200, `transactionId` sauvegardé dans MongoDB |
| 6 | Lire la réservation | 200, statut `CHECKED_OUT` |
| 7 | Payer à nouveau | 409, facture déjà payée |
| 8–10 | Réservation et facture en GBP, puis paiement | 422, `<soap:Fault>` `UNSUPPORTED_CURRENCY` relayé par Node.js |

### Dossier 3 — Scénario d'erreur : Spring Boot arrêté

1. Arrêter Spring Boot (Ctrl+C dans le premier terminal).
2. Exécuter le dossier 3.
3. Attendu : **503** `PAYMENT_GATEWAY_UNAVAILABLE`, et la facture reste inchangée dans MongoDB.

---

## 8. Tester en ligne de commande (alternative)

Exemple avec `curl` (Linux, macOS ou Git Bash sous Windows) :

```bash
# Appel SOAP direct
curl -X POST http://localhost:8080/ws -H "Content-Type: text/xml" -d '
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:pay="http://soap.hotel.com/payment">
  <soapenv:Body>
    <pay:processPaymentAndGenerateReceiptRequest>
      <pay:reservationId>RES-1001</pay:reservationId>
      <pay:amount>125.50</pay:amount>
      <pay:currency>USD</pay:currency>
      <pay:cardToken>TEST-CARD-OK</pay:cardToken>
    </pay:processPaymentAndGenerateReceiptRequest>
  </soapenv:Body>
</soapenv:Envelope>'

# Scénario REST : réservation -> facture -> paiement
curl -X POST http://localhost:3000/api/reservations -H "Content-Type: application/json" \
  -d '{"guestName":"Alice","roomNumber":"204","checkInDate":"2026-10-01","checkOutDate":"2026-10-04","nightlyRate":85.5,"currency":"USD"}'
# -> copier le "_id" renvoyé (RESERVATION_ID)

curl -X POST http://localhost:3000/api/reservations/RESERVATION_ID/invoice
# -> copier le "_id" renvoyé (INVOICE_ID)

curl -X POST http://localhost:3000/api/invoices/INVOICE_ID/pay -H "Content-Type: application/json" \
  -d '{"cardToken":"TEST-CARD-OK"}'
```

---

## 9. Contrat SOAP (WSDL / XSD)

- **XSD :** `legacy-payment-gateway/src/main/resources/payment-gateway.xsd`
- **Namespace :** `http://soap.hotel.com/payment` (`elementFormDefault="qualified"`)
- **WSDL :** généré par `DefaultWsdl11Definition` à partir du XSD, exposé à `/ws/payment-gateway.wsdl`
- **Classes Java :** générées depuis le XSD par `jaxb2-maven-plugin` (phase `generate-sources`)
- **Opération :** `processPaymentAndGenerateReceipt` (entrée, sortie et `wsdl:fault` déclarés dans le WSDL)

### Messages

| Message | Champs |
|---|---|
| `processPaymentAndGenerateReceiptRequest` | `reservationId`, `amount`, `currency`, `cardToken` |
| `processPaymentAndGenerateReceiptResponse` | `transactionId`, `status`, `authorizationCode` (si SUCCESS), `amount`, `currency`, `issueDate`, `receiptXmlData` |
| `processPaymentAndGenerateReceiptFault` | `code`, `message` (dans le `<detail>` de la `<soap:Fault>`) |

### Correspondance tables SQL → types XSD

| Colonne SQL | Type SQL | Type XSD |
|---|---|---|
| `payment_transaction.transaction_ref` | VARCHAR, unique | `TransactionRef` — motif `TXN-[A-Z0-9]{8}` |
| `payment_transaction.amount` | DECIMAL(19,2) | `Amount` — `xs:decimal`, > 0, 2 décimales max |
| `payment_transaction.currency` | VARCHAR(3) | `CurrencyCode` — motif `[A-Z]{3}` (ISO 4217) |
| `payment_transaction.status` | VARCHAR | `PaymentStatus` — énumération `SUCCESS` / `DECLINED` |
| `payment_transaction.auth_code` | VARCHAR (NULL si refusé) | `AuthorizationCode` — motif `AUTH-[A-Z0-9]{8}`, `minOccurs="0"` |
| `transaction_receipt.receipt_xml_data` | CLOB | `xs:string` (reçu XML indenté pour l'impression) |
| `transaction_receipt.issue_date` | TIMESTAMP | `xs:dateTime` |

> L'annexe de l'énoncé nomme la clé étrangère de `transaction_receipt` `ingredient_id` (copiée du projet E).
> Elle est ici nommée `payment_transaction_id` et référence `payment_transaction.id`.

### Règles de la passerelle simulée

- `cardToken` = `DECLINED` → paiement refusé (enregistré avec le statut `DECLINED`) ; toute autre valeur → `SUCCESS`.
- Devises acceptées : `BIF`, `EUR`, `USD`. Montant maximal : 10 000 000,00.
- Chaque appel valide **écrit** une ligne dans `payment_transaction` et une dans `transaction_receipt`.

### Erreurs (`<soap:Fault>`)

| Cas | `faultcode` | Contenu de `<detail>` |
|---|---|---|
| Requête non conforme au XSD (champ manquant, montant négatif, devise `usd`…) | `SOAP-ENV:Client` | Liste des erreurs de validation |
| Devise non supportée | `SOAP-ENV:Client` | `processPaymentAndGenerateReceiptFault`, code `UNSUPPORTED_CURRENCY` |
| Montant au-delà de la limite | `SOAP-ENV:Client` | `processPaymentAndGenerateReceiptFault`, code `AMOUNT_LIMIT_EXCEEDED` |
| Erreur interne inattendue | `SOAP-ENV:Server` | aucun (message générique, aucun détail technique exposé) |

---

## 10. API REST Node.js

Base : `http://localhost:3000/api`

| Méthode | Route | Description |
|---|---|---|
| `POST` | `/reservations` | Crée une réservation : `guestName`, `roomNumber`, `checkInDate`, `checkOutDate`, `nightlyRate`, `currency` (optionnel `guestEmail`). Total = nuits × tarif. |
| `GET` | `/reservations` | Liste les réservations |
| `GET` | `/reservations/:id` | Lit une réservation |
| `POST` | `/reservations/:id/invoice` | Émet la facture de la réservation (une seule par réservation) |
| `GET` | `/invoices/:id` | Lit une facture |
| `POST` | `/invoices/:id/pay` | **Valide la facture via la passerelle SOAP.** Corps : `{ "cardToken": "..." }` |

Effet de `POST /invoices/:id/pay` dans MongoDB :

- **SUCCESS** : facture `PAID` avec `transactionId`, `authorizationCode`, `paidAt`, `receiptXmlData` ; réservation `CHECKED_OUT`.
- **DECLINED** : la tentative est ajoutée à `invoice.paymentAttempts` ; facture et réservation inchangées.
- **Erreur de la passerelle** : rien n'est modifié.

| Situation | Code HTTP | `type` |
|---|---|---|
| Paiement accepté | 200 | — |
| Carte refusée | 402 | — |
| Données invalides | 400 | `VALIDATION_ERROR` |
| Réservation / facture introuvable | 404 | `NOT_FOUND` |
| Facture déjà payée, facture en double | 409 | `CONFLICT` |
| `<soap:Fault>` Client (règle métier ou XSD) | 422 | `PAYMENT_REJECTED` (+ `code`) |
| `<soap:Fault>` Server | 502 | `PAYMENT_GATEWAY_ERROR` |
| Spring Boot arrêté / injoignable | 503 | `PAYMENT_GATEWAY_UNAVAILABLE` |
| Spring Boot ne répond pas à temps | 504 | `PAYMENT_GATEWAY_TIMEOUT` |

---

## 11. Correspondance avec les critères d'évaluation

| Critère | Où le vérifier |
|---|---|
| **Qualité du contrat (WSDL/XSD)** | `payment-gateway.xsd` : types simples restreints (énumérations, motifs, `xs:decimal`, `xs:dateTime`), namespace qualifié, correspondance avec les tables documentée dans le XSD et en section 9, faute déclarée dans le WSDL. Validation des requêtes et réponses : `WebServiceConfig.addInterceptors`. |
| **Consommation & mapping (Node.js)** | `hotel-api/src/services/paymentSoapClient.js` : `soap.createClientAsync`, appel `processPaymentAndGenerateReceiptAsync` (async/await), conversion de la réponse en JSON typé (`Number`, `Date`) avant l'enregistrement. |
| **Intégration & réutilisation** | `paymentIntegrationService.js` est un adaptateur sans logique métier : il appelle `invoiceService` (facture payable, enregistrement du paiement) et `reservationService` (check-out), qui utilisent les modèles Mongoose `Invoice` et `Reservation`. |
| **Gestion des erreurs** | Spring : `PaymentGatewayException` + `PaymentFaultResolver` (fautes `Client`/`Server` avec `<detail>`). Node : `PaymentGatewayError` (FAULT / UNAVAILABLE / TIMEOUT) dans `paymentSoapClient.js`, traduit en codes HTTP dans `app.js`. Testé dans le dossier Postman 3. |

---

## 12. Structure du dépôt

```
Soap_Exam/
├── legacy-payment-gateway/                 Système legacy (serveur SOAP)
│   ├── pom.xml                             Dépendances + jaxb2-maven-plugin
│   └── src/main/
│       ├── resources/
│       │   ├── payment-gateway.xsd         Contrat SOAP
│       │   └── application.properties      H2, JPA, port 8080
│       └── java/com/soap/hotel/payment/
│           ├── LegacyPaymentGatewayApplication.java
│           ├── config/WebServiceConfig.java          Servlet SOAP, WSDL, validation XSD
│           ├── endpoint/PaymentEndpoint.java         @Endpoint / @PayloadRoot
│           ├── service/PaymentService.java           Règles de paiement, reçu, écriture SQL
│           ├── model/PaymentTransaction.java         Table payment_transaction
│           ├── model/TransactionReceipt.java         Table transaction_receipt
│           ├── repository/PaymentTransactionRepository.java   Spring Data JPA
│           └── exception/                            Fautes SOAP métier
├── hotel-api/                              Système moderne (client SOAP + API REST)
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── app.js                          Routes + middleware d'erreurs
│       ├── errors.js                       Erreurs applicatives (400/404/409)
│       ├── config/db.js                    Connexion Mongoose
│       ├── models/Reservation.js, Invoice.js
│       ├── routes/reservations.js, invoices.js
│       └── services/
│           ├── reservationService.js       Logique métier réservation
│           ├── invoiceService.js           Logique métier facture
│           ├── paymentSoapClient.js        Client SOAP + mapping XML → JSON + fautes
│           └── paymentIntegrationService.js  Adaptateur SOAP ↔ services existants
└── postman/
    └── soap-payment.postman_collection.json  Requêtes SOAP + réponses XML, scénario REST
```

---

## 13. Dépannage

| Problème | Cause probable / solution |
|---|---|
| `release version 25 not supported` pendant `mvn` | `JAVA_HOME` ne pointe pas vers un JDK 25. Vérifier avec `mvn -v`. |
| `Port 8080 was already in use` | Un autre programme utilise le port : l'arrêter, ou lancer `mvn spring-boot:run -Dspring-boot.run.arguments=--server.port=8081` et adapter `PAYMENT_GATEWAY_WSDL_URL` (`.env`) et la variable Postman `gatewayUrl`. |
| `Cannot connect to MongoDB` au démarrage de Node | Le service MongoDB n'est pas démarré (section 5). |
| `503 PAYMENT_GATEWAY_UNAVAILABLE` | Spring Boot n'est pas démarré ou n'écoute pas sur 8080 (comportement attendu dans le dossier Postman 3). |
| `node: bad option: --env-file-if-exists` | Version de Node.js trop ancienne : installer Node.js 22.9 ou plus récent. |
| Les données SQL ont disparu | Normal : la base H2 est en mémoire et vidée à chaque redémarrage de Spring Boot. |
