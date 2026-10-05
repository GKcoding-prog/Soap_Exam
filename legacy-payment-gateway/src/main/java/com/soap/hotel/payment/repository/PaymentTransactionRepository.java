package com.soap.hotel.payment.repository;

import com.soap.hotel.payment.model.PaymentTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

/** Spring Data JPA repository for payment_transaction (receipts are saved by cascade). */
public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, Long> {
}
