package com.soap.hotel.payment;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Legacy payment gateway (Project F): a SOAP server simulating a bank terminal.
 * WSDL: http://localhost:8080/ws/payment-gateway.wsdl
 */
@SpringBootApplication
public class LegacyPaymentGatewayApplication {

    public static void main(String[] args) {
        SpringApplication.run(LegacyPaymentGatewayApplication.class, args);
    }
}
