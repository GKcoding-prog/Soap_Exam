package com.soap.hotel.payment.exception;

import com.soap.hotel.payment.ws.ProcessPaymentAndGenerateReceiptFault;
import jakarta.xml.bind.JAXBContext;
import jakarta.xml.bind.JAXBException;
import org.springframework.ws.soap.SoapFault;
import org.springframework.ws.soap.SoapFaultDetail;
import org.springframework.ws.soap.server.endpoint.SoapFaultDefinition;
import org.springframework.ws.soap.server.endpoint.SoapFaultMappingExceptionResolver;

import java.util.Properties;

/**
 * Converts exceptions thrown by the endpoint into SOAP faults.
 *
 * <ul>
 *   <li>{@link PaymentGatewayException}: {@code soap:Client} fault, with a
 *       {@code <processPaymentAndGenerateReceiptFault>} element (code + message)
 *       in the fault detail, as declared in the WSDL.</li>
 *   <li>Any other exception: generic {@code soap:Server} fault, so internal
 *       details (stack traces, SQL errors) never leak to the client.</li>
 * </ul>
 */
public class PaymentFaultResolver extends SoapFaultMappingExceptionResolver {

    private final JAXBContext faultContext;

    public PaymentFaultResolver() {
        try {
            this.faultContext = JAXBContext.newInstance(ProcessPaymentAndGenerateReceiptFault.class);
        } catch (JAXBException e) {
            throw new IllegalStateException("Cannot initialise JAXB context for SOAP faults", e);
        }

        Properties mappings = new Properties();
        mappings.setProperty(PaymentGatewayException.class.getName(), SoapFaultDefinition.CLIENT.toString());
        setExceptionMappings(mappings);

        SoapFaultDefinition defaultFault = new SoapFaultDefinition();
        defaultFault.setFaultCode(SoapFaultDefinition.SERVER);
        defaultFault.setFaultStringOrReason("Internal payment gateway error");
        setDefaultFault(defaultFault);

        // Run before Spring-WS's built-in resolvers.
        setOrder(1);
    }

    @Override
    protected void customizeFault(Object endpoint, Exception ex, SoapFault fault) {
        if (!(ex instanceof PaymentGatewayException paymentException)) {
            return;
        }
        ProcessPaymentAndGenerateReceiptFault detailBody = new ProcessPaymentAndGenerateReceiptFault();
        detailBody.setCode(paymentException.getCode());
        detailBody.setMessage(paymentException.getMessage());

        SoapFaultDetail detail = fault.addFaultDetail();
        try {
            faultContext.createMarshaller().marshal(detailBody, detail.getResult());
        } catch (JAXBException e) {
            throw new IllegalStateException("Cannot write SOAP fault detail", e);
        }
    }
}
