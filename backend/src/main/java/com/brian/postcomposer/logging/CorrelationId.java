package com.brian.postcomposer.logging;

import org.slf4j.MDC;

public final class CorrelationId {
    public static final String HEADER = "X-Correlation-Id";
    public static final String MDC_KEY = "correlationId";

    private CorrelationId() {}

    /** The id of the request being served on this thread, or null outside a request. */
    public static String current() { return MDC.get(MDC_KEY); }
}
