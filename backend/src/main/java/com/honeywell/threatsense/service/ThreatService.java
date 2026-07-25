package com.honeywell.threatsense.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.honeywell.threatsense.model.ThreatLog;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
public class ThreatService {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private List<ThreatLog> cachedLogs = null;
    private Map<String, Object> cachedModelPerformance = null;

    // -----------------------------------------------------------------------
    // Data Loading
    // -----------------------------------------------------------------------

    private List<ThreatLog> loadLogs() {
        if (cachedLogs != null) {
            return cachedLogs;
        }

        // Try multiple candidate paths relative to working directory
        List<Path> candidates = List.of(
            Paths.get("../shared/threat_data.json"),
            Paths.get("../../shared/threat_data.json"),
            Paths.get("shared/threat_data.json"),
            Paths.get(System.getProperty("user.dir")).resolve("../shared/threat_data.json")
        );

        for (Path candidate : candidates) {
            File file = candidate.toFile();
            if (file.exists()) {
                try {
                    log.info("Loading threat data from: {}", file.getAbsolutePath());
                    // Parse as generic tree to handle both old (array) and new (object) format
                    com.fasterxml.jackson.databind.JsonNode root = objectMapper.readTree(file);
                    if (root.isArray()) {
                        // Legacy format: plain array
                        cachedLogs = objectMapper.convertValue(
                            root, new TypeReference<List<ThreatLog>>() {});
                        cachedModelPerformance = null;
                    } else {
                        // New format: { model_performance: {...}, records: [...] }
                        com.fasterxml.jackson.databind.JsonNode recordsNode = root.get("records");
                        cachedLogs = objectMapper.convertValue(
                            recordsNode, new TypeReference<List<ThreatLog>>() {});
                        com.fasterxml.jackson.databind.JsonNode perfNode = root.get("model_performance");
                        if (perfNode != null) {
                            cachedModelPerformance = objectMapper.convertValue(
                                perfNode, new TypeReference<Map<String, Object>>() {});
                        }
                    }
                    log.info("Loaded {} logs ({} anomalies)", cachedLogs.size(),
                        cachedLogs.stream().filter(ThreatLog::isAnomaly).count());
                    return cachedLogs;
                } catch (Exception e) {
                    log.error("Failed to parse {}: {}", file.getAbsolutePath(), e.getMessage());
                }
            }
        }

        log.warn("threat_data.json not found - returning empty list. Run the ML engine first.");
        cachedLogs = Collections.emptyList();
        return cachedLogs;
    }

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------

    /** Returns all flagged anomaly records, newest-first */
    public List<ThreatLog> getFlaggedThreats() {
        return loadLogs().stream()
            .filter(ThreatLog::isAnomaly)
            .sorted(Comparator.comparingDouble(ThreatLog::getRiskScore).reversed())
            .collect(Collectors.toList());
    }

    /** Returns all logs (flagged + normal) */
    public List<ThreatLog> getAllLogs() {
        return Collections.unmodifiableList(loadLogs());
    }

    /** Returns a single log by id */
    public Optional<ThreatLog> getById(int id) {
        return loadLogs().stream().filter(l -> l.getId() == id).findFirst();
    }

