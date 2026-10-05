package com.soap.hotel.payment.service;

import com.soap.hotel.payment.model.PaymentTransaction;
import com.soap.hotel.payment.model.TransactionReceipt;
import com.soap.hotel.payment.repository.PaymentTransactionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

@Service
public class PaymentService {

    private final PaymentTransactionRepository transactionRepository;

    public PaymentService(PaymentTransactionRepository transactionRepository) {
        this.transactionRepository = transactionRepository;
    }

    @Transactional
    public PaymentResult processPayment(String reservationId, BigDecimal amount,
                                        String currency, String cardToken) {
        String status = "DECLINED".equalsIgnoreCase(cardToken) ? "DECLINED" : "SUCCESS";
        String reference = "TXN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        String authCode = "SUCCESS".equals(status)
                ? "AUTH-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase()
                : null;

        PaymentTransaction transaction = new PaymentTransaction(
                reference, amount, currency.toUpperCase(), status, authCode);
        String receiptXml = buildReceipt(reservationId, reference, amount, currency, status, authCode);
        TransactionReceipt receipt = new TransactionReceipt(transaction, receiptXml);
        transaction.setReceipt(receipt);
        PaymentTransaction saved = transactionRepository.save(transaction);

        return new PaymentResult(saved.getTransactionRef(), saved.getStatus(),
                saved.getAuthCode(), receiptXml);
    }

    private String buildReceipt(String reservationId, String reference, BigDecimal amount,
                                 String currency, String status, String authCode) {
        return "<receipt>"
                + "<reservationId>" + escape(reservationId) + "</reservationId>"
                + "<transactionId>" + reference + "</transactionId>"
                + "<amount>" + amount + "</amount>"
                + "<currency>" + escape(currency) + "</currency>"
                + "<status>" + status + "</status>"
                + (authCode == null ? "" : "<authorizationCode>" + authCode + "</authorizationCode>")
                + "</receipt>";
    }

    private String escape(String value) {
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                .replace("\"", "&quot;").replace("'", "&apos;");
    }

    public record PaymentResult(String transactionId, String status,
                                String authorizationCode, String receiptXmlData) { }
}
