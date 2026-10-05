package com.soap.hotel.payment.exception;

import com.soap.hotel.payment.ws.PaymentErrorCode;

/**
 * Business error raised by the gateway when a payment request is well-formed
 * (it passed XSD validation) but violates a gateway rule.
 *
 * <p>{@link PaymentFaultResolver} turns it into a {@code <soap:Fault>} whose
 * {@code <detail>} carries the error code defined in the XSD.
 */
public class PaymentGatewayException extends RuntimeException {

    private final PaymentErrorCode code;

    public PaymentGatewayException(PaymentErrorCode code, String message) {
        super(message);
        this.code = code;
    }

    public PaymentErrorCode getCode() {
        return code;
    }
}
