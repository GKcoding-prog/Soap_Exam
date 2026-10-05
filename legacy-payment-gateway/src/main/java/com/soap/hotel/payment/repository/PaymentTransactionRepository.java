package com.soap.hotel.payment.repository;

import com.soap.hotel.payment.model.PaymentTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, Long> {
}
