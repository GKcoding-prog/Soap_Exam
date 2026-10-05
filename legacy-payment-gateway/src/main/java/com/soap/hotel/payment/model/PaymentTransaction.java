package com.soap.hotel.payment.model;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

import java.math.BigDecimal;

/**
 * Table payment_transaction: one row per payment attempt (SUCCESS or DECLINED).
 */
@Entity
@Table(name = "payment_transaction")
public class PaymentTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Public transaction reference returned to clients as transactionId (TXN-XXXXXXXX). */
    @Column(name = "transaction_ref", nullable = false, unique = true)
    private String transactionRef;

    /** DECIMAL(19,2), exposed as xs:decimal. */
    @Column(name = "amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;

    /** ISO 4217 code, e.g. USD. */
    @Column(name = "currency", nullable = false, length = 3)
    private String currency;

    /** SUCCESS or DECLINED. */
    @Column(name = "status", nullable = false)
    private String status;

    /** Bank authorisation code, NULL when the payment is declined. */
    @Column(name = "auth_code")
    private String authCode;

    /** The receipt is saved together with the transaction (cascade). */
    @OneToOne(mappedBy = "paymentTransaction", cascade = CascadeType.ALL)
    private TransactionReceipt receipt;

    protected PaymentTransaction() { }

    public PaymentTransaction(String transactionRef, BigDecimal amount, String currency,
                              String status, String authCode) {
        this.transactionRef = transactionRef;
        this.amount = amount;
        this.currency = currency;
        this.status = status;
        this.authCode = authCode;
    }

    public Long getId() { return id; }
    public String getTransactionRef() { return transactionRef; }
    public BigDecimal getAmount() { return amount; }
    public String getCurrency() { return currency; }
    public String getStatus() { return status; }
    public String getAuthCode() { return authCode; }
    public TransactionReceipt getReceipt() { return receipt; }
    public void setReceipt(TransactionReceipt receipt) { this.receipt = receipt; }
}
