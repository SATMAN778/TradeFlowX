using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using UiPath.CodedWorkflows;
using UiPath.Core.Activities;
using UiPath.Platform.ResourceHandling;

namespace PGA_StatusPoller
{
    public class PgaStatusPollerWorkflow : CodedWorkflow
    {
        [Workflow]
        public (string out_PgaStatus, string out_PgaStatusJson, string out_AffectedAgencies, string out_ReportStoragePath) Execute(
            string in_PgaAgencies = null,
            string in_PoNumber = null)
        {
            Log("[PGA Poller] Started");

            if (string.IsNullOrWhiteSpace(in_PgaAgencies))
                in_PgaAgencies = "[\"FDA\",\"USDA\",\"EPA\",\"FWS\",\"CBP\"]";
            if (string.IsNullOrWhiteSpace(in_PoNumber))
                in_PoNumber = "ODY-2026-PGA-DEMO";

            Log($"[PGA Poller] Polling PGA agencies for PO: {in_PoNumber}");
            Log($"[PGA Poller] Agencies: {in_PgaAgencies}");

            // Read simulation control assets — defaults to APPROVED if asset missing
            string fdaStatus = "APPROVED";
            string usdaStatus = "APPROVED";
            string epaStatus = "APPROVED";
            string fwsStatus = "APPROVED";
            string cbpStatus = "APPROVED";

            try { fdaStatus = system.GetAsset("PGA_Demo_FDA_Status")?.ToString() ?? "APPROVED"; } catch { }
            try { usdaStatus = system.GetAsset("PGA_Demo_USDA_Status")?.ToString() ?? "APPROVED"; } catch { }
            try { epaStatus = system.GetAsset("PGA_Demo_EPA_Status")?.ToString() ?? "APPROVED"; } catch { }
            try { fwsStatus = system.GetAsset("PGA_Demo_FWS_Status")?.ToString() ?? "APPROVED"; } catch { }
            try { cbpStatus = system.GetAsset("PGA_Demo_CBP_Status")?.ToString() ?? "APPROVED"; } catch { }

            // Agency definitions with real portal URLs for demo display
            var agencies = new List<AgencyResult>
            {
                new AgencyResult { Name = "FDA",            Url = "https://www.accessdata.fda.gov/scripts/oasis/",  Code = "FDA-001",  Status = fdaStatus,  Message = $"FDA OASIS simulated check: {fdaStatus}" },
                new AgencyResult { Name = "USDA APHIS",     Url = "https://epermits.aphis.usda.gov/",               Code = "USDA-001", Status = usdaStatus, Message = $"USDA APHIS simulated check: {usdaStatus}" },
                new AgencyResult { Name = "EPA CDX",        Url = "https://cdx.epa.gov/",                           Code = "EPA-001",  Status = epaStatus,  Message = $"EPA CDX simulated check: {epaStatus}" },
                new AgencyResult { Name = "Fish & Wildlife", Url = "https://permits.fws.gov/",                      Code = "FWS-001",  Status = fwsStatus,  Message = $"FWS simulated check: {fwsStatus}" },
                new AgencyResult { Name = "CBP ACE PGA",    Url = "https://ace.cbp.dhs.gov/",                       Code = "CBP-001",  Status = cbpStatus,  Message = $"CBP ACE PGA simulated check: {cbpStatus}" }
            };

            foreach (var a in agencies)
                Log($"[PGA Poller] Checking {a.Name} at {a.Url} ... Status: {a.Status}");

            // Worst-case roll-up: REFUSED > MAY_HOLD > APPROVED
            string overall = "APPROVED";
            foreach (var a in agencies)
            {
                if (a.Status == "REFUSED") { overall = "REFUSED"; break; }
                if (a.Status == "MAY_HOLD" && overall != "REFUSED") overall = "MAY_HOLD";
            }

            Log($"[PGA Poller] Overall PGA Status: {overall}");

            // Affected agencies (non-APPROVED)
            var affected = agencies.Where(a => a.Status != "APPROVED").Select(a => a.Name).ToList();
            string affectedStr = affected.Count > 0 ? string.Join(", ", affected) : "None";
            Log($"[PGA Poller] Affected Agencies: {affectedStr}");

            // Build JSON report
            string timestamp = DateTime.UtcNow.ToString("yyyyMMddHHmmss");
            string isoTimestamp = DateTime.UtcNow.ToString("o");
            string jsonReport = BuildJsonReport(in_PoNumber, overall, agencies, isoTimestamp);

            // Upload report to TradeX_Documents storage bucket
            string safePoNumber = in_PoNumber.Replace("/", "_").Replace("\\", "_").Replace(" ", "_").Replace(":", "_");
            string blobPath = $"PGA_Reports/{safePoNumber}/PGA_STATUS_{timestamp}.json";
            string bucketName = "TradeX_Documents";
            string storagePath = $"{bucketName}/{blobPath}";

            string tempPath = Path.Combine(Path.GetTempPath(), $"PGA_STATUS_{timestamp}.json");
            File.WriteAllText(tempPath, jsonReport, Encoding.UTF8);

            try
            {
                IResource fileResource = system.GetResourceForLocalPath(tempPath, PathType.File);
                system.UploadStorageFile(blobPath, fileResource, bucketName);
                Log($"[PGA Poller] Report uploaded to: {storagePath}");
            }
            catch (Exception uploadEx)
            {
                Log($"[PGA Poller] [WARN] Storage upload skipped: {uploadEx.Message}");
            }

            try { File.Delete(tempPath); } catch { }

            Log($"[PGA Poller] Complete. Status={overall} AffectedAgencies={affectedStr} Report={storagePath}");
            return (overall, jsonReport, affectedStr, storagePath);
        }

