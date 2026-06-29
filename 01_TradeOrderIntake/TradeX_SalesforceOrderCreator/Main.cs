#nullable enable
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using UiPath.CodedWorkflows;
using UiPath.IntegrationService.Activities.Runtime.CodedWorkflows;
using UiPath.IntegrationService.Activities.Runtime.Models;
using UiPath.IntegrationService.Activities.Runtime.Models.ConnectorMetadata;

namespace TradeX_SalesforceOrderCreator
{
    public class SalesforceOrderCreatorWorkflow : CodedWorkflow
    {
        private static readonly string[] RequiredFields = new[]
        {
            "ImporterOfRecord", "Shipper", "Consignee", "NotifyParty", "CountryOfOrigin",
            "HTSCode", "GoodsDescription", "Quantity", "UnitValue_USD", "TotalValue_USD",
            "Currency", "Incoterms", "PortOfLoading", "PortOfDischarge", "VesselOrFlightNumber",
            "BillOfLadingOrAWBNumber", "InvoiceNumber", "InvoiceDate", "ManufacturerName",
            "ManufacturerAddress", "GrossWeight_KG", "PackageCount"
        };

        [Workflow]
        public (string out_OrderId, string out_OrderNumber, bool out_PO_HasAllDetails,
                string out_MissingFields) Execute(string in_FieldsJson,
                string in_EmailId = "",
                string in_AttachmentNamesJson = "[]",
                string in_AttachmentBucketPathsJson = "[]")
        {
            Log("TradeX_SalesforceOrderCreator: creating Order from fields JSON");

            // Parse the 22-field JSON from the agent's extraction
            Dictionary<string, string> fields;
            try
            {
                fields = JsonSerializer.Deserialize<Dictionary<string, string>>(in_FieldsJson)
                    ?? new Dictionary<string, string>();
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException($"Invalid in_FieldsJson — expected JSON object: {ex.Message}");
            }

            // Validate the 22 CBP-required fields
            var missing = RequiredFields
                .Where(f => !fields.TryGetValue(f, out var v) || string.IsNullOrWhiteSpace(v))
                .ToList();
            bool hasAllDetails = missing.Count == 0;
            string missingJson = JsonSerializer.Serialize(missing);

            Log($"Validation: {(hasAllDetails ? "All 22 fields present" : $"Missing {missing.Count} fields: {string.Join(", ", missing.Take(5))}")}");

            var sf = new ISConnections(services.Container).Salesforce.TradeXSalesforce;

            // Resolve AccountId — Orders require an Account association
            string accountId = ResolveAccountId(sf, Get(fields, "ImporterOfRecord"));

            // Create Salesforce Order
            var createConfig = new CodedConnectorConfiguration(
                sf, "Order", Operation.Create, "POST", "/Order", ActivityType.Generic);
            var createRequest = new ConnectorRequest
            {
                BodyParameters = new Dictionary<string, object?>
                {
                    ["AccountId"]     = accountId,
                    ["Status"]        = "Draft",
                    ["EffectiveDate"] = DateTime.UtcNow.ToString("yyyy-MM-dd"),
                    ["Description"]   = in_FieldsJson
                }
            };

            var createResponse = sf.ExecuteAsync(createConfig, createRequest).GetAwaiter().GetResult();
            var createOutput = createResponse?.Output;

            if (createOutput == null)
                throw new InvalidOperationException("Salesforce Order creation returned null output");

            Log($"Order create output keys: {string.Join(", ", createOutput.Keys)}");

            string orderId = string.Empty;
            foreach (string k in new[] { "id", "Id", "ID" })
            {
                if (createOutput.TryGetValue(k, out var v) && v != null)
                {
                    orderId = v.ToString() ?? string.Empty;
                    if (!string.IsNullOrWhiteSpace(orderId)) break;
                }
            }

            if (string.IsNullOrWhiteSpace(orderId))
                throw new InvalidOperationException($"Salesforce Order creation returned no ID. Keys: {string.Join(", ", createOutput.Keys)}");

            Log($"Salesforce Order created: {orderId}");

            // Retrieve OrderNumber via SOQL
            string orderNumber = orderId;
            try
            {
                var queryConfig = new CodedConnectorConfiguration(
                    sf, "curated_soqlQuery", Operation.Create, "POST", "/curated_soqlQuery",
                    ActivityType.Curated);
                var queryRequest = new ConnectorRequest
                {
                    BodyParameters = new Dictionary<string, object?>
                    {
                        ["query"] = $"SELECT OrderNumber FROM Order WHERE Id = '{orderId}' LIMIT 1"
                    }
                };
                var queryResponse = sf.ExecuteAsync(queryConfig, queryRequest).GetAwaiter().GetResult();
                var items = queryResponse?.Items;
                if (items != null && items.Count > 0)
                    orderNumber = GetStr(items[0], "OrderNumber", orderId);
            }
            catch (Exception ex)
            {
                Log($"Warning: could not retrieve OrderNumber, using ID as fallback: {ex.Message}");
            }

            // ── DataFabric entity initialization (robot-authenticated, no manual token) ──
            InitializeDataFabric(orderNumber, fields, in_FieldsJson, in_AttachmentNamesJson, in_AttachmentBucketPathsJson, in_EmailId);

            Log($"Complete. OrderId={orderId}, OrderNumber={orderNumber}, HasAllDetails={hasAllDetails}");
            return (orderId, orderNumber, hasAllDetails, missingJson);
        }

