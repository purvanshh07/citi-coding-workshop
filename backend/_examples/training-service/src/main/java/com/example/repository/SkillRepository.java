// src/main/java/com/example/repository/SkillRepository.java
package com.example.repository;

import com.example.model.Skill;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SkillRepository extends JpaRepository<Skill, Long> {
    List<Skill> findByEmployeeId(Long employeeId);
}