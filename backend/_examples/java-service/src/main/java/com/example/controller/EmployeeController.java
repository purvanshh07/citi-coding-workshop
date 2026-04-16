package com.example.controller;

import com.example.dto.EmployeeRequestDTO;
import com.example.dto.EmployeeResponseDTO;
import com.example.dto.LoginRequest; // Make sure you created this DTO!
import com.example.model.Employee;    // Import your Entity
import com.example.repository.EmployeeRepository; // Import your Repo
import com.example.service.EmployeeService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/employees")
@CrossOrigin(origins = "*")
public class EmployeeController {

    private final EmployeeService employeeService;
    private final EmployeeRepository employeeRepository; // ADD THIS

    // Update Constructor to include Repository
    public EmployeeController(EmployeeService employeeService, EmployeeRepository employeeRepository) {
        this.employeeService = employeeService;
        this.employeeRepository = employeeRepository;
    }

    // --- NEW: LOGIN ENDPOINT (The Missing Piece) ---
    @PostMapping("/login")
    public ResponseEntity<?> loginUser(@Valid @RequestBody LoginRequest request) {
        Optional<Employee> optEmp = employeeRepository.findByEmail(request.getEmail());

        if (optEmp.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not found.");
        }

        Employee emp = optEmp.get();

        // 1. Password Check
        if (!emp.getPassword().equals(request.getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid credentials.");
        }

        // 2. THE NEW RBAC LOGIC: Check Job Title
        String job = emp.getJobTitle().toUpperCase();
        boolean isHrStaff = job.contains("HR") || job.contains("RECRUITER") || job.contains("ADMIN");
        String requestedRole = request.getRequestedRole(); // "HR" or "EMPLOYEE"

        if ("HR".equals(requestedRole)) {
            if (!isHrStaff) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("Access Denied: Your job title (" + emp.getJobTitle() + ") does not have HR permissions.");
            }
        } else if ("EMPLOYEE".equals(requestedRole)) {
            // We generally allow everyone to see their own employee portal,
            // but if you want to keep them separate:
            if (isHrStaff) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("HR Staff must login through the Admin Portal.");
            }
        }

        return ResponseEntity.ok(emp);
    }

    // --- YOUR EXISTING METHODS ---
    @GetMapping
    public ResponseEntity<List<EmployeeResponseDTO>> getAllEmployees() {
        return ResponseEntity.ok(employeeService.getAllEmployees());
    }

    @GetMapping("/{id}")
    public ResponseEntity<EmployeeResponseDTO> getEmployeeById(@PathVariable Long id) {
        return ResponseEntity.ok(employeeService.getEmployeeById(id));
    }

    @PostMapping
    public ResponseEntity<EmployeeResponseDTO> createEmployee(@Valid @RequestBody EmployeeRequestDTO requestDTO) {
        EmployeeResponseDTO created = employeeService.createEmployee(requestDTO);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<EmployeeResponseDTO> updateEmployee(@PathVariable Long id, @Valid @RequestBody EmployeeRequestDTO requestDTO) {
        return ResponseEntity.ok(employeeService.updateEmployee(id, requestDTO));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEmployee(@PathVariable Long id) {
        employeeService.deleteEmployee(id);
        return ResponseEntity.noContent().build();
    }
}