#nullable enable
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using UiPath.CodedWorkflows;
using UiPath.IntegrationService.Activities.Runtime.CodedWorkflows;
using UiPath.IntegrationService.Activities.Runtime.Models;
using UiPath.IntegrationService.Activities.Runtime.Models.ConnectorMetadata;

namespace TradeX_GmailReader
{
    public class GmailReaderWorkflow : CodedWorkflow
    {
        private const string OrchestratorBase = "https://staging.uipath.com/hackathon26_423/DefaultTenant";
        private const string SharedFolderOrgUnitId = "3049640";

        [Workflow]
        public (string out_EmailJson, string out_EmailId, bool out_HasEmail,
                string out_AttachmentBucketPathsJson) Execute(string in_CaseId = "",
                string in_TestMessageId = "")
        {
            string gmailLabel = (string)system.GetAsset("TRADEX_GMAIL_MONITOR_LABEL");
            string bucketName = "TradeX_Documents";
            try { bucketName = (string)system.GetAsset("TRADEX_DOCUMENTS_BUCKET_NAME"); } catch { }

            var conn = new ISConnections(services.Container).Gmail.TradeXGmail;

            string emailId;
            string subject      = string.Empty;
            string body         = string.Empty;
            string fromEmail    = string.Empty;
            bool   hasAttachments = false;

            // ── 1a. If a specific message ID is provided for testing, fetch it directly ──
            if (!string.IsNullOrWhiteSpace(in_TestMessageId))
            {
                Log($"TradeX_GmailReader: direct-fetch mode, messageId={in_TestMessageId}");
                emailId = in_TestMessageId;
                // Try to get email details
                try
                {
                    var getConfig = new CodedConnectorConfiguration(
                        conn, "GetEmail", Operation.Retrieve, "GETBYID",
                        "/hubs/general/GetEmail", ActivityType.Curated);
                    var getReq = new ConnectorRequest
                    {
                        QueryParameters = new Dictionary<string, string> { ["id"] = emailId }
                    };
                    var getResp = conn.ExecuteAsync(getConfig, getReq).GetAwaiter().GetResult();
                    if (getResp?.Output != null)
                    {
                        subject      = GetStr(getResp.Output, "Subject");
                        body         = GetStr(getResp.Output, "Body");
                        hasAttachments = getResp.Output.TryGetValue("HasAttachments", out var ha2) && ha2 is bool hb2 && hb2;
                        if (getResp.Output.TryGetValue("From", out var f2) && f2 is IReadOnlyDictionary<string, object?> fd2)
                            fromEmail = GetStr(fd2, "Email");
                    }
                }
                catch (Exception ex) { Log($"GetEmail fallback: {ex.Message}"); }
            }
            else
            {
                // ── 1b. Normal mode: List unread emails ───────────────────────
                Log($"TradeX_GmailReader: checking label '{gmailLabel}'");
                var listConfig = new CodedConnectorConfiguration(
                    conn, "ListEmails", Operation.List, "GET",
                    "/hubs/general/ListEmails", ActivityType.Curated);
                var listRequest = new ConnectorRequest
                {
                    QueryParameters = new Dictionary<string, string>
                    {
                        ["emailFolder"] = gmailLabel,
                        ["unreadOnly"]  = "true",
                        ["markAsRead"]  = "true",
                        ["pageSize"]    = "1"
                    }
                };

                ConnectorResponse listResp;
                try { listResp = conn.ExecuteAsync(listConfig, listRequest).GetAwaiter().GetResult(); }
                catch (Exception ex)
                {
                    Log($"No email found: {ex.Message}");
                    return (string.Empty, string.Empty, false, "[]");
                }

                if (listResp?.Items == null || listResp.Items.Count == 0)
                {
                    Log("No unread emails");
                    return (string.Empty, string.Empty, false, "[]");
                }

                var msg = listResp.Items[0];
                emailId      = GetStr(msg, "ID");
                subject      = GetStr(msg, "Subject");
                body         = GetStr(msg, "Body");
                hasAttachments = msg.TryGetValue("HasAttachments", out var hab) && hab is bool b && b;
                if (msg.TryGetValue("From", out var fromObj) && fromObj is IReadOnlyDictionary<string, object?> from)
                    fromEmail = GetStr(from, "Email");

                if (string.IsNullOrEmpty(emailId))
                {
                    Log("Email missing ID");
                    return (string.Empty, string.Empty, false, "[]");
                }
            }

            // ── 2. List attachments via IS to get IDs ─────────────────────────
            var attachmentMeta = new List<(string id, string name)>();
            try
            {
                var listAttConfig = new CodedConnectorConfiguration(
                    conn, "ListEmailAttachments", Operation.List, "GET",
                    "/hubs/general/ListEmailAttachments", ActivityType.Curated);
                var listAttReq = new ConnectorRequest
                {
                    QueryParameters = new Dictionary<string, string> { ["id"] = emailId }
                };
                var listAttResp = conn.ExecuteAsync(listAttConfig, listAttReq).GetAwaiter().GetResult();
                if (listAttResp?.Items != null)
                {
                    foreach (var att in listAttResp.Items)
                    {
                        // Log ALL fields so we can discover the real attachment ID key
                        Log($"Attachment fields: {string.Join(", ", att.Keys)} | Values: {string.Join(", ", att.Select(kv => $"{kv.Key}={kv.Value?.ToString()?.Substring(0, Math.Min(40, kv.Value?.ToString()?.Length ?? 0))}").Take(10))}");

                        string attId   = string.Empty;
                        string attName = string.Empty;
                        foreach (string k in new[] { "attachmentID", "AttachmentId", "attachmentId", "Id", "id", "ID", "UID", "uid", "MessageAttachmentId", "partId" })
                        {
                            attId = GetStr(att, k);
                            if (!string.IsNullOrWhiteSpace(attId)) break;
                        }
                        foreach (string k in new[] { "FileName", "fileName", "Name", "name", "filename" })
                        {
                            attName = GetStr(att, k);
                            if (!string.IsNullOrWhiteSpace(attName)) break;
                        }
                        if (!string.IsNullOrWhiteSpace(attName))
                            attachmentMeta.Add((attId, attName));
                    }
                }
                Log($"ListEmailAttachments: found {attachmentMeta.Count} attachment(s). IDs: {string.Join(", ", attachmentMeta.Select(a => $"{a.name}={a.id}"))}");

            }
            catch (Exception ex)
            {
                Log($"ListEmailAttachments failed: {ex.Message}");
            }

            // ── 3. Download each attachment via IS DownloadAttachmentByID ─────
            string? cliToken = ReadCliToken();
            string orchBase  = OrchestratorBase.TrimEnd('/') + "/orchestrator_";
            var bucketPaths  = new List<string>();

            foreach (var (attId, fileName) in attachmentMeta)
            {
                try
                {
                    byte[]? fileBytes = null;

                    // Primary: use IS CLI subprocess — bypasses runtime JSON-parse issue for binary responses
                    fileBytes = DownloadAttachmentViaCli(emailId, fileName);
                    if (fileBytes != null && fileBytes.Length > 0)
                        Log($"CLI download succeeded: {fileName} ({fileBytes.Length} bytes)");

                    // Fallback 1: IS DownloadAttachmentByID with attachment ID embedded in path
                    if ((fileBytes == null || fileBytes.Length == 0) && !string.IsNullOrWhiteSpace(attId))
                    {
                        var dlConfig = new CodedConnectorConfiguration(
                            conn, "DownloadAttachmentByID", Operation.List, "GET",
                            $"/hubs/general/DownloadAttachmentByID/{Uri.EscapeDataString(attId)}",
                            ActivityType.Curated);
                        ConnectorResponse? dlResp = null;
                        try { dlResp = conn.ExecuteAsync(dlConfig, new ConnectorRequest()).GetAwaiter().GetResult(); }
                        catch (Exception dlEx) { Log($"DownloadAttachmentByID fallback error: {dlEx.Message.Split('\r')[0]}"); }
                        fileBytes = ExtractFileBytes(dlResp, fileName, "DownloadAttachmentByID");
                    }

                    // Fallback 2: IS DownloadAttachment by email ID + filename
                    if (fileBytes == null || fileBytes.Length == 0)
                    {
                        var dlConfig2 = new CodedConnectorConfiguration(
                            conn, "DownloadAttachment", Operation.List, "GET",
                            $"/hubs/general/DownloadAttachment/{Uri.EscapeDataString(emailId)}",
                            ActivityType.Curated);
                        var dlReq2 = new ConnectorRequest
                        {
                            QueryParameters = new Dictionary<string, string> { ["fileName"] = fileName }
                        };
                        ConnectorResponse? dlResp2 = null;
                        try { dlResp2 = conn.ExecuteAsync(dlConfig2, dlReq2).GetAwaiter().GetResult(); }
                        catch (Exception dlEx) { Log($"DownloadAttachment fallback error: {dlEx.Message.Split('\r')[0]}"); }
                        fileBytes = ExtractFileBytes(dlResp2, fileName, "DownloadAttachment");
                    }

                    if (fileBytes == null || fileBytes.Length == 0)
                    {
                        Log($"No binary content retrieved for '{fileName}' — skipping upload");
                        continue;
                    }

                    // ── 4. Upload to Storage Bucket via Orchestrator REST API ──
                    string folder = string.IsNullOrWhiteSpace(in_CaseId) ? emailId : in_CaseId;
                    string bucketKey = $"{folder}/{fileName}";
                    if (!string.IsNullOrWhiteSpace(cliToken))
                    {
                        UploadToStorageBucket(orchBase, bucketName, bucketKey, fileBytes, cliToken);
                        bucketPaths.Add(bucketKey);
                        Log($"Uploaded '{fileName}' → {bucketName}/{bucketKey} ({fileBytes.Length} bytes)");
                    }
                    else
                    {
                        Log("No CLI token — Storage Bucket upload skipped");
                    }
                }
                catch (Exception ex)
                {
                    Log($"Warning: attachment '{fileName}' failed: {ex.Message}");
                }
            }

            var attachmentNames = attachmentMeta.Select(a => a.name).ToList();
            var emailData = new
            {
                EmailId         = emailId,
                Subject         = subject,
                Body            = body,
                FromEmail       = fromEmail,
                HasAttachments  = hasAttachments,
                AttachmentNames = attachmentNames,
                AttachmentCount = attachmentNames.Count
            };

            string emailJson = JsonSerializer.Serialize(emailData);
            string bucketPathsJson = JsonSerializer.Serialize(bucketPaths);
            Log($"Done: Subject='{subject}', Attachments={attachmentNames.Count}, BucketUploads={bucketPaths.Count}");
            return (emailJson, emailId, true, bucketPathsJson);
        }

