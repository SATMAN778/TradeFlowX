#nullable enable
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Text.RegularExpressions;
using UiPath.CodedWorkflows;
using UiPath.IntegrationService.Activities.Runtime.CodedWorkflows;
using UiPath.IntegrationService.Activities.Runtime.Models;
using UiPath.IntegrationService.Activities.Runtime.Models.ConnectorMetadata;

namespace TradeX_EmailIntake
{
    public class EmailIntakeWorkflow : CodedWorkflow
    {
        private const string InboxFolderId =
            "AAMkADg3YTIwMjlhLTJlNzQtNGQxNi04YTQ0LTMzYjJjYmM2M2VjYQAuAAAAAABL1ae9DiaZQ4MPpVqlPW6rAQDuWf7znPZkTqW1VQePYexFAAAAAAEMAAA=";

        private static readonly string[] RequiredFields = new[]
        {
            "ImporterOfRecord", "Shipper", "Consignee", "NotifyParty", "CountryOfOrigin",
            "HTSCode", "GoodsDescription", "Quantity", "UnitValue_USD", "TotalValue_USD",
            "Currency", "Incoterms", "PortOfLoading", "PortOfDischarge", "VesselOrFlightNumber",
            "BillOfLadingOrAWBNumber", "InvoiceNumber", "InvoiceDate", "ManufacturerName",
            "ManufacturerAddress", "GrossWeight_KG", "PackageCount"
        };

        [Workflow]
        public (string out_SalesforceOrderId, string out_CaseId, bool out_PO_HasAllDetails,
                string[] out_MissingFields, int out_AttachmentCount) Execute()
        {
            Log("TradeX_EmailIntake started");

            var isConn = new ISConnections(services.Container);
            var outlook = isConn.Outlook.TradeXEmail;
            var salesforce = isConn.Salesforce.TradeXSalesforce;

            var emails = GetUnreadEmails(outlook);
            if (emails.Count == 0)
            {
                Log("No unread shipment emails found");
                return (string.Empty, string.Empty, false, new[] { "No email found" }, 0);
            }

            var email = emails[0];
            string emailId = GetStr(email, "id");
            string subject = GetStr(email, "subject");
            string bodyContent = string.Empty;
            if (email.TryGetValue("body", out var bodyObj) && bodyObj is IReadOnlyDictionary<string, object?> bodyDict)
                bodyContent = bodyDict.TryGetValue("content", out var c) ? c?.ToString() ?? string.Empty : string.Empty;
            bool hasAttachments = email.TryGetValue("hasAttachments", out var ha) && ha is bool b && b;

            Log($"Processing email: {subject} (ID: {emailId})");

            var shipmentData = ParseShipmentFields(subject + "\n" + bodyContent);

            var missingFields = new List<string>();
            foreach (var field in RequiredFields)
            {
                if (!shipmentData.TryGetValue(field, out var val) || string.IsNullOrWhiteSpace(val))
                    missingFields.Add(field);
            }
            bool hasAllDetails = missingFields.Count == 0;
            Log($"PO completeness: {(hasAllDetails ? "Complete" : $"Missing {missingFields.Count} fields")}");

            string salesforceOrderId = CreateSalesforceOrder(salesforce, shipmentData);
            Log($"Salesforce Order created: {salesforceOrderId}");

            string caseId = GetOrderNumber(salesforce, salesforceOrderId);
            Log($"Case ID (OrderNumber): {caseId}");

            int attachmentCount = 0;
            if (hasAttachments && !string.IsNullOrEmpty(emailId))
            {
                attachmentCount = ProcessEmailAttachments(outlook, salesforce, emailId, salesforceOrderId);
                Log($"Uploaded {attachmentCount} attachment(s)");
            }

            MarkEmailRead(outlook, emailId);

            Log($"TradeX_EmailIntake complete. OrderId={salesforceOrderId}, CaseId={caseId}, HasAllDetails={hasAllDetails}");
            return (salesforceOrderId, caseId, hasAllDetails, missingFields.ToArray(), attachmentCount);
        }

        private IReadOnlyList<IReadOnlyDictionary<string, object?>> GetUnreadEmails(ConnectorConnection outlook)
        {
            var config = new CodedConnectorConfiguration(
                outlook, "ListEmails", Operation.List, "GET", "/ListEmails");
            var request = new ConnectorRequest
            {
                QueryParameters = new Dictionary<string, string>
                {
                    ["parentFolderId"] = InboxFolderId,
                    ["unReadOnly"] = "true",
                    ["pageSize"] = "10"
                },
                MaxRecords = 10
            };
            var response = outlook.ExecuteAsync(config, request).GetAwaiter().GetResult();
            return response?.Items ?? new List<IReadOnlyDictionary<string, object?>>();
        }

