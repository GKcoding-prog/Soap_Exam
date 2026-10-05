package com.soap.hotel.payment.model;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Column;
import java.math.BigDecimal;

@Entity
@Table(name = "payment_transaction")
public class PaymentTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "transaction_ref", nullable = false, unique = true)
    private String transactionRef;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 3)
    private String currency;

    @Column(nullable = false)
    private String status;

    private String authCode;

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
    public void setReceipt(TransactionReceipt receipt) { this.receipt = receipt; }
}
