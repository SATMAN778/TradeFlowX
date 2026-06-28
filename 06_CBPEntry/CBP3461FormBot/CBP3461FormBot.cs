using System;
using System.IO;
using System.Text;
using UiPath.CodedWorkflows;

namespace CBP3461FormBot
{
    /// <summary>
    /// CBP Form 3461 — Entry / Immediate Delivery form generator.
    /// HACKATHON MODE: Generates a pre-filled HTML document that mirrors the real CBP Form 3461 layout.
    /// Production upgrade path: replace the HTML writer with iText7 / PdfSharp to produce a true PDF,
    /// and replace the entry-number stub with a real ACE portal submission via the CBP ABI API.
    /// </summary>
    public class CBP3461FormBot : CodedWorkflow
    {
        [Workflow]
        public (string entryNumber, string formFilePath)
        Execute(
            string poNumber,
            string portOfEntry,
            string goodsDescription,
            string htsCode,
            double totalValueUsd,
            double dutyRatePct,
            double estimatedDutyUsd,
            string blNumber,
            string supplierName,
            string supplierCountry,
            string consigneeName = "TradeX Import Co.",
            string consigneeAddress = "123 Commerce Blvd, New York, NY 10001",
            string entryType = "01",
            string importerEIN = "47-1234567",
            string vesselName = "MV TRADE STAR",
            string countryOfOrigin = ""
        )
        {
            // Derive country of origin fallback
            if (string.IsNullOrWhiteSpace(countryOfOrigin))
                countryOfOrigin = supplierCountry;

            // Generate a deterministic hackathon entry number
            string entryDate = DateTime.UtcNow.ToString("yyyyMMdd");
            string entryNumber = $"CBP-{portOfEntry.ToUpper()}-{poNumber}-{entryDate}";

            Log($"[3461Bot] Generating CBP Form 3461 | Entry: {entryNumber}");

            // Build output directory — use temp so it's writable on any robot/serverless host
            string outputDir = Path.Combine(
                Path.GetTempPath(), "uipath_cbp_forms");
            Directory.CreateDirectory(outputDir);

            string safeEntry = entryNumber.Replace("/", "-").Replace("\\", "-").Replace(":", "-");
            string filePath = Path.Combine(outputDir, $"CBP_3461_{safeEntry}.html");

            // Write the HTML form
            string html = BuildForm3461Html(
                entryNumber, entryType, portOfEntry, entryDate,
                poNumber, blNumber, vesselName,
                supplierName, supplierCountry, countryOfOrigin,
                consigneeName, consigneeAddress, importerEIN,
                goodsDescription, htsCode,
                totalValueUsd, dutyRatePct, estimatedDutyUsd
            );

            File.WriteAllText(filePath, html, Encoding.UTF8);

            Log($"[3461Bot] Form saved to: {filePath}");
            Log($"[3461Bot] Entry Number: {entryNumber}");

            return (entryNumber: entryNumber, formFilePath: filePath);
        }

