package com.sse.exception;

public class ResourceLockedException extends RuntimeException {

    public ResourceLockedException(String message) {
        super(message);
    }
}
