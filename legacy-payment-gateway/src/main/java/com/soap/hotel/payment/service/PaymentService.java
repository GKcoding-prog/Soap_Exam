package com.soap.hotel.payment.service;

import com.soap.hotel.payment.exception.PaymentGatewayException;
import com.soap.hotel.payment.model.PaymentTransaction;
import com.soap.hotel.payment.model.TransactionReceipt;
import com.soap.hotel.payment.repository.PaymentTransactionRepository;
import com.soap.hotel.payment.ws.PaymentErrorCode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

/**
 * Simulated bank terminal.
 *
 * <p>Each call writes one row in payment_transaction and one in
 * transaction_receipt (SUCCESS and DECLINED payments are both recorded), then
 * returns the stored data. This shows SOAP used for a write operation.
 */
@Service
public class PaymentService {

    /** Currencies accepted by the simulated terminal. */
    static final List<String> SUPPORTED_CURRENCIES = List.of("BIF", "EUR", "USD");

    /** Maximum amount for a single payment. */
    static final BigDecimal MAX_AMOUNT = new BigDecimal("10000000.00");

    /** Card token that the simulator always declines. */
    static final String DECLINED_TOKEN = "DECLINED";

    private final PaymentTransactionRepository transactionRepository;

    public PaymentService(PaymentTransactionRepository transactionRepository) {
        this.transactionRepository = transactionRepository;
    }

    /**
     * Authorises (or declines) a payment and stores the transaction with its receipt.
     *
     * @throws PaymentGatewayException if the currency is not supported or the
     *                                 amount exceeds the terminal limit
     */
    @Transactional
    public PaymentResult processPayment(String reservationId, BigDecimal amount,
                                        String currency, String cardToken) {
        validate(amount, currency);

        BigDecimal normalizedAmount = amount.setScale(2, RoundingMode.UNNECESSARY);
        String status = DECLINED_TOKEN.equalsIgnoreCase(cardToken) ? "DECLINED" : "SUCCESS";
        String reference = "TXN-" + randomCode();
        String authCode = "SUCCESS".equals(status) ? "AUTH-" + randomCode() : null;
        Instant issueDate = Instant.now().truncatedTo(ChronoUnit.SECONDS);

        String receiptXml = buildReceipt(reservationId, reference, normalizedAmount,
                currency, status, authCode, issueDate);

        PaymentTransaction transaction = new PaymentTransaction(
                reference, normalizedAmount, currency, status, authCode);
        transaction.setReceipt(new TransactionReceipt(transaction, receiptXml, issueDate));
        PaymentTransaction saved = transactionRepository.save(transaction);

        return new PaymentResult(saved.getTransactionRef(), saved.getStatus(), saved.getAuthCode(),
                saved.getAmount(), saved.getCurrency(), issueDate, receiptXml);
    }

    /**
     * Business rules that the XSD cannot express. Format checks (positive amount,
     * 3-letter currency, required fields) are already done by XSD validation.
     */
    private void validate(BigDecimal amount, String currency) {
        if (!SUPPORTED_CURRENCIES.contains(currency)) {
            throw new PaymentGatewayException(PaymentErrorCode.UNSUPPORTED_CURRENCY,
                    "Currency " + currency + " is not supported. Supported: " + SUPPORTED_CURRENCIES);
        }
        if (amount.compareTo(MAX_AMOUNT) > 0) {
            throw new PaymentGatewayException(PaymentErrorCode.AMOUNT_LIMIT_EXCEEDED,
                    "Amount " + amount + " exceeds the terminal limit of " + MAX_AMOUNT);
        }
    }

    /** Builds the indented receipt document, ready to print. */
    private String buildReceipt(String reservationId, String reference, BigDecimal amount,
                                String currency, String status, String authCode, Instant issueDate) {
        StringBuilder xml = new StringBuilder()
                .append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n")
                .append("<receipt>\n")
                .append("  <merchant>Hotel Management - Legacy Payment Gateway</merchant>\n")
                .append("  <reservationId>").append(escape(reservationId)).append("</reservationId>\n")
                .append("  <transactionId>").append(reference).append("</transactionId>\n")
                .append("  <issueDate>").append(issueDate).append("</issueDate>\n")
                .append("  <amount currency=\"").append(currency).append("\">")
                .append(amount.toPlainString()).append("</amount>\n")
                .append("  <status>").append(status).append("</status>\n");
        if (authCode != null) {
            xml.append("  <authorizationCode>").append(authCode).append("</authorizationCode>\n");
        }
        return xml.append("</receipt>").toString();
    }

    /** 8 uppercase alphanumeric characters, matching the XSD patterns. */
    private static String randomCode() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
    }

    private static String escape(String value) {
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                .replace("\"", "&quot;").replace("'", "&apos;");
    }

    /** Data returned to the endpoint after the transaction is stored. */
    public record PaymentResult(String transactionId, String status, String authorizationCode,
                                BigDecimal amount, String currency, Instant issueDate,
                                String receiptXmlData) { }
}