    /** Returns summary statistics */
    public Map<String, Object> getStats() {
        List<ThreatLog> logs = loadLogs();
        if (logs.isEmpty()) {
            return Map.of("totalLogs", 0, "highRiskCount", 0,
                          "avgRiskScore", 0.0, "systemThreatScore", 0.0,
                          "anomalyCount", 0, "anomalyCounts", Collections.emptyMap());
        }

        long anomalyCount    = logs.stream().filter(ThreatLog::isAnomaly).count();
        long highRiskCount   = logs.stream().filter(l -> l.getRiskScore() >= 70).count();
        double avgRiskScore  = logs.stream().filter(ThreatLog::isAnomaly).mapToDouble(ThreatLog::getRiskScore).average().orElse(0);
        
        // Aggregate all anomaly types dynamically
        Map<String, Long> anomalyCounts = logs.stream()
            .filter(ThreatLog::isAnomaly)
            .filter(l -> l.getAnomalyType() != null && !"None".equals(l.getAnomalyType()))
            .collect(Collectors.groupingBy(ThreatLog::getAnomalyType, Collectors.counting()));

        // System threat score: weighted avg of top 50 risk scores (0-100)
        double systemThreatScore = logs.stream()
            .mapToDouble(ThreatLog::getRiskScore)
            .sorted()
            .skip(Math.max(0, logs.size() - 50))
            .average()
            .orElse(0);

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalLogs",             logs.size());
        stats.put("anomalyCount",          anomalyCount);
        stats.put("highRiskCount",         highRiskCount);
        stats.put("avgRiskScore",          Math.round(avgRiskScore * 10.0) / 10.0);
        stats.put("systemThreatScore",     Math.round(systemThreatScore * 10.0) / 10.0);
        stats.put("anomalyCounts",         anomalyCounts);
        if (cachedModelPerformance != null) {
            stats.put("modelPerformance", cachedModelPerformance);
        }
        
        return stats;
    }

    /** Force reload from disk (useful if JSON was regenerated) */
    public void reloadData() {
        cachedLogs = null;
        cachedModelPerformance = null;
        loadLogs();
    }

    /**
     * Runs the Python ML engine to regenerate threat_data.json, then reloads cache.
     * Uses ProcessBuilder so it works on both Windows and Unix.
     */
    public Map<String, Object> regenerateData() throws Exception {
        // Locate the ml-engine directory relative to the working dir
        Path workDir = Paths.get(System.getProperty("user.dir"));
        Path mlDir = workDir.resolve("../ml-engine").normalize();
        if (!mlDir.toFile().exists()) {
            mlDir = workDir.resolve("../../ml-engine").normalize();
        }

        // Try python, then python3
        String pythonCmd = "python";
        try {
            new ProcessBuilder(pythonCmd, "--version").start().waitFor();
        } catch (Exception e) {
            pythonCmd = "python3";
        }

        log.info("[Regenerate] Running ML engine from: {}", mlDir.toAbsolutePath());
        ProcessBuilder pb = new ProcessBuilder(pythonCmd, "generate_and_train.py");
        pb.directory(mlDir.toFile());
        pb.redirectErrorStream(true);

        Process proc = pb.start();
        // Read stdout so the buffer doesn't block
        String output = new String(proc.getInputStream().readAllBytes());
        boolean finished = proc.waitFor(180, java.util.concurrent.TimeUnit.SECONDS);

        if (!finished) {
            proc.destroyForcibly();
            throw new RuntimeException("ML engine timed out after 3 minutes");
        }
        if (proc.exitValue() != 0) {
            log.error("[Regenerate] ML engine exited with code {}: {}", proc.exitValue(), output);
            // Non-zero exit but data may still have been written (e.g. print encoding error on Windows)
            // Try to reload anyway before throwing
        }

        log.info("[Regenerate] ML engine output:\n{}", output);

        // Reload from the freshly written JSON
        reloadData();

        List<ThreatLog> logs = loadLogs();
        long anomalyCount = logs.stream().filter(ThreatLog::isAnomaly).count();
        
        Map<String, Long> anomalyCounts = logs.stream()
            .filter(ThreatLog::isAnomaly)
            .filter(l -> l.getAnomalyType() != null && !"None".equals(l.getAnomalyType()))
            .collect(Collectors.groupingBy(ThreatLog::getAnomalyType, Collectors.counting()));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("status",       "regenerated");
        result.put("totalLogs",    logs.size());
        result.put("anomalyCount", anomalyCount);
        result.put("anomalyCounts", anomalyCounts);
        return result;
    }
}
