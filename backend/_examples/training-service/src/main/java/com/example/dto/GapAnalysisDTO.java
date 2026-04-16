// src/main/java/com/example/dto/GapAnalysisDTO.java
package com.example.dto;

import lombok.*;
import java.util.List;

/**
 * DTO returned by GET /employee/{employeeId}/gap-analysis.
 * Contains lists of skills present, missing, and a promotion-readiness flag.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GapAnalysisDTO {

    private Long employeeId;

    /** Skills the employee already has that match company requirements. */
    private List<String> acquiredRequiredSkills;

    /** Skills the employee is missing that are required for promotion. */
    private List<String> missingSkills;

    /** True only when missingSkills is empty. */
    private boolean promotionReady;
}