        // ── Orchestrator Storage Bucket REST API upload ───────────────────────
        // Step 1: Get bucket Id  →  Step 2: GetWriteUri (SAS)  →  Step 3: PUT bytes
        // Download via IS CLI subprocess — works for binary responses that the IS runtime can't JSON-parse
        private byte[]? DownloadAttachmentViaCli(string emailId, string fileName)
        {
            try
            {
                string connId   = "e37563f3-b8d7-4167-a518-ee3999cc1c4b";
                string query    = $"id={Uri.EscapeDataString(emailId)}&fileName={Uri.EscapeDataString(fileName)}";
                string nodeExe  = @"C:\Program Files\nodejs\node.exe";
                string uipScript= Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                    @"npm\node_modules\@uipath\cli\dist\index.js");
                var psi = new ProcessStartInfo
                {
                    FileName               = nodeExe,
                    Arguments              = $"\"{uipScript}\" is resources execute get uipath-google-gmail DownloadAttachment " +
                                             $"--connection-id {connId} --query \"{query}\" --output json",
                    RedirectStandardOutput = true,
                    RedirectStandardError  = true,
                    UseShellExecute        = false,
                    CreateNoWindow         = true
                };
                using var proc = Process.Start(psi);
                if (proc == null) { Log("CLI: Process.Start returned null"); return null; }
                string stdout = proc.StandardOutput.ReadToEnd();
                proc.WaitForExit(60000);
                if (proc.ExitCode != 0)
                {
                    string stderr = proc.StandardError.ReadToEnd();
                    Log($"CLI download failed (exit {proc.ExitCode}): {stderr.Split('\n').FirstOrDefault()}");
                    return null;
                }
                var doc = JsonDocument.Parse(stdout);
                if (!doc.RootElement.TryGetProperty("Data", out var data)) { Log("CLI: no Data in response"); return null; }
                if (!data.TryGetProperty("Value", out var val))           { Log("CLI: no Value in Data"); return null; }
                string? content = val.GetString();
                if (string.IsNullOrEmpty(content)) { Log("CLI: Value is empty"); return null; }
                return Encoding.Latin1.GetBytes(content); // Latin-1 preserves byte values 0-255
            }
            catch (Exception ex) { Log($"CLI download exception: {ex.Message.Split('\r')[0]}"); return null; }
        }

