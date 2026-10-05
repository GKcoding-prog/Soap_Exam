package com.soap.hotel.payment.config;

import com.soap.hotel.payment.exception.PaymentFaultResolver;
import org.springframework.boot.web.servlet.ServletRegistrationBean;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.ws.config.annotation.EnableWs;
import org.springframework.ws.config.annotation.WsConfigurer;
import org.springframework.ws.server.EndpointInterceptor;
import org.springframework.ws.soap.server.endpoint.interceptor.PayloadValidatingInterceptor;
import org.springframework.ws.transport.http.MessageDispatcherServlet;
import org.springframework.ws.wsdl.wsdl11.DefaultWsdl11Definition;
import org.springframework.xml.xsd.SimpleXsdSchema;
import org.springframework.xml.xsd.XsdSchema;

import java.util.List;

/**
 * Spring-WS configuration: SOAP servlet, WSDL exposure, XSD validation and
 * fault handling.
 */
@EnableWs
@Configuration
public class WebServiceConfig implements WsConfigurer {

    public static final String NAMESPACE = "http://soap.hotel.com/payment";

    /** Routes every request under /ws/* to Spring-WS. */
    @Bean
    public ServletRegistrationBean<MessageDispatcherServlet> messageDispatcherServlet(
            ApplicationContext applicationContext) {
        MessageDispatcherServlet servlet = new MessageDispatcherServlet();
        servlet.setApplicationContext(applicationContext);
        // Rewrites the soap:address in the WSDL to match the host actually used by the client.
        servlet.setTransformWsdlLocations(true);
        return new ServletRegistrationBean<>(servlet, "/ws/*");
    }

    /**
     * Publishes the WSDL at /ws/payment-gateway.wsdl (bean name + ".wsdl"),
     * generated from the XSD.
     */
    @Bean(name = "payment-gateway")
    public DefaultWsdl11Definition paymentGatewayWsdl(XsdSchema paymentGatewaySchema) {
        DefaultWsdl11Definition definition = new DefaultWsdl11Definition();
        definition.setPortTypeName("PaymentGatewayPort");
        definition.setServiceName("PaymentGatewayService");
        definition.setLocationUri("/ws");
        definition.setTargetNamespace(NAMESPACE);
        definition.setSchema(paymentGatewaySchema);
        return definition;
    }

    @Bean
    public XsdSchema paymentGatewaySchema() {
        return new SimpleXsdSchema(new ClassPathResource("payment-gateway.xsd"));
    }

    /** Maps exceptions to SOAP faults (see {@link PaymentFaultResolver}). */
    @Bean
    public PaymentFaultResolver paymentFaultResolver() {
        return new PaymentFaultResolver();
    }

    /**
     * Validates every request and response against the XSD. An invalid request
     * (missing field, negative amount, bad currency code...) is rejected with a
     * soap:Client fault before reaching the endpoint.
     */
    @Override
    public void addInterceptors(List<EndpointInterceptor> interceptors) {
        PayloadValidatingInterceptor validator = new PayloadValidatingInterceptor();
        validator.setXsdSchema(paymentGatewaySchema());
        validator.setValidateRequest(true);
        validator.setValidateResponse(true);
        interceptors.add(validator);
    }
}
