/**
 * ============================================================
 *   AI/ML REPORT INTEGRITY VALIDATOR
 *   Jain Super Bazar – Cash Reporting System
 * ============================================================
 *  Uses heuristic rule-based anomaly detection to:
 *   1. Validate report data for suspicious patterns
 *   2. Generate a cryptographic SHA-256 report hash
 *   3. Classify report risk level (LOW / MEDIUM / HIGH)
 * ============================================================
 */

const crypto = require('crypto');

// ── Anomaly Detection Rules (AI Heuristic Engine) ─────────
const RULES = [
    {
        id: 'RULE_ZERO_TOTAL',
        description: 'Grand total is zero — report may be incomplete',
        severity: 'HIGH',
        check: (d) => d.grand_total === 0 && d.system_total === 0,
    },
    {
        id: 'RULE_LARGE_DIFF',
        description: 'Grand total differs from system total by more than ₹500',
        severity: 'HIGH',
        check: (d) => Math.abs(d.grand_total - d.system_total) > 500,
    },
    {
        id: 'RULE_NEGATIVE_FIELD',
        description: 'One or more payment fields contain negative values',
        severity: 'HIGH',
        check: (d) =>
            d.total_cash < 0 ||
            d.card_upi_total < 0 ||
            d.sodexo_total < 0 ||
            d.credit_note_total < 0 ||
            d.cheque_total < 0,
    },
    {
        id: 'RULE_EXTREME_CASH',
        description: 'Cash total exceeds ₹5,00,000 — unusual for a single shift',
        severity: 'MEDIUM',
        check: (d) => d.total_cash > 500000,
    },
    {
        id: 'RULE_FUTURE_DATE',
        description: 'Report date is in the future',
        severity: 'HIGH',
        check: (d) => {
            const reportDate = new Date(d.report_date);
            const today = new Date();
            today.setHours(23, 59, 59, 999);
            return reportDate > today;
        },
    },
    {
        id: 'RULE_CHEQUE_MISSING_NO',
        description: 'A cheque entry has amount but no cheque number',
        severity: 'HIGH',
        check: (d) =>
            Array.isArray(d.cheques) &&
            d.cheques.some((c) => c.amount > 0 && !c.cheque_no),
    },
    {
        id: 'RULE_EXPENSE_NO_DESC',
        description: 'An expense entry has amount but no description',
        severity: 'MEDIUM',
        check: (d) =>
            Array.isArray(d.expenses) &&
            d.expenses.some((e) => parseFloat(e.amount) > 0 && !e.desc),
    },
    {
        id: 'RULE_MODERATE_DIFF',
        description: 'Grand total differs from system total (minor discrepancy)',
        severity: 'LOW',
        check: (d) => {
            const diff = Math.abs(d.grand_total - d.system_total);
            return diff > 0 && diff <= 500;
        },
    },
];

// ── Risk Scoring ───────────────────────────────────────────
const SEVERITY_WEIGHTS = { HIGH: 10, MEDIUM: 5, LOW: 1 };

function computeRiskScore(violations) {
    return violations.reduce(
        (score, v) => score + (SEVERITY_WEIGHTS[v.severity] || 0),
        0
    );
}

function classifyRisk(score) {
    if (score >= 10) return 'HIGH';
    if (score >= 5) return 'MEDIUM';
    if (score > 0) return 'LOW';
    return 'CLEAR';
}

// ── SHA-256 Report Hash ────────────────────────────────────
function generateReportHash(reportData) {
    const payload = JSON.stringify({
        branch_id: reportData.branch_id,
        report_date: reportData.report_date,
        shift: reportData.shift,
        grand_total: reportData.grand_total,
        total_cash: reportData.total_cash,
        card_upi_total: reportData.card_upi_total,
        sodexo_total: reportData.sodexo_total,
        credit_note_total: reportData.credit_note_total,
        cheque_total: reportData.cheque_total,
        expense: reportData.expense,
        system_total: reportData.system_total,
    });
    return crypto.createHash('sha256').update(payload).digest('hex').substring(0, 16).toUpperCase();
}

// ── Main Validator ─────────────────────────────────────────
function validateReport(reportData) {
    const violations = [];

    for (const rule of RULES) {
        try {
            if (rule.check(reportData)) {
                violations.push({
                    rule_id: rule.id,
                    description: rule.description,
                    severity: rule.severity,
                });
            }
        } catch (e) {
            // Rule evaluation failed — skip silently
        }
    }

    const riskScore = computeRiskScore(violations);
    const riskLevel = classifyRisk(riskScore);
    const reportHash = generateReportHash(reportData);
    const timestamp = new Date().toISOString();

    return {
        isValid: violations.filter((v) => v.severity === 'HIGH').length === 0,
        riskLevel,       // 'CLEAR' | 'LOW' | 'MEDIUM' | 'HIGH'
        riskScore,
        violations,
        reportHash,      // 16-char hex fingerprint
        timestamp,
    };
}

module.exports = { validateReport, generateReportHash };