        // Extract binary content from IS response — Response field is octet-stream
        private byte[]? ExtractFileBytes(ConnectorResponse? resp, string fileName, string op)
        {
            if (resp == null) return null;
            if (resp.Output != null)
            {
                Log($"{op} output keys: {string.Join(", ", resp.Output.Keys)}");
                // Primary: "Value" (raw text/bytes from IS DownloadAttachment), "Response" (octet-stream)
                foreach (string k in new[] { "Value", "Response", "FileContent", "Content", "Data", "data", "content", "Body", "body", "encodedData" })
                {
                    if (!resp.Output.TryGetValue(k, out var raw) || raw == null) continue;
                    if (raw is byte[] b && b.Length > 0) return b;
                    string? s = raw.ToString();
                    if (string.IsNullOrWhiteSpace(s)) continue;
                    // Value field returns raw file content as string (not base64); Response/FileContent is base64
                    if (k == "Value") return Encoding.UTF8.GetBytes(s);
                    try { return Convert.FromBase64String(s); } catch { return Encoding.UTF8.GetBytes(s); }
                }
            }
            Log($"{op} returned no binary content for '{fileName}', output keys: {string.Join(", ", resp.Output?.Keys ?? Enumerable.Empty<string>())}");
            return null;
        }

        private void UploadToStorageBucket(string orchBase, string bucketName, string bucketKey,
                                           byte[] fileBytes, string cliToken)
        {
            using var http = new HttpClient();
            http.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", cliToken);
            http.DefaultRequestHeaders.Add("X-UIPATH-OrganizationUnitId", SharedFolderOrgUnitId);

            // Step 1: Find bucket by name
            string listUrl = $"{orchBase}/odata/Buckets?$filter=Name eq '{Uri.EscapeDataString(bucketName)}'&$top=1";
            var listResp = http.GetAsync(listUrl).GetAwaiter().GetResult();
            string listJson = listResp.Content.ReadAsStringAsync().GetAwaiter().GetResult();
            if (!listResp.IsSuccessStatusCode)
                throw new InvalidOperationException($"Bucket list failed [{listResp.StatusCode}]: {listJson}");

            var listDoc = JsonDocument.Parse(listJson);
            var values  = listDoc.RootElement.GetProperty("value");
            if (values.GetArrayLength() == 0)
                throw new InvalidOperationException($"Storage Bucket '{bucketName}' not found in Shared folder");
            long bucketId = values[0].GetProperty("Id").GetInt64();

            // Step 2: Get a pre-signed write URI (GET with query params)
            string writeUriUrl = $"{orchBase}/odata/Buckets({bucketId})/UiPath.Server.Configuration.OData.GetWriteUri" +
                                  $"?path={Uri.EscapeDataString(bucketKey)}&expiryInSeconds=300";
            var writeUriResp = http.GetAsync(writeUriUrl).GetAwaiter().GetResult();
            string writeUriJson = writeUriResp.Content.ReadAsStringAsync().GetAwaiter().GetResult();
            if (!writeUriResp.IsSuccessStatusCode)
                throw new InvalidOperationException($"GetWriteUri failed [{writeUriResp.StatusCode}]: {writeUriJson}");

            var writeUriDoc = JsonDocument.Parse(writeUriJson);
            string sasUrl = writeUriDoc.RootElement.GetProperty("Uri").GetString()
                            ?? throw new InvalidOperationException("GetWriteUri returned no Uri");

            // Step 3: PUT file bytes to the SAS URL (no auth header — SAS carries credentials)
            using var sasClient = new HttpClient();
            var content = new ByteArrayContent(fileBytes);
            content.Headers.ContentType = new MediaTypeHeaderValue(GetMimeType(bucketKey));
            // Azure Blob Storage requires this header for block blobs
            sasClient.DefaultRequestHeaders.Add("x-ms-blob-type", "BlockBlob");
            var putResp = sasClient.PutAsync(sasUrl, content).GetAwaiter().GetResult();
            if (!putResp.IsSuccessStatusCode)
            {
                string putBody = putResp.Content.ReadAsStringAsync().GetAwaiter().GetResult();
                throw new InvalidOperationException($"SAS PUT failed [{putResp.StatusCode}]: {putBody}");
            }
        }

        private static string GetMimeType(string path)
        {
            string ext = Path.GetExtension(path).ToLowerInvariant();
            return ext switch
            {
                ".pdf"  => "application/pdf",
                ".xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                ".xls"  => "application/vnd.ms-excel",
                ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                ".doc"  => "application/msword",
                ".csv"  => "text/csv",
                ".jpg"  or ".jpeg" => "image/jpeg",
                ".png"  => "image/png",
                _       => "application/octet-stream"
            };
        }

        private static string? ReadCliToken()
        {
            try
            {
                string authFile = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
                    ".uipath", ".auth");
                if (!File.Exists(authFile)) return null;
                foreach (string line in File.ReadAllLines(authFile))
                {
                    if (line.StartsWith("UIPATH_ACCESS_TOKEN=", StringComparison.Ordinal))
                        return line["UIPATH_ACCESS_TOKEN=".Length..].Trim();
                }
            }
            catch { }
            return null;
        }

        private static string GetStr(IReadOnlyDictionary<string, object?> d, string key)
            => d.TryGetValue(key, out var v) ? v?.ToString() ?? string.Empty : string.Empty;
    }
}
