package com.soap.hotel.payment.endpoint;

import com.soap.hotel.payment.service.PaymentService;
import com.soap.hotel.payment.ws.ProcessPaymentAndGenerateReceiptRequest;
import com.soap.hotel.payment.ws.ProcessPaymentAndGenerateReceiptResponse;
import org.springframework.ws.server.endpoint.annotation.Endpoint;
import org.springframework.ws.server.endpoint.annotation.PayloadRoot;
import org.springframework.ws.server.endpoint.annotation.RequestPayload;
import org.springframework.ws.server.endpoint.annotation.ResponsePayload;

@Endpoint
public class PaymentEndpoint {

    private static final String NAMESPACE = "http://soap.hotel.com/payment";
    private final PaymentService paymentService;

    public PaymentEndpoint(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PayloadRoot(namespace = NAMESPACE, localPart = "processPaymentAndGenerateReceiptRequest")
    @ResponsePayload
    public ProcessPaymentAndGenerateReceiptResponse processPayment(
            @RequestPayload ProcessPaymentAndGenerateReceiptRequest request) {
        PaymentService.PaymentResult result = paymentService.processPayment(
                request.getReservationId(), request.getAmount(),
                request.getCurrency(), request.getCardToken());

        ProcessPaymentAndGenerateReceiptResponse response = new ProcessPaymentAndGenerateReceiptResponse();
        response.setTransactionId(result.transactionId());
        response.setStatus(result.status());
        response.setAuthorizationCode(result.authorizationCode());
        response.setReceiptXmlData(result.receiptXmlData());
        return response;
    }
}