        private static string BuildForm3461Html(
            string entryNumber, string entryType, string portOfEntry, string entryDate,
            string poNumber, string blNumber, string vesselName,
            string supplierName, string supplierCountry, string countryOfOrigin,
            string consigneeName, string consigneeAddress, string importerEIN,
            string goodsDescription, string htsCode,
            double totalValueUsd, double dutyRatePct, double estimatedDutyUsd)
        {
            var sb = new StringBuilder();

            sb.AppendLine("<!DOCTYPE html>");
            sb.AppendLine("<html lang='en'>");
            sb.AppendLine("<head>");
            sb.AppendLine("  <meta charset='UTF-8'>");
            sb.AppendLine("  <meta name='viewport' content='width=device-width, initial-scale=1.0'>");
            sb.AppendLine("  <title>CBP Form 3461 - Entry/Immediate Delivery</title>");
            sb.AppendLine("  <style>");
            sb.AppendLine("    body { font-family: Arial, sans-serif; font-size: 11px; margin: 20px; color: #000; }");
            sb.AppendLine("    .form-header { text-align: center; border: 2px solid #000; padding: 8px; margin-bottom: 10px; }");
            sb.AppendLine("    .form-header h1 { font-size: 14px; margin: 0; }");
            sb.AppendLine("    .form-header h2 { font-size: 12px; margin: 2px 0; }");
            sb.AppendLine("    .hackathon-banner { background: #ffcc00; border: 2px solid #cc0000; padding: 5px; text-align: center; font-weight: bold; font-size: 12px; margin-bottom: 10px; }");
            sb.AppendLine("    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }");
            sb.AppendLine("    td, th { border: 1px solid #000; padding: 4px 6px; vertical-align: top; }");
            sb.AppendLine("    .label { font-size: 9px; color: #555; display: block; }");
            sb.AppendLine("    .value { font-size: 12px; font-weight: bold; }");
            sb.AppendLine("    .section-header { background: #ddd; font-weight: bold; font-size: 11px; }");
            sb.AppendLine("    .w25 { width: 25%; } .w33 { width: 33%; } .w50 { width: 50%; } .w66 { width: 66%; }");
            sb.AppendLine("    .footer { margin-top: 15px; font-size: 10px; border-top: 1px solid #000; padding-top: 8px; }");
            sb.AppendLine("    .signature-box { border: 1px solid #000; height: 40px; margin: 5px 0; }");
            sb.AppendLine("  </style>");
            sb.AppendLine("</head>");
            sb.AppendLine("<body>");

            // Hackathon banner
            sb.AppendLine("  <div class='hackathon-banner'>⚠ HACKATHON DEMO — CBP FORM 3461 DRAFT — NOT FOR OFFICIAL SUBMISSION ⚠</div>");

            // Form header
            sb.AppendLine("  <div class='form-header'>");
            sb.AppendLine("    <h1>U.S. CUSTOMS AND BORDER PROTECTION</h1>");
            sb.AppendLine("    <h2>ENTRY / IMMEDIATE DELIVERY — CBP FORM 3461</h2>");
            sb.AppendLine("    <p style='font-size:10px; margin:2px 0;'>19 CFR 142.21 &bull; OMB No. 1651-0024</p>");
            sb.AppendLine("  </div>");

            // Block 1: Entry Info
            sb.AppendLine("  <table>");
            sb.AppendLine("    <tr class='section-header'><td colspan='4'>SECTION 1 — ENTRY INFORMATION</td></tr>");
            sb.AppendLine("    <tr>");
            sb.AppendLine($"      <td class='w25'><span class='label'>1. ENTRY NUMBER</span><span class='value'>{entryNumber}</span></td>");
            sb.AppendLine($"      <td class='w25'><span class='label'>2. ENTRY TYPE</span><span class='value'>{entryType} — Consumption</span></td>");
            sb.AppendLine($"      <td class='w25'><span class='label'>3. PORT OF ENTRY</span><span class='value'>{portOfEntry.ToUpper()}</span></td>");
            sb.AppendLine($"      <td class='w25'><span class='label'>4. ENTRY DATE</span><span class='value'>{DateTime.UtcNow:MM/dd/yyyy}</span></td>");
            sb.AppendLine("    </tr>");
            sb.AppendLine("    <tr>");
            sb.AppendLine($"      <td colspan='2'><span class='label'>5. BOND TYPE / NUMBER</span><span class='value'>Single Entry / {poNumber}-BOND</span></td>");
            sb.AppendLine($"      <td colspan='2'><span class='label'>6. IMPORT DATE</span><span class='value'>{DateTime.UtcNow:MM/dd/yyyy}</span></td>");
            sb.AppendLine("    </tr>");
            sb.AppendLine("  </table>");

            // Block 2: Importer / Consignee
            sb.AppendLine("  <table>");
            sb.AppendLine("    <tr class='section-header'><td colspan='3'>SECTION 2 — IMPORTER / CONSIGNEE</td></tr>");
            sb.AppendLine("    <tr>");
            sb.AppendLine($"      <td class='w33'><span class='label'>7. IMPORTER OF RECORD NAME</span><span class='value'>{consigneeName}</span></td>");
            sb.AppendLine($"      <td class='w33'><span class='label'>8. IMPORTER EIN/IRS#</span><span class='value'>{importerEIN}</span></td>");
            sb.AppendLine($"      <td class='w33'><span class='label'>9. ENTRY FILER CODE</span><span class='value'>TRX</span></td>");
            sb.AppendLine("    </tr>");
            sb.AppendLine("    <tr>");
            sb.AppendLine($"      <td colspan='3'><span class='label'>10. CONSIGNEE ADDRESS</span><span class='value'>{consigneeAddress}</span></td>");
            sb.AppendLine("    </tr>");
            sb.AppendLine("  </table>");

            // Block 3: Exporter / Supplier
            sb.AppendLine("  <table>");
            sb.AppendLine("    <tr class='section-header'><td colspan='3'>SECTION 3 — EXPORTER / MANUFACTURER</td></tr>");
            sb.AppendLine("    <tr>");
            sb.AppendLine($"      <td class='w50'><span class='label'>11. EXPORTER NAME</span><span class='value'>{supplierName}</span></td>");
            sb.AppendLine($"      <td class='w25'><span class='label'>12. COUNTRY OF EXPORT</span><span class='value'>{supplierCountry.ToUpper()}</span></td>");
            sb.AppendLine($"      <td class='w25'><span class='label'>13. COUNTRY OF ORIGIN</span><span class='value'>{countryOfOrigin.ToUpper()}</span></td>");
            sb.AppendLine("    </tr>");
            sb.AppendLine("  </table>");

            // Block 4: Transport
            sb.AppendLine("  <table>");
            sb.AppendLine("    <tr class='section-header'><td colspan='4'>SECTION 4 — TRANSPORTATION</td></tr>");
            sb.AppendLine("    <tr>");
            sb.AppendLine($"      <td class='w25'><span class='label'>14. VESSEL / CARRIER</span><span class='value'>{vesselName}</span></td>");
            sb.AppendLine($"      <td class='w25'><span class='label'>15. B/L OR AWB NUMBER</span><span class='value'>{blNumber}</span></td>");
            sb.AppendLine($"      <td class='w25'><span class='label'>16. LOCATION OF GOODS</span><span class='value'>{portOfEntry.ToUpper()} PORT CFS</span></td>");
            sb.AppendLine($"      <td class='w25'><span class='label'>17. MANIFEST QTY</span><span class='value'>1 SHIPMENT</span></td>");
            sb.AppendLine("    </tr>");
            sb.AppendLine("  </table>");

            // Block 5: Merchandise
            sb.AppendLine("  <table>");
            sb.AppendLine("    <tr class='section-header'><td colspan='4'>SECTION 5 — MERCHANDISE DESCRIPTION</td></tr>");
            sb.AppendLine("    <tr>");
            sb.AppendLine($"      <td colspan='2'><span class='label'>18. DESCRIPTION OF MERCHANDISE</span><span class='value'>{goodsDescription}</span></td>");
            sb.AppendLine($"      <td><span class='label'>19. HTS NUMBER</span><span class='value'>{htsCode}</span></td>");
            sb.AppendLine($"      <td><span class='label'>20. DUTY RATE</span><span class='value'>{dutyRatePct:F2}%</span></td>");
            sb.AppendLine("    </tr>");
            sb.AppendLine("    <tr>");
            sb.AppendLine($"      <td class='w25'><span class='label'>21. ENTERED VALUE (USD)</span><span class='value'>${totalValueUsd:N2}</span></td>");
            sb.AppendLine($"      <td class='w25'><span class='label'>22. ESTIMATED DUTY (USD)</span><span class='value'>${estimatedDutyUsd:N2}</span></td>");
            sb.AppendLine($"      <td><span class='label'>23. PO / REFERENCE NUMBER</span><span class='value'>{poNumber}</span></td>");
            sb.AppendLine($"      <td><span class='label'>24. CURRENCY</span><span class='value'>USD</span></td>");
            sb.AppendLine("    </tr>");
            sb.AppendLine("  </table>");

            // Block 6: Declaration
            sb.AppendLine("  <table>");
            sb.AppendLine("    <tr class='section-header'><td colspan='2'>SECTION 6 — DECLARATION</td></tr>");
            sb.AppendLine("    <tr>");
            sb.AppendLine("      <td colspan='2' style='font-size:9px;'>I declare that the information on this form is true and accurate to the best of my knowledge and belief, that the merchandise was imported in accordance with applicable law and regulations, and that I am authorized to make this entry.</td>");
            sb.AppendLine("    </tr>");
            sb.AppendLine("    <tr>");
            sb.AppendLine("      <td class='w50'><span class='label'>SIGNATURE OF IMPORTER/BROKER</span><div class='signature-box'></div></td>");
            sb.AppendLine($"      <td class='w50'><span class='label'>DATE SIGNED</span><div class='signature-box' style='padding:10px;'>{DateTime.UtcNow:MM/dd/yyyy}</div></td>");
            sb.AppendLine("    </tr>");
            sb.AppendLine("  </table>");

            // Footer
            sb.AppendLine("  <div class='footer'>");
            sb.AppendLine($"    <p>Form generated: {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC | TradeX Import Operations Platform | Entry: {entryNumber}</p>");
            sb.AppendLine("    <p><strong>HACKATHON DEMO — This document is generated by the CBP3461FormBot RPA process for demonstration purposes only.</strong></p>");
            sb.AppendLine("    <p>Production implementation will: (1) submit via CBP ABI/ACE API to obtain a real entry number, (2) render to PDF using iText7.</p>");
            sb.AppendLine("  </div>");

            sb.AppendLine("</body>");
            sb.AppendLine("</html>");

            return sb.ToString();
        }
    }
}
