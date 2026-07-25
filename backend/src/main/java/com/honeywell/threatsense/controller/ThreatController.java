package com.honeywell.threatsense.controller;

import com.honeywell.threatsense.model.ThreatLog;
import com.honeywell.threatsense.service.ThreatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class ThreatController {

    private final ThreatService threatService;

    /**
     * GET /api/threats
     * Returns all flagged anomaly logs sorted by risk score (descending).
     */
    @GetMapping("/threats")
    public ResponseEntity<List<ThreatLog>> getThreats() {
        return ResponseEntity.ok(threatService.getFlaggedThreats());
    }

    /**
     * GET /api/threats/all
     * Returns all logs (anomalies + normal), useful for charting.
     */
    @GetMapping("/threats/all")
    public ResponseEntity<List<ThreatLog>> getAllLogs() {
        return ResponseEntity.ok(threatService.getAllLogs());
    }

    /**
     * GET /api/threats/{id}
     * Returns a single log entry by ID, including SHAP explanation.
     */
    @GetMapping("/threats/{id}")
    public ResponseEntity<ThreatLog> getThreatById(@PathVariable int id) {
        return threatService.getById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * GET /api/stats
     * Returns summary metrics for the dashboard header/cards.
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        return ResponseEntity.ok(threatService.getStats());
    }

    /**
     * POST /api/reload
     * Forces a reload of threat_data.json from disk.
     */
    @PostMapping("/reload")
    public ResponseEntity<Map<String, String>> reloadData() {
        threatService.reloadData();
        return ResponseEntity.ok(Map.of("status", "reloaded"));
    }

    /**
     * POST /api/regenerate
     * Runs the Python ML engine to regenerate threat_data.json, then reloads.
     * This can take 30–90 seconds depending on hardware.
     */
    @PostMapping("/regenerate")
    public ResponseEntity<Map<String, Object>> regenerate() {
        try {
            Map<String, Object> result = threatService.regenerateData();
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                .body(Map.of("status", "error", "message", e.getMessage()));
        }
    }
}
