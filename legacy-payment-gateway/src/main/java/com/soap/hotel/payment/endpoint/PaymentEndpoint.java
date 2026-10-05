package com.soap.hotel.payment.endpoint;

import com.soap.hotel.payment.config.WebServiceConfig;
import com.soap.hotel.payment.service.PaymentService;
import com.soap.hotel.payment.ws.PaymentStatus;
import com.soap.hotel.payment.ws.ProcessPaymentAndGenerateReceiptRequest;
import com.soap.hotel.payment.ws.ProcessPaymentAndGenerateReceiptResponse;
import org.springframework.ws.server.endpoint.annotation.Endpoint;
import org.springframework.ws.server.endpoint.annotation.PayloadRoot;
import org.springframework.ws.server.endpoint.annotation.RequestPayload;
import org.springframework.ws.server.endpoint.annotation.ResponsePayload;

import javax.xml.datatype.DatatypeConfigurationException;
import javax.xml.datatype.DatatypeFactory;
import javax.xml.datatype.XMLGregorianCalendar;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.GregorianCalendar;

/**
 * SOAP endpoint for the operation processPaymentAndGenerateReceipt.
 *
 * <p>It only translates between the JAXB classes generated from the XSD and
 * {@link PaymentService}; all business rules live in the service.
 */
@Endpoint
public class PaymentEndpoint {

    private final PaymentService paymentService;
    private final DatatypeFactory datatypeFactory;

    public PaymentEndpoint(PaymentService paymentService) throws DatatypeConfigurationException {
        this.paymentService = paymentService;
        this.datatypeFactory = DatatypeFactory.newInstance();
    }

    @PayloadRoot(namespace = WebServiceConfig.NAMESPACE, localPart = "processPaymentAndGenerateReceiptRequest")
    @ResponsePayload
    public ProcessPaymentAndGenerateReceiptResponse processPayment(
            @RequestPayload ProcessPaymentAndGenerateReceiptRequest request) {
        PaymentService.PaymentResult result = paymentService.processPayment(
                request.getReservationId(), request.getAmount(),
                request.getCurrency(), request.getCardToken());

        ProcessPaymentAndGenerateReceiptResponse response = new ProcessPaymentAndGenerateReceiptResponse();
        response.setTransactionId(result.transactionId());
        response.setStatus(PaymentStatus.fromValue(result.status()));
        response.setAuthorizationCode(result.authorizationCode());
        response.setAmount(result.amount());
        response.setCurrency(result.currency());
        response.setIssueDate(toXmlDateTime(result.issueDate()));
        response.setReceiptXmlData(result.receiptXmlData());
        return response;
    }

    /** java.time.Instant (SQL TIMESTAMP) -> xs:dateTime, expressed in UTC. */
    private XMLGregorianCalendar toXmlDateTime(Instant instant) {
        return datatypeFactory.newXMLGregorianCalendar(
                GregorianCalendar.from(instant.atZone(ZoneOffset.UTC)));
    }
}
