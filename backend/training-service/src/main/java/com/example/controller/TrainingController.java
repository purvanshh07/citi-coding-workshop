// src/main/java/com/example/controller/TrainingController.java
package com.example.controller;

import com.example.dto.EmployeeTrainingProfileDTO;
import com.example.dto.GapAnalysisDTO;
import com.example.model.Skill;
import com.example.model.TrainingRecord;
import com.example.service.TrainingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/training")
@CrossOrigin(origins = "*")   // React frontend on http://localhost:3002
@RequiredArgsConstructor
@Slf4j
public class TrainingController {

    private final TrainingService trainingService;

    // ----------------------------------------------------------------
    // POST — Create Skill
    // ----------------------------------------------------------------

    /**
     * POST /api/v1/training/skills
     * Registers a new skill for an employee.
     * Returns 404 if the employee does not exist in the Identity Service.
     */
    @PostMapping("/skills")
    public ResponseEntity<Skill> addSkill(@Valid @RequestBody Skill skill) {
        log.info("POST /skills - employeeId={}, skill={}", skill.getEmployeeId(), skill.getName());
        Skill saved = trainingService.addSkill(skill);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    // ----------------------------------------------------------------
    // POST — Create Training Record
    // ----------------------------------------------------------------

    /**
     * POST /api/v1/training/records
     * Registers a new training record for an employee.
     * Returns 404 if the employee does not exist in the Identity Service.
     */
    @PostMapping("/records")
    public ResponseEntity<TrainingRecord> addTrainingRecord(
            @Valid @RequestBody TrainingRecord record) {
        log.info("POST /records - employeeId={}, course={}", record.getEmployeeId(), record.getCourseName());
        TrainingRecord saved = trainingService.addTrainingRecord(record);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    // ----------------------------------------------------------------
    // GET — Employee Profile (Composite DTO)
    // ----------------------------------------------------------------

    /**
     * GET /api/v1/training/employee/{employeeId}
     * Returns a combined view of all Skills and TrainingRecords for
     * the specified employee.
     */
    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<EmployeeTrainingProfileDTO> getEmployeeProfile(
            @PathVariable Long employeeId) {
        log.info("GET /employee/{} - fetching full profile", employeeId);
        return ResponseEntity.ok(trainingService.getEmployeeProfile(employeeId));
    }

    // ----------------------------------------------------------------
    // GET — Gap Analysis (Business Logic)
    // ----------------------------------------------------------------

    /**
     * GET /api/v1/training/employee/{employeeId}/gap-analysis
     * Compares the employee's skills against the required company
     * skill set and returns a promotion-readiness report.
     */
    @GetMapping("/employee/{employeeId}/gap-analysis")
    public ResponseEntity<GapAnalysisDTO> getGapAnalysis(
            @PathVariable Long employeeId) {
        log.info("GET /employee/{}/gap-analysis - running gap analysis", employeeId);
        return ResponseEntity.ok(trainingService.getGapAnalysis(employeeId));
    }
}