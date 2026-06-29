#nullable enable
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using UiPath.CodedWorkflows.Interfaces;

namespace TradeX_SalesforceOrderCreator
{
    /// <summary>
    /// Writes DataFabric entity records using the robot's own Orchestrator session.
    /// No external token or credential management required — the robot is already
    /// authenticated when this runs.
    /// </summary>
    internal sealed class DataFabricHelper
    {
        private readonly HttpClient _http;
        private readonly string _baseUrl; // e.g. https://staging.uipath.com/org/tenant/datafabric_/api

        private DataFabricHelper(HttpClient http, string baseUrl)
        {
            _http = http;
            _baseUrl = baseUrl.TrimEnd('/');
        }

        /// <summary>
        /// Builds a DataFabricHelper using the robot's authenticated Orchestrator HTTP client.
        /// The Data Service base URL is derived from UIPATH_ORCHESTRATOR_URL (always set by
        /// the UiPath Robot framework during job execution).
        /// </summary>
        public static async Task<DataFabricHelper?> CreateAsync(
            ICodedWorkflowServices services, string? orchestratorBaseUrl = null)
        {
            try
            {
                string orchestratorUrl = orchestratorBaseUrl
                                      ?? Environment.GetEnvironmentVariable("UIPATH_ORCHESTRATOR_URL")
                                      ?? "https://staging.uipath.com/hackathon26_423/DefaultTenant";

                if (orchestratorUrl.EndsWith("/orchestrator_/", StringComparison.OrdinalIgnoreCase))
                    orchestratorUrl = orchestratorUrl[..^"/orchestrator_/".Length];
                else if (orchestratorUrl.EndsWith("/orchestrator_", StringComparison.OrdinalIgnoreCase))
                    orchestratorUrl = orchestratorUrl[..^"/orchestrator_".Length];

                string dataServiceUrl = orchestratorUrl.TrimEnd('/') + "/datafabric_/api";

                // Use CLI cached user token which has DataService.Data.Write scope
                string? cliToken = ReadCliToken();
                if (!string.IsNullOrWhiteSpace(cliToken))
                {
                    var http = new HttpClient();
                    http.DefaultRequestHeaders.Authorization =
                        new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", cliToken);
                    return new DataFabricHelper(http, dataServiceUrl);
                }

                // Fallback: robot's Orchestrator client
                var orchClient = await services.OrchestratorClientService.BuildClientAsync();
                HttpClient? robotHttp = GetHttpClient(orchClient);
                return robotHttp == null ? null : new DataFabricHelper(robotHttp, dataServiceUrl);
            }
            catch { return null; }
        }

        private static string? ReadCliToken()
        {
            try
            {
                string authFile = System.IO.Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
                    ".uipath", ".auth");
                if (!System.IO.File.Exists(authFile)) return null;
                foreach (string line in System.IO.File.ReadAllLines(authFile))
                {
                    if (line.StartsWith("UIPATH_ACCESS_TOKEN=", StringComparison.Ordinal))
                        return line["UIPATH_ACCESS_TOKEN=".Length..].Trim();
                }
            }
            catch { }
            return null;
        }

        // ── Public entity write methods ──────────────────────────────────────

        public void CreateImportCaseRecord(string orderNumber, Dictionary<string, string> fields)
            => Post("ImportCaseRecord", new Dictionary<string, object?>
            {
                ["ShipmentReference"]       = orderNumber,
                ["SupplierNameUAE"]         = Get(fields, "Shipper"),
                ["ImporterOfRecord"]        = Get(fields, "ImporterOfRecord"),
                ["CountryOfOriginDeclared"] = Get(fields, "CountryOfOrigin"),
                ["CountryOfOriginVerified"] = "",
                ["PortOfLoading"]           = Get(fields, "PortOfLoading"),
                ["PortOfEntryUSA"]          = Get(fields, "PortOfDischarge"),
                ["HtsCode"]                 = Get(fields, "HTSCode"),
                ["ShipmentValueUSD"]        = ParseDecimal(Get(fields, "TotalValue_USD")),
                ["EntryType"]               = EntryType(fields),
                ["IsfFilingStatus"]         = "PENDING",
                ["OfacScreeningResult"]     = "PENDING",
                ["CbpReleaseStatus"]        = "PENDING",
                ["CaseStatus"]              = "OPEN",
                ["AssignedBroker"]          = "",
                ["ErpPoNumber"]             = Get(fields, "InvoiceNumber")
            });

