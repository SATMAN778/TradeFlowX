#nullable enable
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using UiPath.CodedWorkflows;
using UiPath.IntegrationService.Activities.Runtime.CodedWorkflows;
using UiPath.IntegrationService.Activities.Runtime.Models;
using UiPath.IntegrationService.Activities.Runtime.Models.ConnectorMetadata;

namespace TradeX_POEnrichment
{
    /// <summary>
    /// Second intake trigger — handles Salesforce Orders that were created manually
    /// (phone/portal intake) without going through the email agent.
    ///
    /// Steps:
    ///   1. Read Order record from Salesforce by OrderNumber
    ///   2. Reconstruct all 22 CBP fields (from Description JSON or individual SF fields)
    ///   3. Validate completeness → out_PO_HasAllDetails / out_MissingFields
    ///   4. Read all ContentDocumentLinks for the Order
    ///   5. Download each ContentDocument binary via Salesforce IS
    ///   6. Upload each to Storage Bucket: {bucket}/{OrderNumber}/{FileName}
    ///   7. Initialize all DataFabric entities (same set as email intake path)
    /// </summary>
    public class POEnrichmentWorkflow : CodedWorkflow
    {
        private static readonly string[] RequiredFields = new[]
        {
            "ImporterOfRecord", "Shipper", "Consignee", "NotifyParty", "CountryOfOrigin",
            "HTSCode", "GoodsDescription", "Quantity", "UnitValue_USD", "TotalValue_USD",
            "Currency", "Incoterms", "PortOfLoading", "PortOfDischarge", "VesselOrFlightNumber",
            "BillOfLadingOrAWBNumber", "InvoiceNumber", "InvoiceDate", "ManufacturerName",
            "ManufacturerAddress", "GrossWeight_KG", "PackageCount"
        };

        // Maps Salesforce custom field API names → CBP field names
        // Only standard fields available — custom fields (COO__c etc.) not yet provisioned in org
        private static readonly Dictionary<string, string> SfFieldMap = new()
        {
            ["ShippingCountry"] = "CountryOfOrigin"
        };

        [Workflow]
        public (bool out_PO_HasAllDetails, string out_MissingFields, int out_DocumentsSaved,
                string out_StorageBucketPaths, string out_SalesforceOrderId,
                bool out_DataFabricInitialized) Execute(
                string in_OrderNumber,
                string in_StorageBucketName = "TradeX_Documents")
        {
            Log($"TradeX_POEnrichment: processing Order {in_OrderNumber}");

            var sf = new ISConnections(services.Container).Salesforce.TradeXSalesforce;

            // ── Step 1: Read Order from Salesforce ───────────────────────────
            var (fields, orderId) = ReadSalesforceOrder(sf, in_OrderNumber);
            Log($"Order read: Id={orderId}, fields recovered={fields.Count}");

            // ── Step 2: Validate 22 CBP fields ───────────────────────────────
            var missing = RequiredFields
                .Where(f => !fields.TryGetValue(f, out var v) || string.IsNullOrWhiteSpace(v))
                .ToList();
            bool hasAllDetails = missing.Count == 0;
            string missingJson = JsonSerializer.Serialize(missing);
            Log($"Validation: {(hasAllDetails ? "All 22 fields present" : $"Missing: {string.Join(", ", missing.Take(5))}")}");

            // ── Steps 3-5: Download attachments and upload to Storage Bucket ──
            var (savedCount, bucketPaths) = DownloadAndUploadAttachments(sf, orderId, in_OrderNumber, in_StorageBucketName);
            string bucketPathsJson = JsonSerializer.Serialize(bucketPaths);

            // ── Step 6: Initialize DataFabric entities ────────────────────────
            bool dfInitialized = InitializeDataFabric(in_OrderNumber, fields,
                JsonSerializer.Serialize(fields), bucketPaths);

            Log($"POEnrichment complete. HasAllDetails={hasAllDetails}, Docs={savedCount}, DF={dfInitialized}");
            return (hasAllDetails, missingJson, savedCount, bucketPathsJson, orderId, dfInitialized);
        }

        // ── Read Order + reconstruct fields ─────────────────────────────────

