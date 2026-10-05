package com.soap.hotel.payment.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Lob;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * Table transaction_receipt: the printable receipt generated for a payment.
 *
 * <p>Note: the exam annex names the foreign key "ingredient_id" (copied from
 * project E); here it is payment_transaction_id, pointing to payment_transaction.id.
 */
@Entity
@Table(name = "transaction_receipt")
public class TransactionReceipt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "payment_transaction_id", nullable = false, unique = true)
    private PaymentTransaction paymentTransaction;

    /** TEXT/CLOB column holding the receipt XML. */
    @Lob
    @Column(name = "receipt_xml_data", nullable = false)
    private String receiptXmlData;

    /** TIMESTAMP column, exposed as xs:dateTime in the SOAP response. */
    @Column(name = "issue_date", nullable = false)
    private Instant issueDate;

    protected TransactionReceipt() { }

    public TransactionReceipt(PaymentTransaction paymentTransaction, String receiptXmlData, Instant issueDate) {
        this.paymentTransaction = paymentTransaction;
        this.receiptXmlData = receiptXmlData;
        this.issueDate = issueDate;
    }

    public Long getId() { return id; }
    public PaymentTransaction getPaymentTransaction() { return paymentTransaction; }
    public String getReceiptXmlData() { return receiptXmlData; }
    public Instant getIssueDate() { return issueDate; }
}
