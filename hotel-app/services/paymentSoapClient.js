const soap = require('soap');

const wsdlUrl = process.env.PAYMENT_GATEWAY_WSDL_URL
  || 'http://localhost:8080/ws/payment-gateway.wsdl';
const timeoutMs = Number(process.env.PAYMENT_GATEWAY_TIMEOUT_MS || 10000);

/** Network error codes meaning "the Spring Boot gateway cannot be reached". */
const UNAVAILABLE_CODES = new Set(['ECONNREFUSED', 'ENOTFOUND', 'EHOSTUNREACH', 'ECONNRESET', 'EAI_AGAIN']);
const TIMEOUT_CODES = new Set(['ECONNABORTED', 'ETIMEDOUT', 'ESOCKETTIMEDOUT']);

/**
 * Error raised by the SOAP client. `kind` tells the caller what went wrong:
 *  - FAULT:       the gateway answered with a <soap:Fault> (see faultCode / errorCode / details)
 *  - UNAVAILABLE: the gateway is down or unreachable (WSDL or call failed at network level)
 *  - TIMEOUT:     the gateway did not answer within PAYMENT_GATEWAY_TIMEOUT_MS
 */
class PaymentGatewayError extends Error {
  constructor(kind, message, extra = {}) {
    super(message, { cause: extra.cause });
    this.name = 'PaymentGatewayError';
    this.kind = kind;
    this.faultCode = extra.faultCode || null; // 'Client' (bad request) or 'Server' (gateway bug)
    this.errorCode = extra.errorCode || null; // business code from the fault detail, e.g. UNSUPPORTED_CURRENCY
    this.details = extra.details || [];       // XSD validation messages, if any
  }
}

let clientPromise;

/** Loads the WSDL once and reuses the client; a failed load is retried on the next call. */
async function getClient() {
  if (!clientPromise) {
    clientPromise = soap.createClientAsync(wsdlUrl, { wsdl_options: { timeout: timeoutMs } })
      .catch((error) => {
        clientPromise = undefined;
        throw toGatewayError(error, `Unable to load payment gateway WSDL (${wsdlUrl})`);
      });
  }
  return clientPromise;
}

/**
 * Calls processPaymentAndGenerateReceipt and maps the SOAP response (already
 * parsed from XML by the soap library) to a plain JSON object.
 */
async function processPaymentAndGenerateReceipt({ reservationId, amount, currency, cardToken }) {
  const client = await getClient();

  let response;
  try {
    [response] = await client.processPaymentAndGenerateReceiptAsync(
      { reservationId, amount, currency, cardToken },
      { timeout: timeoutMs }
    );
  } catch (error) {
    throw toGatewayError(error, 'Payment gateway call failed');
  }

  return {
    transactionId: response.transactionId,
    status: response.status, // 'SUCCESS' | 'DECLINED'
    authorizationCode: response.authorizationCode || null,
    amount: Number(response.amount),
    currency: response.currency,
    issueDate: new Date(response.issueDate),
    receiptXmlData: response.receiptXmlData
  };
}

/** Classifies any error from the soap library into a PaymentGatewayError. */
function toGatewayError(error, context) {
  if (error instanceof PaymentGatewayError) {
    return error;
  }

  const fault = error.root?.Envelope?.Body?.Fault;
  if (fault) {
    return fromSoapFault(fault, error);
  }

  const code = error.code || error.cause?.code;
  if (TIMEOUT_CODES.has(code) || /timeout/i.test(error.message)) {
    return new PaymentGatewayError('TIMEOUT', `${context}: no answer after ${timeoutMs} ms`, { cause: error });
  }
  if (UNAVAILABLE_CODES.has(code) || error.response === undefined) {
    return new PaymentGatewayError('UNAVAILABLE', `${context}: gateway unreachable (${code || error.message})`, { cause: error });
  }
  return new PaymentGatewayError('UNAVAILABLE', `${context}: HTTP ${error.response.status}`, { cause: error });
}

/**
 * Reads a SOAP 1.1 fault, e.g.
 *   <faultcode>SOAP-ENV:Client</faultcode>
 *   <faultstring>Currency GBP is not supported...</faultstring>
 *   <detail><processPaymentAndGenerateReceiptFault><code>UNSUPPORTED_CURRENCY</code>...</detail>
 * or, for XSD validation errors, a list of <spring-ws:ValidationError> in the detail.
 */
function fromSoapFault(fault, cause) {
  const faultCode = String(fault.faultcode || '').split(':').pop() || 'Server';
  const message = typeof fault.faultstring === 'object' ? fault.faultstring.$value : fault.faultstring;
  const detail = fault.detail || {};

  const businessFault = detail.processPaymentAndGenerateReceiptFault;
  const validationErrors = [].concat(detail.ValidationError || [])
    .map((item) => (typeof item === 'object' ? item.$value : item));

  return new PaymentGatewayError('FAULT', message || 'SOAP fault', {
    cause,
    faultCode,
    errorCode: businessFault?.code || (validationErrors.length ? 'VALIDATION_ERROR' : null),
    details: validationErrors
  });
}

module.exports = { processPaymentAndGenerateReceipt, PaymentGatewayError };