        private Dictionary<string, string> ParseShipmentFields(string text)
        {
            var data = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            var patterns = new Dictionary<string, string>
            {
                ["ImporterOfRecord"] = @"(?:Importer of Record|IOR)[:\s]+([^\n\r]+)",
                ["Shipper"] = @"(?:Shipper|Exporter)[:\s]+([^\n\r]+)",
                ["Consignee"] = @"Consignee[:\s]+([^\n\r]+)",
                ["NotifyParty"] = @"Notify Party[:\s]+([^\n\r]+)",
                ["CountryOfOrigin"] = @"(?:Country of Origin|COO|Origin Country)[:\s]+([^\n\r]+)",
                ["HTSCode"] = @"(?:HTS Code|HS Code|HTS)[:\s]+([0-9.]+)",
                ["GoodsDescription"] = @"(?:Goods Description|Description of Goods|Commodity)[:\s]+([^\n\r]+)",
                ["Quantity"] = @"Quantity[:\s]+([^\n\r]+)",
                ["UnitValue_USD"] = @"(?:Unit Value|Unit Price)[:\s]+\$?\s*([0-9,\.]+)",
                ["TotalValue_USD"] = @"(?:Total Value|Invoice Value|Total)[:\s]+\$?\s*([0-9,\.]+)",
                ["Currency"] = @"Currency[:\s]+([A-Z]{3})",
                ["Incoterms"] = @"(?:Incoterms?|Terms)[:\s]+([A-Z]{3}(?:\s+\w+)?)",
                ["PortOfLoading"] = @"(?:Port of Loading|POL)[:\s]+([^\n\r]+)",
                ["PortOfDischarge"] = @"(?:Port of Discharge|POD|Port of Entry)[:\s]+([^\n\r]+)",
                ["VesselOrFlightNumber"] = @"(?:Vessel|Flight|Voyage)[:\s]+([^\n\r]+)",
                ["BillOfLadingOrAWBNumber"] = @"(?:Bill of Lading|B/L|BOL|AWB)[:\s#]+([^\n\r]+)",
                ["InvoiceNumber"] = @"(?:Invoice No|Invoice Number|INV#)[:\s]+([^\n\r]+)",
                ["InvoiceDate"] = @"(?:Invoice Date|Date)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}-\d{2}-\d{2})",
                ["ManufacturerName"] = @"(?:Manufacturer|Mfr)[:\s]+([^\n\r]+)",
                ["ManufacturerAddress"] = @"(?:Manufacturer Address|Mfr Address)[:\s]+([^\n\r]+)",
                ["GrossWeight_KG"] = @"(?:Gross Weight|GW)[:\s]+([0-9,\.]+)\s*(?:kg|KG)?",
                ["PackageCount"] = @"(?:Package Count|Packages|Pkgs|Cartons)[:\s]+([0-9]+)"
            };

            foreach (var kvp in patterns)
            {
                var match = Regex.Match(text, kvp.Value, RegexOptions.IgnoreCase | RegexOptions.Multiline);
                data[kvp.Key] = match.Success ? match.Groups[1].Value.Trim() : string.Empty;
            }
            return data;
        }

        private string CreateSalesforceOrder(ConnectorConnection salesforce, Dictionary<string, string> shipmentData)
        {
            var allFieldsJson = JsonSerializer.Serialize(shipmentData);
            var config = new CodedConnectorConfiguration(
                salesforce, "Order", Operation.Create, "POST", "/sobjects/Order",
                ActivityType.Generic);
            var request = new ConnectorRequest
            {
                BodyParameters = new Dictionary<string, object?>
                {
                    ["Status"] = "Draft",
                    ["EffectiveDate"] = DateTime.UtcNow.ToString("yyyy-MM-dd"),
                    ["Description"] = allFieldsJson,
                    ["ShippingCountry"] = shipmentData.GetValueOrDefault("CountryOfOrigin", string.Empty),
                    ["BillingCountry"] = shipmentData.GetValueOrDefault("CountryOfOrigin", string.Empty),
                    ["COO__c"] = shipmentData.GetValueOrDefault("CountryOfOrigin", string.Empty),
                    ["HTSCode__c"] = shipmentData.GetValueOrDefault("HTSCode", string.Empty),
                    ["IOR__c"] = shipmentData.GetValueOrDefault("ImporterOfRecord", string.Empty),
                    ["ManufacturerName__c"] = shipmentData.GetValueOrDefault("ManufacturerName", string.Empty),
                    ["ManufacturerAddress__c"] = shipmentData.GetValueOrDefault("ManufacturerAddress", string.Empty),
                    ["BillOfLading__c"] = shipmentData.GetValueOrDefault("BillOfLadingOrAWBNumber", string.Empty),
                    ["InvoiceNumber__c"] = shipmentData.GetValueOrDefault("InvoiceNumber", string.Empty),
                    ["PortOfLoading__c"] = shipmentData.GetValueOrDefault("PortOfLoading", string.Empty),
                    ["PortOfDischarge__c"] = shipmentData.GetValueOrDefault("PortOfDischarge", string.Empty),
                    ["VesselNumber__c"] = shipmentData.GetValueOrDefault("VesselOrFlightNumber", string.Empty),
                    ["Incoterms__c"] = shipmentData.GetValueOrDefault("Incoterms", string.Empty),
                    ["GrossWeight__c"] = shipmentData.GetValueOrDefault("GrossWeight_KG", string.Empty)
                }
            };
            var response = outlook_ExecuteAsync(salesforce, config, request);
            var output = (IReadOnlyDictionary<string, object?>)response.Output;
            return output != null && output.ContainsKey("id")
                ? output["id"]?.ToString() ?? string.Empty
                : throw new InvalidOperationException("Salesforce Order creation failed — no ID returned");
        }