        private string BuildJsonReport(string poNumber, string overallStatus, List<AgencyResult> agencies, string timestamp)
        {
            var sb = new StringBuilder();
            sb.AppendLine("{");
            sb.AppendLine($"  \"poNumber\": \"{Esc(poNumber)}\",");
            sb.AppendLine($"  \"overallPgaStatus\": \"{overallStatus}\",");
            sb.AppendLine($"  \"timestamp\": \"{timestamp}\",");
            sb.AppendLine($"  \"source\": \"PGA_StatusPoller - Simulated via Orchestrator Assets\",");
            sb.AppendLine("  \"agencies\": [");
            for (int i = 0; i < agencies.Count; i++)
            {
                var a = agencies[i];
                string comma = i < agencies.Count - 1 ? "," : "";
                sb.AppendLine("    {");
                sb.AppendLine($"      \"name\": \"{Esc(a.Name)}\",");
                sb.AppendLine($"      \"portalUrl\": \"{Esc(a.Url)}\",");
                sb.AppendLine($"      \"referenceCode\": \"{Esc(a.Code)}\",");
                sb.AppendLine($"      \"status\": \"{a.Status}\",");
                sb.AppendLine($"      \"message\": \"{Esc(a.Message)}\"");
                sb.AppendLine($"    }}{comma}");
            }
            sb.AppendLine("  ]");
            sb.Append("}");
            return sb.ToString();
        }

        private string Esc(string s)
        {
            if (string.IsNullOrEmpty(s)) return "";
            var sb = new StringBuilder(s.Length + 4);
            foreach (char c in s)
            {
                if (c == '\\') sb.Append("\\\\");
                else if (c == '"') sb.Append("\\\"");
                else if (c == '\n') sb.Append("\\n");
                else if (c == '\r') sb.Append("\\r");
                else sb.Append(c);
            }
            return sb.ToString();
        }

        private class AgencyResult
        {
            public string Name { get; set; }
            public string Url { get; set; }
            public string Code { get; set; }
            public string Status { get; set; }
            public string Message { get; set; }
        }
    }
}
