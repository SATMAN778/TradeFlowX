using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Text.Json;
using UiPath.CodedWorkflows;
using UiPath.Core.Activities;
using UiPath.Platform.ResourceHandling;

namespace ACE_ISF_Filer
{
    public class ISFFilerWorkflow : CodedWorkflow
    {
        [Workflow]
        public (string out_ConfirmationNumber, string out_FilingStatus, string out_PdfStoragePath, string out_FilingTimestamp) Execute(
            string in_IsfPackageJson,
            string in_ShipmentReference,
            string in_CaseId = "")
        {
            Log("ACE ISF Filer (DRAFT MODE) — Started");

            if (string.IsNullOrWhiteSpace(in_CaseId))
                in_CaseId = "HACKATHON-CASE-001";
            if (string.IsNullOrWhiteSpace(in_ShipmentReference))
                in_ShipmentReference = "ODY-2026-ISF-DEMO";
            if (string.IsNullOrWhiteSpace(in_IsfPackageJson))
                in_IsfPackageJson = "{\"sellerName\":\"Emirates Steel Industries LLC\",\"sellerAddress\":\"Mussafah M-42, Abu Dhabi, UAE\",\"buyerName\":\"US Steel Trading Corp\",\"buyerAddress\":\"123 Commerce Dr, Chicago, IL 60601, USA\",\"importerOfRecordNumber\":\"12-3456789\",\"consigneeNumber\":\"12-3456789\",\"manufacturerName\":\"Emirates Steel Industries LLC\",\"manufacturerAddress\":\"Mussafah M-42, Abu Dhabi, UAE\",\"shipToPartyName\":\"Chicago DC LLC\",\"shipToPartyAddress\":\"456 Warehouse Blvd, Chicago IL 60602\",\"countryOfOrigin\":\"AE\",\"htsNumber\":\"7214100000\",\"containerStuffingLocation\":\"JAFZA Gate 2, Dubai, UAE\",\"consolidatorName\":\"Gulf Logistics LLC\",\"consolidatorAddress\":\"Jebel Ali Port, Dubai, UAE\",\"masterBillOfLading\":\"MSCU1234567890\",\"vesselName\":\"MSC ASTRID\",\"voyageNumber\":\"AE2026W\",\"scacCode\":\"MSCU\",\"portOfLoading\":\"AEJEA\",\"portOfDischarge\":\"USLAX\",\"estimatedDeparture\":\"2026-07-15\",\"containerNumbers\":\"MSCU7654321\",\"commodityDescription\":\"Carbon Steel Bars\",\"validationStatus\":\"READY_TO_FILE\"}";

            Log($"ShipmentReference: {in_ShipmentReference}  CaseId: {in_CaseId}");

            var isf = ParseIsfJson(in_IsfPackageJson);

            string ts = DateTime.UtcNow.ToString("yyyyMMddHHmmss");
            string caseFolder = !string.IsNullOrWhiteSpace(in_CaseId) ? in_CaseId : in_ShipmentReference;
            string safeRef = in_ShipmentReference
                .Replace("/", "_").Replace("\\", "_").Replace(" ", "_").Replace(":", "_");
            string fileName = $"ISF_DRAFT_{safeRef}_{ts}.pdf";
            string blobPath = $"ISF_Filings/{caseFolder}/{fileName}";

            byte[] pdfBytes = BuildIsfPdf(isf, in_ShipmentReference, in_CaseId, ts);
            string tempPath = Path.Combine(Path.GetTempPath(), fileName);
            File.WriteAllBytes(tempPath, pdfBytes);
            Log($"ISF Draft PDF generated — {pdfBytes.Length} bytes");

            string bucketName = "TradeX_Documents";
            try
            {
                IResource fileResource = system.GetResourceForLocalPath(tempPath, PathType.File);
                system.UploadStorageFile(blobPath, fileResource, bucketName);
                Log($"PDF uploaded to Storage Bucket: {bucketName}/{blobPath}");
            }
            catch (Exception uploadEx)
            {
                Log($"[WARN] Storage Bucket upload skipped: {uploadEx.Message}");
            }

            try { File.Delete(tempPath); } catch { }

            string confirmation = $"ISF-DRAFT-{safeRef}-{ts}";
            string filingTimestamp = DateTime.UtcNow.ToString("o");

            Log($"ACE ISF Filer Complete. Confirmation: {confirmation}");
            return (confirmation, "DRAFT", $"{bucketName}/{blobPath}", filingTimestamp);
        }

        // ── PDF Assembly ──────────────────────────────────────────────────────────

