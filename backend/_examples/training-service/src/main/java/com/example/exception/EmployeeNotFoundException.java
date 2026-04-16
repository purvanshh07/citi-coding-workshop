// src/main/java/com/example/exception/EmployeeNotFoundException.java
package com.example.exception;

/**
 * Thrown when the Identity Service (Port 8081) returns 404
 * for a given employeeId, signaling the employee does not exist.
 */
public class EmployeeNotFoundException extends RuntimeException {

    private final Long employeeId;

    public EmployeeNotFoundException(Long employeeId) {
        super("Employee not found with ID: " + employeeId);
        this.employeeId = employeeId;
    }

    public Long getEmployeeId() {
        return employeeId;
    }
}