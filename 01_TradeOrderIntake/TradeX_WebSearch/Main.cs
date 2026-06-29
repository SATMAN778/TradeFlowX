using System;
using System.Net.Http;
using System.Text.Json;
using UiPath.CodedWorkflows;

namespace TradeX_WebSearch
{
    public class WebSearchWorkflow : CodedWorkflow
    {
        [Workflow]
        public (string out_SearchResultsJson, string out_AbstractText, string out_RelatedTopics) Execute(
            string in_Query)
        {
            Log($"DuckDuckGo search started. Query: {in_Query}");

            string url = $"https://api.duckduckgo.com/?q={Uri.EscapeDataString(in_Query)}&format=json&no_html=1&skip_disambig=1";
            string jsonResponse;

            using (var client = new HttpClient())
            {
                client.Timeout = TimeSpan.FromSeconds(30);
                client.DefaultRequestHeaders.Add("Accept", "application/json");
                client.DefaultRequestHeaders.Add("User-Agent", "TradeXIntake/1.0");
                var response = client.GetAsync(url).GetAwaiter().GetResult();
                response.EnsureSuccessStatusCode();
                jsonResponse = response.Content.ReadAsStringAsync().GetAwaiter().GetResult();
            }

            string abstractText = string.Empty;
            string relatedTopics = "[]";

            if (!string.IsNullOrWhiteSpace(jsonResponse))
            {
                using var doc = JsonDocument.Parse(jsonResponse);
                var root = doc.RootElement;

                if (root.TryGetProperty("AbstractText", out var abstractProp))
                    abstractText = abstractProp.GetString() ?? string.Empty;

                if (root.TryGetProperty("RelatedTopics", out var topicsProp) && topicsProp.ValueKind == JsonValueKind.Array)
                {
                    var topics = new System.Collections.Generic.List<string>();
                    int count = 0;
                    foreach (var topic in topicsProp.EnumerateArray())
                    {
                        if (count >= 5) break;
                        if (topic.TryGetProperty("Text", out var textProp))
                        {
                            topics.Add(textProp.GetString() ?? string.Empty);
                            count++;
                        }
                    }
                    relatedTopics = JsonSerializer.Serialize(topics);
                }
            }

            Log($"DuckDuckGo search complete. AbstractText length: {abstractText.Length}, RelatedTopics count: {relatedTopics.Length}");
            return (jsonResponse, abstractText, relatedTopics);
        }
    }
}
