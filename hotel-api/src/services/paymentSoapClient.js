const soap = require('soap');

const wsdlUrl = process.env.PAYMENT_GATEWAY_WSDL_URL
  || 'http://localhost:8080/ws/payment-gateway.wsdl';

let clientPromise;

async function getClient() {
  if (!clientPromise) {
    clientPromise = soap.createClientAsync(wsdlUrl).catch((error) => {
      clientPromise = undefined;
      throw new Error(`Unable to load payment SOAP WSDL: ${error.message}`);
    });
  }
  return clientPromise;
}

async function processPaymentAndGenerateReceipt(payment) {
  const client = await getClient();
  const [response] = await client.processPaymentAndGenerateReceiptAsync({
    reservationId: payment.reservationId,
    amount: payment.amount,
    currency: payment.currency,
    cardToken: payment.cardToken
  });

  return {
    transactionId: response.transactionId,
    status: response.status,
    authorizationCode: response.authorizationCode || null,
    receiptXmlData: response.receiptXmlData
  };
}

module.exports = { processPaymentAndGenerateReceipt };
