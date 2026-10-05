# Hotel Management SOAP Integration

Project F — Group 6: Gestion hôtelière.

This repository contains the two applications required by the exam:

- `legacy-payment-gateway`: Spring Boot SOAP server backed by SQL/H2.
- `hotel-api`: Node.js client that will consume the SOAP service and update MongoDB.

## Flow

`hotel-api` sends `processPaymentAndGenerateReceipt` to the Spring Boot service. The
legacy service stores a payment transaction and receipt, then returns the payment
status, authorization code, amount, currency, issue date and receipt XML.

The payment gateway is intentionally a simulation. A `cardToken` equal to
`DECLINED` produces a declined payment; other non-empty tokens produce success.

## Start the Spring Boot service

Requires JDK 25.

```bash
cd legacy-payment-gateway
mvn spring-boot:run
```

The WSDL will be available at:

`http://localhost:8080/ws/payment-gateway.wsdl`

## SOAP contract

Defined in `legacy-payment-gateway/src/main/resources/payment-gateway.xsd`
(namespace `http://soap.hotel.com/payment`). Java classes are generated from it by
`jaxb2-maven-plugin`.

| SQL column | XSD type |
|---|---|
| `payment_transaction.transaction_ref` | `TransactionRef` (pattern `TXN-[A-Z0-9]{8}`) |
| `payment_transaction.amount` DECIMAL(19,2) | `Amount` (`xs:decimal`, > 0, 2 decimals) |
| `payment_transaction.currency` VARCHAR(3) | `CurrencyCode` (pattern `[A-Z]{3}`) |
| `payment_transaction.status` | `PaymentStatus` (enum `SUCCESS`, `DECLINED`) |
| `payment_transaction.auth_code` | `AuthorizationCode` (optional) |
| `transaction_receipt.issue_date` TIMESTAMP | `xs:dateTime` |
| `transaction_receipt.receipt_xml_data` CLOB | `xs:string` |

### Errors (`<soap:Fault>`)

| Case | Fault code | Detail |
|---|---|---|
| Request does not match the XSD (missing field, negative amount, `usd`...) | `soap:Client` | Spring-WS `ValidationError` list |
| Currency other than BIF, EUR, USD | `soap:Client` | `processPaymentAndGenerateReceiptFault` with code `UNSUPPORTED_CURRENCY` |
| Amount above 10,000,000.00 | `soap:Client` | `processPaymentAndGenerateReceiptFault` with code `AMOUNT_LIMIT_EXCEEDED` |
| Unexpected internal error | `soap:Server` | none (generic message, no internals leaked) |

## Start the Node.js API

Requires Node.js 22.9+.

```bash
cd hotel-api
npm install
cp .env.example .env
npm start
```

`POST http://localhost:3000/api/payments`

```json
{ "reservationId": "RES-1001", "amount": 125.5, "currency": "USD", "cardToken": "TEST-CARD-OK" }
```

| Result | HTTP |
|---|---|
| Payment SUCCESS | 200 |
| Payment DECLINED | 402 |
| Invalid input (checked in Node) | 400 |
| `soap:Client` fault (rejected by the gateway) | 422 |
| `soap:Server` fault | 502 |
| Spring Boot stopped / unreachable | 503 |
| Spring Boot does not answer in time (`PAYMENT_GATEWAY_TIMEOUT_MS`) | 504 |

## Postman

Import `postman/soap-payment.postman_collection.json`. It contains the WSDL request
and SOAP requests for SUCCESS, DECLINED and each fault, each with the full XML
response received from the service saved as an example.
