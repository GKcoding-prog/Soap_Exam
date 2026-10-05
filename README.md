# Hotel Management SOAP Integration

Project F — Group 6: Gestion hôtelière.

This repository contains the two applications required by the exam:

- `legacy-payment-gateway`: Spring Boot SOAP server backed by SQL/H2.
- `hotel-api`: Node.js client that will consume the SOAP service and update MongoDB.

## Planned flow

`hotel-api` sends `processPaymentAndGenerateReceipt` to the Spring Boot service. The
legacy service stores a payment transaction and receipt, then returns the payment
status, authorization code, and receipt XML.

The payment gateway is intentionally a simulation. A `cardToken` equal to
`DECLINED` produces a declined payment; other non-empty tokens produce success.

## Start the Spring Boot service

```bash
cd legacy-payment-gateway
mvn spring-boot:run
```

The WSDL will be available at:

`http://localhost:8080/ws/payment-gateway.wsdl`