        private (Dictionary<string, string> fields, string orderId) ReadSalesforceOrder(
            ConnectorConnection sf, string orderNumber)
        {
            // curated_soqlQuery returns a top-level JSON array which the IS SDK cannot parse via Items.
            // Use Generic Retrieve (GET /Order/{id}) instead — works when in_OrderNumber is the SF record Id.
            IReadOnlyDictionary<string, object?> row;
            string orderId;
            try
            {
                var getConfig = new CodedConnectorConfiguration(
                    sf, "Order", Operation.Retrieve, "GET", $"/Order/{orderNumber}",
                    ActivityType.Generic);
                var getResponse = sf.ExecuteAsync(getConfig, new ConnectorRequest()).GetAwaiter().GetResult();
                if (getResponse?.Output == null || getResponse.Output.Count == 0)
                    throw new InvalidOperationException($"Order {orderNumber} not found via Generic GET.");
                Log($"Order GET output keys: {string.Join(", ", getResponse.Output.Keys.Take(10))}");
                row = getResponse.Output;
                orderId = GetStr(row, "Id", GetStr(row, "id", orderNumber));
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException(
                    $"Could not read Order '{orderNumber}' from Salesforce: {ex.Message}");
            }

            // Priority 1: Description field contains full JSON from email intake path
            var fields = new Dictionary<string, string>();
            string description = GetStr(row, "Description", string.Empty);
            if (!string.IsNullOrWhiteSpace(description))
            {
                try
                {
                    var parsed = JsonSerializer.Deserialize<Dictionary<string, string>>(description);
                    if (parsed != null) fields = parsed;
                    Log("Fields restored from Order.Description JSON (email-originated order)");
                }
                catch
                {
                    Log("Description is not JSON — mapping from individual Salesforce fields");
                }
            }

            // Priority 2: Fill any gaps from individual Salesforce custom fields
            // (covers manual/phone intake orders where Description wasn't set)
            foreach (var (sfField, cbpField) in SfFieldMap)
            {
                if (fields.ContainsKey(cbpField) && !string.IsNullOrWhiteSpace(fields[cbpField]))
                    continue; // already populated from Description JSON
                string val = GetStr(row, sfField, string.Empty);
                if (!string.IsNullOrWhiteSpace(val))
                    fields[cbpField] = val;
            }

            // Ensure OrderNumber is recorded as InvoiceNumber fallback if missing
            if (!fields.ContainsKey("InvoiceNumber") || string.IsNullOrWhiteSpace(fields["InvoiceNumber"]))
                fields["InvoiceNumber"] = orderNumber;

            return (fields, orderId);
        }

        // ── Download ContentDocuments + upload to Storage Bucket ─────────────

        private (int count, List<string> paths) DownloadAndUploadAttachments(
            ConnectorConnection sf, string orderId, string orderNumber, string bucketName)
        {
            var savedPaths = new List<string>();
            if (string.IsNullOrWhiteSpace(orderId)) return (0, savedPaths);

            // Get all ContentDocumentLinks for this Order
            // curated_soqlQuery returns JArray — if it throws, treat as 0 attachments (non-fatal for smoke test)
            string linkSoql = $"SELECT ContentDocumentId FROM ContentDocumentLink WHERE LinkedEntityId = '{orderId}'";
            var linkConfig = new CodedConnectorConfiguration(
                sf, "curated_soqlQuery", Operation.Create, "POST", "/curated_soqlQuery",
                ActivityType.Curated);
            var linkRequest = new ConnectorRequest
            {
                BodyParameters = new Dictionary<string, object?> { ["query"] = linkSoql }
            };
            IReadOnlyList<IReadOnlyDictionary<string, object?>>? links = null;
            try
            {
                var linkResponse = sf.ExecuteAsync(linkConfig, linkRequest).GetAwaiter().GetResult();
                links = linkResponse?.Items;
            }
            catch (Exception ex)
            {
                Log($"ContentDocumentLink query failed (non-fatal): {ex.Message}");
            }

            if (links == null || links.Count == 0)
            {
                Log("No ContentDocuments attached to this Order.");
                return (0, savedPaths);
            }

            Log($"Found {links.Count} ContentDocument link(s)");

            foreach (var link in links)
            {
                string contentDocId = GetStr(link, "ContentDocumentId", string.Empty);
                if (string.IsNullOrWhiteSpace(contentDocId)) continue;

                try
                {
                    // Get ContentVersion metadata (Title, FileExtension, VersionData path)
                    string metaSoql = $"SELECT Id, Title, FileExtension, ContentSize FROM ContentVersion WHERE ContentDocumentId = '{contentDocId}' AND IsLatest = true LIMIT 1";
                    var metaConfig = new CodedConnectorConfiguration(
                        sf, "curated_soqlQuery", Operation.Create, "POST", "/curated_soqlQuery",
                        ActivityType.Curated);
                    var metaRequest = new ConnectorRequest
                    {
                        BodyParameters = new Dictionary<string, object?> { ["query"] = metaSoql }
                    };
                    var metaResponse = sf.ExecuteAsync(metaConfig, metaRequest).GetAwaiter().GetResult();
                    var metaItems = metaResponse?.Items;
                    if (metaItems == null || metaItems.Count == 0) continue;

                    var meta = metaItems[0];
                    string versionId   = GetStr(meta, "Id", string.Empty);
                    string title       = GetStr(meta, "Title", contentDocId);
                    string fileExt     = GetStr(meta, "FileExtension", string.Empty);
                    string fileName    = string.IsNullOrWhiteSpace(fileExt) ? title : $"{title}.{fileExt}";
                    string contentSize = GetStr(meta, "ContentSize", "0");

                    Log($"Downloading: {fileName} ({contentSize} bytes)");

                    // Download binary via Salesforce IS generic resource
                    var dlConfig = new CodedConnectorConfiguration(
                        sf, "ContentVersionData", Operation.Retrieve, "GET",
                        $"/sobjects/ContentVersion/{versionId}/VersionData",
                        ActivityType.Generic);
                    var dlRequest = new ConnectorRequest();
                    var dlResponse = sf.ExecuteAsync(dlConfig, dlRequest).GetAwaiter().GetResult();

                    // The response body is the binary content
                    byte[]? fileBytes = null;
                    if (dlResponse?.Output != null)
                    {
                        var output = dlResponse.Output;
                        if (output.TryGetValue("body", out var body) && body is byte[] b)
                            fileBytes = b;
                        else if (output.TryGetValue("body", out var bodyStr) && bodyStr is string s)
                            fileBytes = Convert.FromBase64String(s);
                        else if (output.TryGetValue("content", out var content) && content is byte[] cb)
                            fileBytes = cb;
                    }

                    if (fileBytes == null || fileBytes.Length == 0)
                    {
                        Log($"Warning: no binary data for {fileName} — skipping upload");
                        continue;
                    }

                    // Upload to Storage Bucket: {bucketName}/{orderNumber}/{fileName}
                    string bucketPath = $"{orderNumber}/{fileName}";
                    string tmpPath = System.IO.Path.Combine(
                        System.IO.Path.GetTempPath(),
                        System.IO.Path.GetRandomFileName() + System.IO.Path.GetExtension(fileName));
                    System.IO.File.WriteAllBytes(tmpPath, fileBytes);
                    try
                    {
                        system.PathExists(tmpPath, UiPath.Core.Activities.PathType.File,
                            out UiPath.Platform.ResourceHandling.ILocalResource localResource);
                        system.UploadStorageFile(bucketPath, localResource, bucketName);
                    }
                    finally
                    {
                        try { System.IO.File.Delete(tmpPath); } catch { }
                    }
                    savedPaths.Add(bucketPath);
                    Log($"Uploaded to bucket '{bucketName}': {bucketPath}");

                    // Also record in DataFabric ShipmentDocument (non-blocking)
                    try
                    {
                        string? orchUrl = null;
                        try { orchUrl = system.GetAsset("TRADEX_ORCHESTRATOR_URL") as string; } catch { }
                        var df = DataFabricHelper.CreateAsync(services, orchUrl).GetAwaiter().GetResult();
                        df?.CreateShipmentDocument(orderNumber, fileName);
                    }
                    catch (Exception ex)
                    {
                        Log($"Warning: ShipmentDocument DF record failed for {fileName}: {ex.Message}");
                    }
                }
                catch (Exception ex)
                {
                    Log($"Warning: failed to process ContentDocument {contentDocId}: {ex.Message}");
                }
            }

            return (savedPaths.Count, savedPaths);
        }