        private string ResolveAccountId(ConnectorConnection sf, string importerOfRecord)
        {
            string accountName = string.IsNullOrWhiteSpace(importerOfRecord)
                ? "TradeX Default Account"
                : importerOfRecord;

            // Step 1: Create Account (idempotent — if it already exists Salesforce rejects with DUPLICATE_VALUE;
            // either way we get the ID from this call or from the SOQL that follows)
            try
            {
                var cc = new CodedConnectorConfiguration(sf, "Account", Operation.Create, "POST", "/Account", ActivityType.Generic);
                var cr = new ConnectorRequest { BodyParameters = new Dictionary<string, object?> { ["Name"] = accountName } };
                var cresp = sf.ExecuteAsync(cc, cr).GetAwaiter().GetResult();
                Log($"Account create output keys: {string.Join(", ", cresp?.Output?.Keys ?? Enumerable.Empty<string>())}");
                if (cresp?.Output != null)
                {
                    foreach (string k in new[] { "id", "Id", "ID" })
                    {
                        if (cresp.Output.TryGetValue(k, out var v) && v != null)
                        {
                            string sid = v.ToString() ?? string.Empty;
                            if (!string.IsNullOrWhiteSpace(sid)) { Log($"Auto-created Account '{accountName}': {sid}"); return sid; }
                        }
                    }
                }
                Log("Account created but ID not in output — will query by name");
            }
            catch (Exception ex) { Log($"Account create attempt: {ex.Message}"); }

            // Step 2: SOQL lookup — works when Account exists (Items returns >=1 records);
            // curated_soqlQuery throws JArray error only when result set is empty
            try
            {
                string safeName = accountName.Replace("'", "\\'");
                var qc = new CodedConnectorConfiguration(sf, "curated_soqlQuery", Operation.Create, "POST", "/curated_soqlQuery", ActivityType.Curated);
                var qr = new ConnectorRequest { BodyParameters = new Dictionary<string, object?> { ["query"] = $"SELECT Id FROM Account WHERE Name = '{safeName}' LIMIT 1" } };
                var qresp = sf.ExecuteAsync(qc, qr).GetAwaiter().GetResult();
                if (qresp?.Items != null && qresp.Items.Count > 0)
                {
                    string id = GetStr(qresp.Items[0], "Id");
                    if (string.IsNullOrWhiteSpace(id)) id = GetStr(qresp.Items[0], "id");
                    if (!string.IsNullOrWhiteSpace(id)) { Log($"AccountId resolved by SOQL: {id}"); return id; }
                }
            }
            catch (Exception ex) { Log($"Account SOQL lookup: {ex.Message}"); }

            // Step 3: Any account in org
            try
            {
                var qc = new CodedConnectorConfiguration(sf, "curated_soqlQuery", Operation.Create, "POST", "/curated_soqlQuery", ActivityType.Curated);
                var qr = new ConnectorRequest { BodyParameters = new Dictionary<string, object?> { ["query"] = "SELECT Id, Name FROM Account LIMIT 1" } };
                var qresp = sf.ExecuteAsync(qc, qr).GetAwaiter().GetResult();
                if (qresp?.Items != null && qresp.Items.Count > 0)
                {
                    string id = GetStr(qresp.Items[0], "Id");
                    if (string.IsNullOrWhiteSpace(id)) id = GetStr(qresp.Items[0], "id");
                    Log($"AccountId any-account fallback: {id}");
                    return id;
                }
            }
            catch (Exception ex) { Log($"Account any-account lookup: {ex.Message}"); }

            throw new InvalidOperationException(
                $"Could not resolve AccountId for '{accountName}'. Check IS connection permissions for Account object.");
        }

