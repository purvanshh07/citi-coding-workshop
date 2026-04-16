// src/main/java/com/example/repository/TrainingRecordRepository.java
package com.example.repository;

import com.example.model.TrainingRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TrainingRecordRepository extends JpaRepository<TrainingRecord, Long> {
    List<TrainingRecord> findByEmployeeId(Long employeeId);
}