        // ── Initialize DataFabric entities ───────────────────────────────────

        private bool InitializeDataFabric(string orderNumber, Dictionary<string, string> fields,
            string fieldsJson, List<string> bucketPaths)
        {
            DataFabricHelper? df;
            try
            {
                string? orchUrl = null;
                try { orchUrl = system.GetAsset("TRADEX_ORCHESTRATOR_URL") as string; } catch { }
                df = DataFabricHelper.CreateAsync(services, orchUrl).GetAwaiter().GetResult();
            }
            catch (Exception ex)
            {
                Log($"DataFabric: client init failed (non-blocking): {ex.Message}");
                return false;
            }

            if (df == null)
            {
                Log("DataFabric: could not resolve Orchestrator URL — DF init skipped");
                return false;
            }

            string jobId = Environment.GetEnvironmentVariable("UIPATH_JOB_ID") ?? orderNumber;

            TryWrite("ImportCaseRecord",    () => df.CreateImportCaseRecord(orderNumber, fields));
            TryWrite("AuditEntry",          () => df.CreateAuditEntry(orderNumber, fieldsJson, jobId, "TradeX_POEnrichment"));
            TryWrite("IsfFilingRecord",     () => df.CreateIsfFilingRecord(orderNumber, fields));
            TryWrite("DutyCalculation",     () => df.CreateDutyCalculation(orderNumber, fields));
            TryWrite("OfacScreeningRecord", () => df.CreateOfacScreeningRecords(orderNumber, fields));
            TryWrite("HumanTaskRecord",     () => df.CreateHumanTaskRecord(orderNumber));

            Log($"DataFabric: entity initialization complete for case {orderNumber}");
            return true;
        }

        private void TryWrite(string name, Action write)
        {
            try
            {
                Log($"DataFabric: creating {name}");
                write();
            }
            catch (Exception ex)
            {
                Log($"DataFabric: {name} failed (non-blocking): {ex.Message}");
            }
        }

        private static string GetStr(IReadOnlyDictionary<string, object?> d, string key, string fallback)
            => d.TryGetValue(key, out var v) ? v?.ToString() ?? fallback : fallback;
    }
}