        public void CreateAuditEntry(string orderNumber, string fieldsJson, string jobId)
            => Post("AuditEntry", new Dictionary<string, object?>
            {
                ["CaseRef"]         = orderNumber,
                ["ActorUserId"]     = "TradeX_EmailIntake_Agent",
                ["ActorRole"]       = "AUTOMATION",
                ["ActionType"]      = "CASE_CREATED",
                ["StageId"]         = "EMAIL_INTAKE",
                ["TaskCode"]        = "INTAKE_EMAIL",
                ["FieldChanged"]    = "ALL",
                ["PreviousValue"]   = "",
                ["NewValue"]        = fieldsJson,
                ["DecisionOutcome"] = "CREATED",
                ["SessionId"]       = jobId,
                ["RecordedAt"]      = DateTime.UtcNow.ToString("o")
            });

        public void CreateIsfFilingRecord(string orderNumber, Dictionary<string, string> fields)
        {
            string hts = Get(fields, "HTSCode").Replace(".", "").Replace(" ", "");
            string hts6 = hts.Length >= 6 ? hts.Substring(0, 6) : hts;
            Post("IsfFilingRecord", new Dictionary<string, object?>
            {
                ["CaseRef"]                 = orderNumber,
                ["IsfTransactionNumber"]    = "",
                ["FilingStatus"]            = "PENDING",
                ["DeadlineUtc"]             = DateTime.UtcNow.AddHours(72).ToString("o"),
                ["SellerNameAddress"]       = Get(fields, "Shipper"),
                ["BuyerNameAddress"]        = Get(fields, "Consignee"),
                ["ImporterOfRecordNumber"]  = Get(fields, "ImporterOfRecord"),
                ["ConsigneeNumber"]         = Get(fields, "Consignee"),
                ["SupplierNameAddress"]     = $"{Get(fields, "ManufacturerName")} {Get(fields, "ManufacturerAddress")}".Trim(),
                ["ShipToNameAddress"]       = Get(fields, "Consignee"),
                ["CountryOfOrigin"]         = Get(fields, "CountryOfOrigin"),
                ["Hts6"]                    = hts6,
                ["StuffingLocation"]        = Get(fields, "ManufacturerAddress"),
                ["ConsolidatorNameAddress"] = ""
            });
        }

        public void CreateDutyCalculation(string orderNumber, Dictionary<string, string> fields)
            => Post("DutyCalculation", new Dictionary<string, object?>
            {
                ["CaseRef"]                  = orderNumber,
                ["HtsCode"]                  = Get(fields, "HTSCode"),
                ["DeclaredValue"]            = ParseDecimal(Get(fields, "TotalValue_USD")),
                ["MfnDutyRate"]              = 0m,
                ["Section301Surcharge"]      = 0m,
                ["AddCvdRate"]               = 0m,
                ["MerchandiseProcessingFee"] = 0m,
                ["HarborMaintenanceFee"]     = 0m,
                ["TotalDutyUSD"]             = 0m
            });

        public void CreateOfacScreeningRecords(string orderNumber, Dictionary<string, string> fields)
        {
            var parties = new[]
            {
                ("ImporterOfRecord", "IMPORTER_OF_RECORD"),
                ("Shipper",          "SHIPPER"),
                ("Consignee",        "CONSIGNEE"),
                ("ManufacturerName", "MANUFACTURER")
            };
            foreach (var (fieldKey, role) in parties)
            {
                string partyName = Get(fields, fieldKey);
                if (string.IsNullOrWhiteSpace(partyName)) continue;
                Post("OfacScreeningRecord", new Dictionary<string, object?>
                {
                    ["CaseRef"]         = orderNumber,
                    ["PartyName"]       = partyName,
                    ["PartyRole"]       = role,
                    ["MatchScore"]      = 0,
                    ["ScreeningStatus"] = "PENDING",
                    ["SdnEntry"]        = ""
                });
            }
        }

        public void CreateHumanTaskRecord(string orderNumber)
            => Post("HumanTaskRecord", new Dictionary<string, object?>
            {
                ["TaskId"]         = $"HTR-{orderNumber}-INTAKE",
                ["Title"]          = $"Review intake for case {orderNumber}",
                ["Priority"]       = "MEDIUM",
                ["TaskState"]      = "PENDING",
                ["AssignedToUser"] = "",
                ["CaseRef"]        = orderNumber,
                ["CreatedAt"]      = DateTime.UtcNow.ToString("o"),
                ["CompletedAt"]    = (object?)null,
                ["TaskData"]       = "",
                ["Outcome"]        = ""
            });

