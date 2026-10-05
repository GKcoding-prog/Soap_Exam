package com.soap.hotel.payment.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Column;
import java.time.Instant;

@Entity
@Table(name = "transaction_receipt")
public class TransactionReceipt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "payment_transaction_id", nullable = false, unique = true)
    private PaymentTransaction paymentTransaction;

    @Column(name = "receipt_xml_data", nullable = false, columnDefinition = "CLOB")
    private String receiptXmlData;

    @Column(name = "issue_date", nullable = false)
    private Instant issueDate;

    protected TransactionReceipt() { }

    public TransactionReceipt(PaymentTransaction paymentTransaction, String receiptXmlData) {
        this.paymentTransaction = paymentTransaction;
        this.receiptXmlData = receiptXmlData;
        this.issueDate = Instant.now();
    }
}