        private string GetOrderNumber(ConnectorConnection salesforce, string orderId)
        {
            var config = new CodedConnectorConfiguration(
                salesforce, "Order", Operation.Retrieve, "GET", "/sobjects/Order/{id}",
                ActivityType.Generic);
            var request = new ConnectorRequest
            {
                PathParameters = new Dictionary<string, string> { ["id"] = orderId },
                QueryParameters = new Dictionary<string, string> { ["fields"] = "OrderNumber" }
            };
            var response = outlook_ExecuteAsync(salesforce, config, request);
            var output = (IReadOnlyDictionary<string, object?>)response.Output;
            return output != null && output.ContainsKey("OrderNumber")
                ? output["OrderNumber"]?.ToString() ?? orderId
                : orderId;
        }

        private int ProcessEmailAttachments(ConnectorConnection outlook, ConnectorConnection salesforce,
            string emailId, string salesforceOrderId)
        {
            var listConfig = new CodedConnectorConfiguration(
                outlook, "Attachment", Operation.List, "GET", "/Messages/{messageId}/attachments",
                ActivityType.Generic);
            var listRequest = new ConnectorRequest
            {
                PathParameters = new Dictionary<string, string> { ["messageId"] = emailId },
                MaxRecords = 50
            };
            var listResponse = outlook_ExecuteAsync(outlook, listConfig, listRequest);
            if (listResponse?.Items == null) return 0;

            int count = 0;
            foreach (var attachment in listResponse.Items)
            {
                string attId = GetStr(attachment, "id");
                string attName = GetStr(attachment, "name", "attachment");
                if (string.IsNullOrEmpty(attId)) continue;

                var uploadConfig = new CodedConnectorConfiguration(
                    salesforce, "ContentVersion", Operation.Create, "POST", "/sobjects/ContentVersion",
                    ActivityType.Generic);
                var uploadRequest = new ConnectorRequest
                {
                    BodyParameters = new Dictionary<string, object?>
                    {
                        ["Title"] = attName,
                        ["PathOnClient"] = attName,
                        ["ContentLocation"] = "S",
                        ["FirstPublishLocationId"] = salesforceOrderId
                    }
                };
                outlook_ExecuteAsync(salesforce, uploadConfig, uploadRequest);
                count++;
                Log($"Uploaded attachment: {attName}");
            }
            return count;
        }

        private void MarkEmailRead(ConnectorConnection outlook, string emailId)
        {
            try
            {
                var config = new CodedConnectorConfiguration(
                    outlook, "Message", Operation.Update, "PATCH", "/Messages/{id}",
                    ActivityType.Generic);
                var request = new ConnectorRequest
                {
                    PathParameters = new Dictionary<string, string> { ["id"] = emailId },
                    BodyParameters = new Dictionary<string, object?> { ["isRead"] = true }
                };
                outlook_ExecuteAsync(outlook, config, request);
            }
            catch (Exception ex)
            {
                Log($"Warning: could not mark email as read: {ex.Message}");
            }
        }

        private static dynamic outlook_ExecuteAsync(
            ConnectorConnection conn, CodedConnectorConfiguration config, ConnectorRequest request)
            => conn.ExecuteAsync(config, request).GetAwaiter().GetResult();

        private static string GetStr(IReadOnlyDictionary<string, object?> dict, string key, string fallback = "")
            => dict.TryGetValue(key, out var v) ? v?.ToString() ?? fallback : fallback;
    }
}
