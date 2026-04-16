// src/main/java/com/example/model/Skill.java
package com.example.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;

@Entity
@Table(name = "skills", indexes = {
        @Index(name = "idx_skill_employee_id", columnList = "employee_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Skill {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "employee_id", nullable = false)
    @NotNull(message = "Employee ID must not be null")
    private Long employeeId;

    @Column(nullable = false)
    @NotBlank(message = "Skill name must not be blank")
    private String name;

    @Column(name = "proficiency_level", nullable = false)
    @NotNull(message = "Proficiency level must not be null")
    @Min(value = 1, message = "Proficiency level must be at least 1")
    @Max(value = 5, message = "Proficiency level must be at most 5")
    private Integer proficiencyLevel;
}