        private void InitializeDataFabric(string orderNumber, Dictionary<string, string> fields,
            string fieldsJson, string attachmentNamesJson, string attachmentBucketPathsJson, string emailId)
        {
            // Build the helper using the robot's own Orchestrator session — no token needed.
            // Authentication is handled by services.OrchestratorClientService internally.
            DataFabricHelper? df;
            try
            {
                string? orchUrl = null;
                try { orchUrl = system.GetAsset("TRADEX_ORCHESTRATOR_URL") as string; } catch { }
                df = DataFabricHelper.CreateAsync(services, orchUrl).GetAwaiter().GetResult();
            }
            catch (Exception ex)
            {
                Log($"DataFabric: could not initialize client (non-blocking): {ex.Message}");
                return;
            }

            if (df == null)
            {
                Log("DataFabric: could not resolve Orchestrator URL — DF init skipped");
                return;
            }

            string jobId = Environment.GetEnvironmentVariable("UIPATH_JOB_ID") ?? emailId;

            TryWrite("ImportCaseRecord",    () => df.CreateImportCaseRecord(orderNumber, fields));
            TryWrite("AuditEntry",          () => df.CreateAuditEntry(orderNumber, fieldsJson, jobId));
            TryWrite("IsfFilingRecord",     () => df.CreateIsfFilingRecord(orderNumber, fields));
            TryWrite("DutyCalculation",     () => df.CreateDutyCalculation(orderNumber, fields));
            TryWrite("OfacScreeningRecord", () => df.CreateOfacScreeningRecords(orderNumber, fields));
            TryWrite("HumanTaskRecord",     () => df.CreateHumanTaskRecord(orderNumber));

            // Prefer actual bucket paths (from GmailReader upload); fall back to name-only list
            try
            {
                var bucketPaths = JsonSerializer.Deserialize<List<string>>(attachmentBucketPathsJson)
                                  ?? new List<string>();
                var attachNames = JsonSerializer.Deserialize<List<string>>(attachmentNamesJson)
                                  ?? new List<string>();

                // Use bucket paths when available — these are the real uploaded file references
                var docsToRecord = bucketPaths.Count > 0
                    ? bucketPaths  // e.g. "{emailId}/invoice.pdf"
                    : attachNames; // fallback: just names (file not uploaded)

                Log($"DataFabric: creating {docsToRecord.Count} ShipmentDocument record(s) (from bucket={bucketPaths.Count > 0})");
                foreach (string path in docsToRecord.Where(f => !string.IsNullOrWhiteSpace(f)))
                {
                    string fileName = System.IO.Path.GetFileName(path);
                    TryWrite($"ShipmentDocument({fileName})", () => df.CreateShipmentDocument(orderNumber, path));
                }
            }
            catch (Exception ex) { Log($"DataFabric: ShipmentDocuments parse failed: {ex.Message}"); }

            Log($"DataFabric: entity initialization complete for case {orderNumber}");
        }

        private void TryWrite(string entityName, Action write)
        {
            try
            {
                Log($"DataFabric: creating {entityName}");
                write();
            }
            catch (Exception ex)
            {
                Log($"DataFabric: {entityName} failed (non-blocking): {ex.Message}");
            }
        }

        private static string Get(Dictionary<string, string> d, string key)
            => d.TryGetValue(key, out var v) ? v ?? string.Empty : string.Empty;

        private static string GetStr(IReadOnlyDictionary<string, object?> dict, string key, string fallback = "")
            => dict.TryGetValue(key, out var v) ? v?.ToString() ?? fallback : fallback;
    }
}