        private byte[] BuildIsfPdf(Dictionary<string, string> isf, string shipRef, string caseId, string ts)
        {
            string contentStr = BuildContentStream(isf, shipRef, caseId, ts);
            int contentLen = Encoding.Latin1.GetByteCount(contentStr);

            var segs = new List<string>();
            var offsets = new List<int>();
            int pos = 0;

            void Seg(string s) { segs.Add(s); pos += Encoding.Latin1.GetByteCount(s); }
            void Obj() { offsets.Add(pos); }

            Seg("%PDF-1.4\r\n");
            Obj(); Seg("1 0 obj\r\n<< /Type /Catalog /Pages 2 0 R >>\r\nendobj\r\n");
            Obj(); Seg("2 0 obj\r\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\r\nendobj\r\n");
            Obj(); Seg("3 0 obj\r\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792]\r\n" +
                       "   /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >>\r\n" +
                       "   /Contents 4 0 R >>\r\nendobj\r\n");
            Obj(); Seg($"4 0 obj\r\n<< /Length {contentLen} >>\r\nstream\r\n");
            Seg(contentStr);
            Seg("\r\nendstream\r\nendobj\r\n");
            Obj(); Seg("5 0 obj\r\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\r\nendobj\r\n");
            Obj(); Seg("6 0 obj\r\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold >>\r\nendobj\r\n");

            int xrefPos = pos;
            var xr = new StringBuilder();
            xr.Append("xref\r\n0 7\r\n0000000000 65535 f \r\n");
            foreach (int off in offsets) xr.Append($"{off:D10} 00000 n \r\n");
            xr.Append($"trailer\r\n<< /Size 7 /Root 1 0 R >>\r\nstartxref\r\n{xrefPos}\r\n%%EOF\r\n");
            Seg(xr.ToString());

            var all = new StringBuilder();
            foreach (string s in segs) all.Append(s);
            return Encoding.Latin1.GetBytes(all.ToString());
        }

        // ── Content Stream ────────────────────────────────────────────────────────

        private string BuildContentStream(Dictionary<string, string> isf, string shipRef, string caseId, string ts)
        {
            var sb = new StringBuilder();
            int y = 760;

            sb.Append("BT\r\n");

            // Title
            AddTxt(sb, 50, y, "F2", 13, "IMPORTER SECURITY FILING (ISF 10+2)  -  DRAFT"); y -= 15;
            AddTxt(sb, 50, y, "F1", 8,
                $"Generated: {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC  |  Shipment: {shipRef}  |  Case ID: {caseId}"); y -= 11;
            AddTxt(sb, 50, y, "F2", 8, "*** DRAFT - FOR REVIEW ONLY - NOT SUBMITTED TO U.S. CBP / ACE ***"); y -= 6;
            HRule(sb, y); y -= 8;

            // Section 1
            y = SectionHdr(sb, y, "SECTION 1 - IMPORTER PROVIDED ELEMENTS (10 REQUIRED)");
            y = AddField(sb, y, "1.  Seller / Exporter", Join(isf, "sellerName", "sellerAddress"));
            y = AddField(sb, y, "2.  Buyer / Purchaser", Join(isf, "buyerName", "buyerAddress"));
            y = AddField(sb, y, "3.  Importer of Record #", Get(isf, "importerOfRecordNumber"));
            y = AddField(sb, y, "4.  Consignee Number", Get(isf, "consigneeNumber"));
            y = AddField(sb, y, "5.  Manufacturer / Supplier", Join(isf, "manufacturerName", "manufacturerAddress"));
            y = AddField(sb, y, "6.  Ship-To Party", Join(isf, "shipToPartyName", "shipToPartyAddress"));
            y = AddField(sb, y, "7.  Country of Origin", Get(isf, "countryOfOrigin"));
            y = AddField(sb, y, "8.  HTS Number", Get(isf, "htsNumber"));
            y = AddField(sb, y, "9.  Container Stuffing Location", Get(isf, "containerStuffingLocation"));
            y = AddField(sb, y, "10. Consolidator / Stuffer", Join(isf, "consolidatorName", "consolidatorAddress"));

            // Section 2
            y = SectionHdr(sb, y, "SECTION 2 - CARRIER PROVIDED ELEMENTS (+2)");
            y = AddField(sb, y, "+1. Vessel Stow Plan", "Provided by carrier no later than 48 hours after vessel departure");
            y = AddField(sb, y, "+2. Container Status Messages", "Provided by carrier at each container movement event");

            // Section 3
            y = SectionHdr(sb, y, "SECTION 3 - TRANSPORT AND SHIPPING DETAILS");
            y = AddField(sb, y, "Master Bill of Lading", Get(isf, "masterBillOfLading"));
            y = AddField(sb, y, "Vessel Name", Get(isf, "vesselName"));
            y = AddField(sb, y, "Voyage Number", Get(isf, "voyageNumber"));
            y = AddField(sb, y, "SCAC Code", Get(isf, "scacCode"));
            y = AddField(sb, y, "Port of Loading (UAE)", Get(isf, "portOfLoading"));
            y = AddField(sb, y, "Port of Discharge (USA)", Get(isf, "portOfDischarge"));
            y = AddField(sb, y, "Estimated Departure", Get(isf, "estimatedDeparture"));
            y = AddField(sb, y, "Container Numbers", Get(isf, "containerNumbers"));
            y = AddField(sb, y, "Commodity Description", Get(isf, "commodityDescription"));

            // Section 4
            y = SectionHdr(sb, y, "SECTION 4 - VALIDATION STATUS");
            y = AddField(sb, y, "Validation Status", Get(isf, "validationStatus", "PENDING"));
            y = AddField(sb, y, "ISF Ready to File", Get(isf, "isfReadyToFile", "Pending"));
            y = AddField(sb, y, "Filing Deadline", Get(isf, "filingDeadline", "24 hours before vessel loading at UAE port"));
            y = AddField(sb, y, "Missing Fields", Get(isf, "missingFields", "None detected"));
            y = AddField(sb, y, "Validation Summary", Get(isf, "validationSummary", "Pending agent validation"));

            // Footer
            y -= 15;
            HRule(sb, y); y -= 10;
            AddTxt(sb, 50, y, "F1", 7,
                "Odyssey Logistics TradeX ISF Automation  |  This is a DRAFT document for compliance review only."); y -= 9;
            AddTxt(sb, 50, y, "F1", 7,
                $"ISF 10+2 must be filed with U.S. CBP via ACE at least 24 hours before vessel departure.  |  Doc Ref: {ts}");

            sb.Append("ET\r\n");
            return sb.ToString();
        }

