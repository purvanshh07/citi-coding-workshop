// src/main/java/com/example/service/TrainingService.java
package com.example.service;

import com.example.dto.EmployeeTrainingProfileDTO;
import com.example.dto.GapAnalysisDTO;
import com.example.exception.EmployeeNotFoundException;
import com.example.model.Skill;
import com.example.model.TrainingRecord;
import com.example.repository.SkillRepository;
import com.example.repository.TrainingRecordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TrainingService {

    private final SkillRepository skillRepository;
    private final TrainingRecordRepository trainingRecordRepository;
    private final RestTemplate restTemplate;

    @Value("${identity.service.base-url}")
    private String identityServiceBaseUrl;

    /**
     * Company-wide benchmark: skills required for any employee to be
     * considered promotion-ready. Centralised here so changing policy
     * only requires editing one place.
     */
    private static final List<String> REQUIRED_COMPANY_SKILLS =
            List.of("Microservices", "React", "PostgreSQL", "Cloud Computing");

    // ----------------------------------------------------------------
    // Cross-Service Validation
    // ----------------------------------------------------------------

    /**
     * Calls the Identity Service to verify an employee exists.
     * Throws EmployeeNotFoundException (→ 404 response) if the
     * Identity Service returns 404, preventing orphaned data.
     */
    private void validateEmployeeExists(Long employeeId) {
        String url = identityServiceBaseUrl + "/api/v1/employees/" + employeeId;
        log.debug("Validating employee existence via Identity Service: {}", url);

        try {
            ResponseEntity<Object> response = restTemplate.getForEntity(url, Object.class);
            log.debug("Identity Service responded with status {} for employee {}",
                    response.getStatusCode(), employeeId);
        } catch (HttpClientErrorException.NotFound ex) {
            log.warn("Employee {} not found in Identity Service. Rejecting request.", employeeId);
            throw new EmployeeNotFoundException(employeeId);
        } catch (Exception ex) {
            // Network errors, timeouts, etc. — propagate so the global
            // handler returns 500 rather than silently saving bad data.
            log.error("Error calling Identity Service for employee {}: {}", employeeId, ex.getMessage());
            throw new RuntimeException(
                    "Unable to reach Identity Service to validate employee ID " + employeeId, ex);
        }
    }

    // ----------------------------------------------------------------
    // Skill Operations
    // ----------------------------------------------------------------

    /**
     * Persists a new Skill after confirming the employee exists in
     * the Identity Service.
     */
    @Transactional
    public Skill addSkill(Skill skill) {
        validateEmployeeExists(skill.getEmployeeId());
        Skill saved = skillRepository.save(skill);
        log.info("Saved skill '{}' (id={}) for employee {}",
                saved.getName(), saved.getId(), saved.getEmployeeId());
        return saved;
    }

    // ----------------------------------------------------------------
    // Training Record Operations
    // ----------------------------------------------------------------

    /**
     * Persists a new TrainingRecord after confirming the employee exists.
     */
    @Transactional
    public TrainingRecord addTrainingRecord(TrainingRecord record) {
        validateEmployeeExists(record.getEmployeeId());
        TrainingRecord saved = trainingRecordRepository.save(record);
        log.info("Saved training record '{}' (id={}) for employee {}",
                saved.getCourseName(), saved.getId(), saved.getEmployeeId());
        return saved;
    }

    // ----------------------------------------------------------------
    // Profile Aggregation
    // ----------------------------------------------------------------

    /**
     * Returns a composite profile (skills + training history) for a
     * given employee. Validates employee existence first so that
     * callers always get a 404 for unknown IDs rather than empty lists.
     */
    @Transactional(readOnly = true)
    public EmployeeTrainingProfileDTO getEmployeeProfile(Long employeeId) {
        validateEmployeeExists(employeeId);

        List<Skill> skills = skillRepository.findByEmployeeId(employeeId);
        List<TrainingRecord> records = trainingRecordRepository.findByEmployeeId(employeeId);

        log.debug("Profile for employee {}: {} skills, {} training records",
                employeeId, skills.size(), records.size());

        return EmployeeTrainingProfileDTO.builder()
                .employeeId(employeeId)
                .skills(skills)
                .trainingRecords(records)
                .build();
    }

    // ----------------------------------------------------------------
    // Gap Analysis (Business Logic)
    // ----------------------------------------------------------------

    /**
     * Compares the employee's current skills against the company's
     * required skill set and returns a structured gap analysis.
     *
     * Algorithm:
     *  1. Fetch the employee's skills (case-insensitive comparison).
     *  2. Partition REQUIRED_COMPANY_SKILLS into acquired vs missing.
     *  3. Mark promotionReady = true only when no gaps remain.
     */
    @Transactional(readOnly = true)
    public GapAnalysisDTO getGapAnalysis(Long employeeId) {
        validateEmployeeExists(employeeId);

        List<Skill> employeeSkills = skillRepository.findByEmployeeId(employeeId);

        // Normalise to lowercase for case-insensitive comparison
        Set<String> employeeSkillNames = employeeSkills.stream()
                .map(s -> s.getName().toLowerCase())
                .collect(Collectors.toSet());

        List<String> acquired = REQUIRED_COMPANY_SKILLS.stream()
                .filter(req -> employeeSkillNames.contains(req.toLowerCase()))
                .toList();

        List<String> missing = REQUIRED_COMPANY_SKILLS.stream()
                .filter(req -> !employeeSkillNames.contains(req.toLowerCase()))
                .toList();

        boolean promotionReady = missing.isEmpty();

        log.info("Gap analysis for employee {}: {}/{} required skills met. Promotion ready: {}",
                employeeId, acquired.size(), REQUIRED_COMPANY_SKILLS.size(), promotionReady);

        return GapAnalysisDTO.builder()
                .employeeId(employeeId)
                .acquiredRequiredSkills(acquired)
                .missingSkills(missing)
                .promotionReady(promotionReady)
                .build();
    }
}