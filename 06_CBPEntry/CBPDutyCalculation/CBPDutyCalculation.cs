using System;
using System.Collections.Generic;
using System.Text.Json;
using UiPath.CodedWorkflows;

namespace CBPDutyCalculation
{
    public class CBPDutyCalculation : CodedWorkflow
    {
        /// <summary>
        /// Calculates final landed duty for a CBP customs entry.
        /// Computes base duty, Section 301 tariffs, ADD/CVD, MPF, and HMF.
        /// Returns actual duty, variance from estimate, and a JSON breakdown for audit.
        /// </summary>
        [Workflow]
        public (
            double actualDutyUsd,
            double mpfAmount,
            double hmfAmount,
            double dutyVarianceUsd,
            double dutyVariancePct,
            string dutyBreakdownJson
        )
        Execute(
            double totalValueUsd,
            double dutyRatePct,
            double section301RatePct = 0.0,
            double addCvdRatePct = 0.0,
            double estimatedDutyUsd = 0.0,
            string incoterms = "FOB",
            double freightCostUsd = 0.0,
            double insuranceCostUsd = 0.0
        )
        {
            // --- Dutiable Value ---
            // Under CIF terms, the dutiable value is the invoice value (already includes freight+insurance).
            // Under FOB terms, we must ADD freight and insurance to reach CIF dutiable value.
            double dutiableValue = totalValueUsd;
            if (string.Equals(incoterms, "FOB", StringComparison.OrdinalIgnoreCase))
            {
                dutiableValue = totalValueUsd + freightCostUsd + insuranceCostUsd;
            }

            Log($"[DutyCalc] Dutiable value: ${dutiableValue:F2} ({incoterms})");

            // --- Merchandise Processing Fee (MPF) ---
            // Rate: 0.3464% of dutiable value, clamped to [$32.71, $634.62]
            double mpfRaw = dutiableValue * 0.003464;
            double mpfAmount = Math.Max(32.71, Math.Min(634.62, mpfRaw));

            // --- Harbor Maintenance Fee (HMF) ---
            // Rate: 0.125% of dutiable value, no clamp
            double hmfAmount = dutiableValue * 0.00125;

            // --- Base Duty (MFN Rate) ---
            double baseDuty = dutiableValue * (dutyRatePct / 100.0);

            // --- Section 301 Additional Tariff ---
            double sec301Duty = dutiableValue * (section301RatePct / 100.0);

            // --- Antidumping / Countervailing Duty (ADD/CVD) ---
            double addCvdDuty = dutiableValue * (addCvdRatePct / 100.0);

            // --- Total Actual Duty ---
            double actualDutyUsd = baseDuty + sec301Duty + addCvdDuty + mpfAmount + hmfAmount;

            Log($"[DutyCalc] Base={baseDuty:F2} | Sec301={sec301Duty:F2} | ADD/CVD={addCvdDuty:F2} | MPF={mpfAmount:F2} | HMF={hmfAmount:F2}");
            Log($"[DutyCalc] Total Actual Duty: ${actualDutyUsd:F2}");

            // --- Variance from Estimate ---
            double dutyVarianceUsd = actualDutyUsd - estimatedDutyUsd;
            double dutyVariancePct = estimatedDutyUsd > 0
                ? (dutyVarianceUsd / estimatedDutyUsd) * 100.0
                : 0.0;

            // --- JSON Breakdown for Audit Trail ---
            var breakdown = new Dictionary<string, object>
            {
                ["calculatedAt"] = DateTime.UtcNow.ToString("o"),
                ["incoterms"] = incoterms,
                ["invoiceValueUsd"] = Math.Round(totalValueUsd, 2),
                ["freightCostUsd"] = Math.Round(freightCostUsd, 2),
                ["insuranceCostUsd"] = Math.Round(insuranceCostUsd, 2),
                ["dutiableValueUsd"] = Math.Round(dutiableValue, 2),
                ["rates"] = new Dictionary<string, object>
                {
                    ["baseMfnPct"] = dutyRatePct,
                    ["section301Pct"] = section301RatePct,
                    ["addCvdPct"] = addCvdRatePct,
                    ["mpfPct"] = 0.3464,
                    ["hmfPct"] = 0.125
                },
                ["lineItems"] = new Dictionary<string, object>
                {
                    ["baseDutyUsd"] = Math.Round(baseDuty, 2),
                    ["section301Usd"] = Math.Round(sec301Duty, 2),
                    ["addCvdUsd"] = Math.Round(addCvdDuty, 2),
                    ["mpfUsd"] = Math.Round(mpfAmount, 2),
                    ["hmfUsd"] = Math.Round(hmfAmount, 2)
                },
                ["totals"] = new Dictionary<string, object>
                {
                    ["actualDutyUsd"] = Math.Round(actualDutyUsd, 2),
                    ["estimatedDutyUsd"] = Math.Round(estimatedDutyUsd, 2),
                    ["varianceUsd"] = Math.Round(dutyVarianceUsd, 2),
                    ["variancePct"] = Math.Round(dutyVariancePct, 4)
                }
            };

            string dutyBreakdownJson = JsonSerializer.Serialize(breakdown,
                new JsonSerializerOptions { WriteIndented = true });

            Log($"[DutyCalc] Variance vs estimate: ${dutyVarianceUsd:F2} ({dutyVariancePct:F2}%)");

            return (
                actualDutyUsd: Math.Round(actualDutyUsd, 2),
                mpfAmount: Math.Round(mpfAmount, 2),
                hmfAmount: Math.Round(hmfAmount, 2),
                dutyVarianceUsd: Math.Round(dutyVarianceUsd, 2),
                dutyVariancePct: Math.Round(dutyVariancePct, 4),
                dutyBreakdownJson: dutyBreakdownJson
            );
        }
    }
}
