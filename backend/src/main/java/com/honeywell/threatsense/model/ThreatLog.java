package com.honeywell.threatsense.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class ThreatLog {

    private int id;
    private String timestamp;

    @JsonProperty("user_id")
    private String userId;

    @JsonProperty("ip_address")
    private String ipAddress;

    @JsonProperty("location_city")
    private String locationCity;

    @JsonProperty("location_country")
    private String locationCountry;

    @JsonProperty("device_id")
    private String deviceId;

    @JsonProperty("failed_attempts")
    private int failedAttempts;

    @JsonProperty("session_duration_sec")
    private int sessionDurationSec;

    @JsonProperty("privilege_level")
    private String privilegeLevel;

    @JsonProperty("hour_of_day")
    private int hourOfDay;

    @JsonProperty("risk_score")
    private double riskScore;

    @JsonProperty("is_anomaly")
    private boolean isAnomaly;

    @JsonProperty("anomaly_type")
    private String anomalyType;

    // Map of feature name -> SHAP contribution value
    private Map<String, Double> explanation;

    @JsonProperty("cold_start")
    private boolean coldStart;

    @JsonProperty("concept_drift_flag")
    private boolean conceptDriftFlag;
}