        // ── PDF Helpers ───────────────────────────────────────────────────────────

        private int AddTxt(StringBuilder sb, int x, int y, string font, int size, string text)
        {
            sb.Append($"/{font} {size} Tf\r\n1 0 0 1 {x} {y} Tm\r\n({Esc(text)}) Tj\r\n");
            return y;
        }

        private void HRule(StringBuilder sb, int y)
            => sb.Append($"ET\r\n0.5 w\r\n50 {y} m 560 {y} l S\r\nBT\r\n");

        private int SectionHdr(StringBuilder sb, int y, string title)
        {
            y -= 10;
            AddTxt(sb, 50, y, "F2", 10, title);
            y -= 4; HRule(sb, y); y -= 3;
            return y;
        }

        private int AddField(StringBuilder sb, int y, string label, string value)
        {
            y -= 13;
            if (y < 60) return y;
            string val = (value?.Length ?? 0) > 85 ? value.Substring(0, 82) + "..." : (value ?? "-");
            AddTxt(sb, 50, y, "F2", 8, label + ":");
            AddTxt(sb, 190, y, "F1", 8, val);
            return y;
        }

        // ── Data Helpers ──────────────────────────────────────────────────────────

        private string Join(Dictionary<string, string> d, string k1, string k2)
            => Get(d, k1) + "  |  " + Get(d, k2);

        private string Get(Dictionary<string, string> d, string key, string def = "-")
            => d.TryGetValue(key, out string v) && !string.IsNullOrWhiteSpace(v) ? v : def;

        private string Esc(string s)
        {
            if (string.IsNullOrEmpty(s)) return "";
            var sb = new StringBuilder(s.Length + 4);
            foreach (char c in s)
            {
                if (c == '\\') sb.Append("\\\\");
                else if (c == '(') sb.Append("\\(");
                else if (c == ')') sb.Append("\\)");
                else if (c < 32 || c > 126) sb.Append('?');
                else sb.Append(c);
            }
            return sb.ToString();
        }

        private Dictionary<string, string> ParseIsfJson(string json)
        {
            var d = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            if (string.IsNullOrWhiteSpace(json)) return d;
            try
            {
                using var doc = JsonDocument.Parse(json);
                foreach (var p in doc.RootElement.EnumerateObject())
                    d[p.Name] = p.Value.ValueKind == JsonValueKind.String
                        ? p.Value.GetString() ?? ""
                        : p.Value.GetRawText();
            }
            catch { }
            return d;
        }
    }
}
