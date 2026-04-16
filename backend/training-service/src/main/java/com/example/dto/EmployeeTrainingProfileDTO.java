// src/main/java/com/example/dto/EmployeeTrainingProfileDTO.java
package com.example.dto;

import com.example.model.Skill;
import com.example.model.TrainingRecord;
import lombok.*;

import java.util.List;

/**
 * Composite DTO returned by GET /employee/{employeeId}.
 * Aggregates all Skill and TrainingRecord data for a single employee.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmployeeTrainingProfileDTO {

    private Long employeeId;
    private List<Skill> skills;
    private List<TrainingRecord> trainingRecords;
}