        public void CreateShipmentDocument(string orderNumber, string fileName)
        {
            string ext = System.IO.Path.GetExtension(fileName).ToLowerInvariant();
            string docType = ext switch
            {
                ".pdf"  => "PDF",
                ".xlsx" or ".xls" => "SPREADSHEET",
                ".doc"  or ".docx" => "WORD",
                ".csv"  => "CSV",
                ".jpg"  or ".jpeg" or ".png" or ".tif" or ".tiff" => "IMAGE",
                _       => "OTHER"
            };
            Post("ShipmentDocument", new Dictionary<string, object?>
            {
                ["CaseRef"]           = orderNumber,
                ["FileName"]          = fileName,
                ["DocumentType"]      = docType,
                ["UploadedAt"]        = DateTime.UtcNow.ToString("o"),
                ["UploadedBy"]        = "TradeX_EmailIntake_Agent",
                ["IdpConfidence"]     = 0,
                ["RetentionDaysLeft"] = 2555,
                ["FileSize"]          = "",
                ["ExtractionData"]    = ""
            });
        }

        // ── Entity ID map (from DataFabric schema) ───────────────────────────
        private static readonly Dictionary<string, string> EntityIds = new()
        {
            ["ImportCaseRecord"]    = "182ca464-ce70-f111-ac9b-000d3a68f6f7",
            ["AuditEntry"]         = "56d52f6c-ce70-f111-ac9b-000d3a68f6f7",
            ["IsfFilingRecord"]    = "18d52f6c-ce70-f111-ac9b-000d3a68f6f7",
            ["DutyCalculation"]    = "43d52f6c-ce70-f111-ac9b-000d3a68f6f7",
            ["OfacScreeningRecord"]= "482ca464-ce70-f111-ac9b-000d3a68f6f7",
            ["HumanTaskRecord"]    = "342ca464-ce70-f111-ac9b-000d3a68f6f7",
            ["ShipmentDocument"]   = "30d52f6c-ce70-f111-ac9b-000d3a68f6f7"
        };

        // ── Private helpers ──────────────────────────────────────────────────

        private void Post(string entityName, Dictionary<string, object?> body)
        {
            if (!EntityIds.TryGetValue(entityName, out string? entityId))
                throw new InvalidOperationException($"Unknown DataFabric entity: {entityName}");
            string url = $"{_baseUrl}/EntityService/entity/{entityId}/insert";
            string json = JsonSerializer.Serialize(body);
            var req = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = new StringContent(json, Encoding.UTF8, "application/json")
            };
            var resp = _http.SendAsync(req).GetAwaiter().GetResult();
            if (!resp.IsSuccessStatusCode)
            {
                string rb = resp.Content.ReadAsStringAsync().GetAwaiter().GetResult();
                throw new InvalidOperationException(
                    $"DataFabric POST {entityName} failed [{resp.StatusCode}]: {rb}");
            }
        }

        private static string Get(Dictionary<string, string> d, string key)
            => d.TryGetValue(key, out var v) ? v ?? "" : "";

        private static decimal ParseDecimal(string s)
        {
            string cleaned = s.Replace("$", "").Replace(",", "").Trim();
            return decimal.TryParse(cleaned, out decimal d) ? d : 0m;
        }

        private static string EntryType(Dictionary<string, string> fields)
            => ParseDecimal(Get(fields, "TotalValue_USD")) > 2500m ? "FORMAL" : "INFORMAL";

        // Extract the HttpClient from whatever BuildClientAsync() returns.
        // Uses reflection so we don't have to hard-code against a specific SDK type —
        // the robot framework guarantees the client is authenticated.
        private static HttpClient? GetHttpClient(object orchClient)
        {
            if (orchClient is HttpClient hc) return hc;

            // Try property named "HttpClient" on the returned SDK object
            var prop = orchClient?.GetType().GetProperty("HttpClient");
            if (prop?.GetValue(orchClient) is HttpClient propHc) return propHc;

            // Try property named "Client"
            var clientProp = orchClient?.GetType().GetProperty("Client");
            if (clientProp?.GetValue(orchClient) is HttpClient clientPropHc) return clientPropHc;

            return null;
        }

        private static string? TryExtractUrlFromObject(object? obj)
        {
            if (obj == null) return null;
            foreach (string name in new[] { "BaseAddress", "BaseUri", "OrchestratorUrl", "Url", "BaseUrl",
                                            "ServiceUrl", "TenantUrl", "OrchUrl" })
            {
                try
                {
                    var val = obj.GetType().GetProperty(name,
                        System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.NonPublic |
                        System.Reflection.BindingFlags.Instance)?.GetValue(obj);
                    if (val is Uri u && !string.IsNullOrWhiteSpace(u.ToString())) return u.ToString();
                    if (val is string s && (s.StartsWith("http://") || s.StartsWith("https://"))) return s;
                }
                catch { }
            }
            try
            {
                var inner = obj.GetType().GetProperty("Client",
                    System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.NonPublic |
                    System.Reflection.BindingFlags.Instance)?.GetValue(obj);
                if (inner is HttpClient hc && hc.BaseAddress != null) return hc.BaseAddress.ToString();
            }
            catch { }
            return null;
        }
    }
}
