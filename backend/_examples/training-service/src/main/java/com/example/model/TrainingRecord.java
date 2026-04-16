// src/main/java/com/example/model/TrainingRecord.java
package com.example.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;

@Entity
@Table(name = "training_records", indexes = {
        @Index(name = "idx_training_employee_id", columnList = "employee_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrainingRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "employee_id", nullable = false)
    @NotNull(message = "Employee ID must not be null")
    private Long employeeId;

    @Column(name = "course_name", nullable = false)
    @NotBlank(message = "Course name must not be blank")
    private String courseName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @NotNull(message = "Status must not be null")
    private TrainingStatus status;

    public enum TrainingStatus {
        PLANNED,
        IN_PROGRESS,
        COMPLETED
    }
}