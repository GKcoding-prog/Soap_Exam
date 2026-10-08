# Projet F — Gestion Hôtelière : Passerelle de Paiement SOAP

Projet d'examen **API SOAP : Intégration & Interopérabilité (SOAP / REST)** — UPG TIC/GL4 2025-2026, Groupe 6.

Lors du check-out d'un client, l'application hôtelière moderne (`hotel-app/` : Node.js / Express /
MongoDB, projet de l'examen JavaScript & NoSQL) envoie la facture à une passerelle de paiement bancaire « legacy » (Spring Boot / SQL / SOAP).
La passerelle enregistre la transaction et le reçu dans sa base SQL, puis renvoie le statut,
le numéro de transaction, le code d'autorisation et le reçu XML. Si le paiement réussit,
Node.js marque la `Facture` comme payée (avec le `transactionId`) et clôture la `Reservation` dans MongoDB.

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
 Frontend (bouton 💳 Payer) / Postman
        │  POST /api/factures/:id/payer-carte   { cardToken }   (JWT admin)
        ▼
┌──────────────────────────────┐        SOAP 1.1 / XML         ┌───────────────────────────────┐
│  hotel-app (Node.js)         │ ────────────────────────────▶ │ legacy-payment-gateway         │
│  Express + Mongoose          │  processPaymentAndGenerate-   │ Spring Boot + Spring-WS        │
│  client SOAP : lib "soap"    │  ReceiptRequest               │ @Endpoint / @PayloadRoot       │
│  port 5000                   │ ◀──────────────────────────── │ port 8080                      │
└──────────────┬───────────────┘   Response ou <soap:Fault>    └───────────────┬───────────────┘
               │                                                               │ Spring Data JPA
               ▼                                                               ▼
        MongoDB (port 27017)                                       H2 en mémoire (SQL)
        factures, reservations                                     payment_transaction,
                                                                   transaction_receipt
```

| Application | Rôle | Technologies |
|---|---|---|
| `legacy-payment-gateway` | Serveur SOAP (système legacy) | Java 25, Spring Boot 3.5, Spring-WS, Spring Data JPA, H2, jaxb2-maven-plugin |
| `hotel-app` | Application hôtelière existante (API REST + frontend), étendue en client SOAP | Node.js 18+, Express 4, Mongoose 7, librairie `soap` |

> `hotel-app/` est le projet de l'examen JavaScript & NoSQL (anciennement le dépôt `Hotel_JS_NoSQL`),
> importé ici avec tout son historique git.

---

## 2. Prérequis

| Outil | Version | Vérification |
|---|---|---|
| JDK | **25** | `java -version` |
| Maven | 3.9+ | `mvn -v` (la ligne « Java version » doit indiquer 25) |
| Node.js | **18+** (testé avec 24) | `node -v` |
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

Ports utilisés : **8080** (Spring Boot), **5000** (Node.js), **27017** (MongoDB).

---

## 3. Récupérer le projet

```bash
git clone https://github.com/GKcoding-prog/Soap_Exam.git
cd Soap_Exam
```

Les deux applications sont dans ce dépôt : `legacy-payment-gateway/` (Spring Boot) et `hotel-app/` (Node.js).

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

MongoDB doit tourner sur `mongodb://localhost:27017`.

- **Windows** (installé comme service) : il démarre automatiquement. Sinon : `net start MongoDB` (terminal administrateur).
- **Linux / macOS** : `sudo systemctl start mongod` ou `brew services start mongodb-community`.

La base `hotel_db` (variable `MONGO_URI`) est remplie par `npm run seed` (section 6).

---

## 6. Lancer l'API hôtelière (Node.js)

Dans un **deuxième terminal** :

```bash
cd hotel-app
npm install
cp .env.example .env        # Linux / macOS / Git Bash  (Windows : copy .env.example .env)
npm run seed                # chambres, services, admin@hotel.com / admin123, jean@example.com / client123
npm start
```

La console doit afficher `Serveur démarré sur le port 5000` et `MongoDB Connected`.
Le frontend est servi sur http://localhost:5000.

Variables de `.env` liées à la passerelle :

| Variable | Valeur par défaut | Rôle |
|---|---|---|
| `PAYMENT_GATEWAY_WSDL_URL` | `http://localhost:8080/ws/payment-gateway.wsdl` | WSDL chargé par `soap.createClientAsync` |
| `PAYMENT_GATEWAY_TIMEOUT_MS` | `10000` | Délai maximal d'attente de la passerelle |
| `PAYMENT_CURRENCY` | `BIF` | Devise des nouvelles factures (doit être acceptée par la passerelle) |

Fichiers ajoutés / modifiés dans `hotel-app` pour l'intégration SOAP :

| Fichier | Rôle |
|---|---|
| `services/paymentSoapClient.js` | Client SOAP : `createClientAsync`, appel asynchrone, mapping XML → JSON, classification des erreurs (`FAULT` / `UNAVAILABLE` / `TIMEOUT`) |
| `services/paiementSoapService.js` | Adaptateur : facture → requête SOAP → résultat confié à `factureService` (aucune règle métier) |
| `services/factureService.js` | Logique métier facture, partagée par le paiement manuel (`PUT /payer`, espèces ou virement uniquement) et le paiement par carte, qui passe obligatoirement par la passerelle SOAP |
| `models/Facture.js` | Nouveaux champs `devise`, `transactionId`, `codeAutorisation`, `recuXml`, `tentativesPaiement` |
| `models/Reservation.js` | Nouveau statut `cloturee` (séjour terminé **et** payé) |
| `controllers/factureController.js` | `payerFactureCarte` + traduction des erreurs passerelle en codes HTTP |
| `public/app.js` | Bouton « 💳 Payer » : choix carte (passerelle SOAP) / espèces / virement |

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

### Dossier 2 — REST : Hotel API (hotel-app)

Scénario complet : connexion → réservation → check-in → check-out (facture générée) → paiement par carte.
Les jetons JWT et les identifiants sont enregistrés automatiquement d'une requête à l'autre ; chaque requête
vérifie son code HTTP et a sa réponse réelle enregistrée dans *Examples*.
**Le plus simple : clic droit sur le dossier → *Run folder*** (Collection Runner). Lancer `npm run seed` avant.

| Requête | Attendu |
|---|---|
| Login admin / client, liste des chambres | 200, jetons et ids enregistrés |
| Créer une réservation (3 nuits, chambre 201), check-in, check-out | 201 / 200 / 200 — facture `en_attente`, devise `BIF` |
| Payer avec une carte refusée (`DECLINED`) | 402, facture toujours `en_attente`, tentative journalisée |
| Payer avec une carte valide | 200, facture `payee` + `transactionId`, réservation `cloturee` |
| Lire la facture / la réservation | 200, `transactionId` et `recuXml` sauvegardés dans MongoDB |
| Payer à nouveau | 400, facture déjà payée (la passerelle n'est pas appelée) |
| Long séjour (50 nuits en suite > 10 000 000 BIF), puis paiement | 422, `<soap:Fault>` `AMOUNT_LIMIT_EXCEEDED` relayé par Node.js |

### Dossier 3 — Scénario d'erreur : Spring Boot arrêté

1. Arrêter Spring Boot (Ctrl+C dans le premier terminal).
2. Exécuter le dossier 3 (il se connecte lui-même : login, chambres, séjour, paiement).
3. Attendu : **503** `PASSERELLE_INDISPONIBLE`, et la facture reste inchangée dans MongoDB.

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

# Paiement d'une facture via hotel-app (jeton admin obtenu par POST /api/auth/connexion)
curl -X POST http://localhost:5000/api/factures/FACTURE_ID/payer-carte \
  -H "Authorization: Bearer ADMIN_TOKEN" -H "Content-Type: application/json" \
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

Base : `http://localhost:5000/api` (`hotel-app`). Route ajoutée pour l'intégration (la liste complète
des routes est dans [`hotel-app/README.md`](hotel-app/README.md)) :

| Méthode | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/factures/:id/payer-carte` | Admin | **Valide la facture via la passerelle SOAP.** Corps : `{ "cardToken": "..." }` |

La facture est générée automatiquement au check-out (`PUT /reservations/:id/checkout`). Effet du paiement dans MongoDB :

- **SUCCESS** : `Facture` `payee`, `methodePaiement` `carte`, avec `transactionId`, `codeAutorisation`, `datePaiement`, `recuXml` ; `Reservation` `cloturee` ; notification `paiement_recu` au client.
- **DECLINED** : la tentative est ajoutée à `facture.tentativesPaiement` ; facture et réservation inchangées.
- **Erreur de la passerelle** : rien n'est modifié.

| Situation | Code HTTP | `type` |
|---|---|---|
| Paiement accepté | 200 | — |
| Carte refusée | 402 | — |
| `cardToken` manquant, facture déjà payée | 400 | — |
| Facture introuvable | 404 | — |
| `<soap:Fault>` Client (règle métier ou XSD) | 422 | `PAIEMENT_REJETE` (+ `code`) |
| `<soap:Fault>` Server | 502 | `ERREUR_PASSERELLE` |
| Spring Boot arrêté / injoignable | 503 | `PASSERELLE_INDISPONIBLE` |
| Spring Boot ne répond pas à temps | 504 | `PASSERELLE_TIMEOUT` |

---

## 11. Correspondance avec les critères d'évaluation

| Critère | Où le vérifier |
|---|---|
| **Qualité du contrat (WSDL/XSD)** | `payment-gateway.xsd` : types simples restreints (énumérations, motifs, `xs:decimal`, `xs:dateTime`), namespace qualifié, correspondance avec les tables documentée dans le XSD et en section 9, faute déclarée dans le WSDL. Validation des requêtes et réponses : `WebServiceConfig.addInterceptors`. |
| **Consommation & mapping (Node.js)** | `hotel-app/services/paymentSoapClient.js` : `soap.createClientAsync`, appel `processPaymentAndGenerateReceiptAsync` (async/await), conversion de la réponse en JSON typé (`Number`, `Date`) avant l'enregistrement. |
| **Intégration & réutilisation** | `hotel-app/services/paiementSoapService.js` est un adaptateur sans logique métier : il appelle `factureService` (facture payable, enregistrement du paiement, clôture de la réservation), le même service que le paiement manuel `PUT /factures/:id/payer`, sur les modèles Mongoose existants `Facture` et `Reservation`. |
| **Gestion des erreurs** | Spring : `PaymentGatewayException` + `PaymentFaultResolver` (fautes `Client`/`Server` avec `<detail>`). Node : `PaymentGatewayError` (FAULT / UNAVAILABLE / TIMEOUT) dans `paymentSoapClient.js`, traduit en codes HTTP dans `hotel-app/controllers/factureController.js`. Testé dans les dossiers Postman 2 (faute métier) et 3 (passerelle arrêtée). |

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
├── hotel-app/                              Système moderne (projet JavaScript & NoSQL, client SOAP)
│   ├── package.json, .env.example
│   ├── server.js, seed.js                  Serveur Express (port 5000), données de démonstration
│   ├── models/                             Mongoose : Facture, Reservation, Chambre, Service, User, Notification
│   ├── controllers/, routes/, middleware/  API REST (JWT)
│   ├── services/
│   │   ├── paymentSoapClient.js            Client SOAP + mapping XML → JSON + fautes
│   │   ├── paiementSoapService.js          Adaptateur SOAP ↔ services existants
│   │   └── factureService.js               Logique métier facture (paiement, clôture)
│   └── public/                             Frontend (bouton 💳 Payer)
└── postman/
    └── soap-payment.postman_collection.json  Requêtes SOAP + réponses XML, scénario REST
```

---

## 13. Dépannage

| Problème | Cause probable / solution |
|---|---|
| `release version 25 not supported` pendant `mvn` | `JAVA_HOME` ne pointe pas vers un JDK 25. Vérifier avec `mvn -v`. |
| `Port 8080 was already in use` | Un autre programme utilise le port : l'arrêter, ou lancer `mvn spring-boot:run -Dspring-boot.run.arguments=--server.port=8081` et adapter `PAYMENT_GATEWAY_WSDL_URL` (`.env`) et la variable Postman `gatewayUrl`. |
| `MongoDB Error` au démarrage de Node | Le service MongoDB n'est pas démarré (section 5). |
| `503 PASSERELLE_INDISPONIBLE` | Spring Boot n'est pas démarré ou n'écoute pas sur 8080 (comportement attendu dans le dossier Postman 3). |
| `422 UNSUPPORTED_CURRENCY` | La devise de la facture (`PAYMENT_CURRENCY`) n'est pas `BIF`, `EUR` ou `USD`. |
| Les données SQL ont disparu | Normal : la base H2 est en mémoire et vidée à chaque redémarrage de Spring Boot. |
