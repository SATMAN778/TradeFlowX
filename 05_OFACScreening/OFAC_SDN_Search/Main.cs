using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Xml.Linq;
using UiPath.CodedWorkflows;

namespace OFAC_SDN_Search
{
    public class SDNSearch : CodedWorkflow
    {
        [Workflow]
        public (string out_MatchResultsJson, bool out_IsHit, int out_HighestMatchScore) Execute(
            string in_PartyName,
            string in_PartyType = "",
            int in_MinScore = 85)
        {
            Log($"OFAC SDN Search started. Party: {in_PartyName}, Type: {in_PartyType}, MinScore: {in_MinScore}");

            string baseUrl = system.GetAsset("OFAC_SDN_API_URL").ToString().TrimEnd('/');

            // Official OFAC SLS API — entities search endpoint (no API key required)
            // Doc: GET /entities?list={list-name}&program={program-name}
            // Also try name search: GET /entities?list=SDN+List&name={name}
            string normalizedName = Uri.EscapeDataString(in_PartyName);
            string searchUrl = $"{baseUrl}/entities?list=SDN+List&name={normalizedName}";

            string xmlResponse = CallOfacApi(searchUrl);

            // If name param not supported by endpoint, fall back to Id-less search on SDN list
            // and parse all returned entities for fuzzy matching
            if (string.IsNullOrWhiteSpace(xmlResponse) || xmlResponse.Contains("<entities/>") || xmlResponse.Contains("<entities />"))
            {
                Log("Name search returned no results, fetching SDN list entities for local match...");
                // Try without name filter — returns all SDN entities (paginated XML)
                searchUrl = $"{baseUrl}/entities?list=SDN+List";
                xmlResponse = CallOfacApi(searchUrl);
            }

            var matches = ParseAndMatch(xmlResponse, in_PartyName, in_PartyType, in_MinScore);

            bool isHit = matches.Count > 0;
            int highestScore = isHit ? matches.Max(m => m.Score) : 0;

            var resultObj = new
            {
                searchedName = in_PartyName,
                searchedType = in_PartyType,
                minScore = in_MinScore,
                apiEndpoint = searchUrl,
                totalMatches = matches.Count,
                matches = matches.Select(m => new
                {
                    entityId = m.EntityId,
                    name = m.Name,
                    aliases = m.Aliases,
                    entityType = m.EntityType,
                    sanctionsList = m.SanctionsList,
                    programs = m.Programs,
                    countries = m.Countries,
                    score = m.Score
                })
            };

            string json = JsonSerializer.Serialize(resultObj, new JsonSerializerOptions { WriteIndented = false });
            Log($"OFAC SDN Search complete. IsHit={isHit}, HighestScore={highestScore}, Matches={matches.Count}");

            return (json, isHit, highestScore);
        }

        private string CallOfacApi(string url)
        {
            using var client = new HttpClient();
            client.Timeout = TimeSpan.FromSeconds(60);
            client.DefaultRequestHeaders.Add("Accept", "application/xml, */*");
            client.DefaultRequestHeaders.Add("User-Agent", "UiPath-OFAC-Screener/1.0");
            var response = client.GetAsync(url).GetAwaiter().GetResult();

            Log($"OFAC API {url} → HTTP {(int)response.StatusCode}");

            if (!response.IsSuccessStatusCode)
            {
                Log($"OFAC API error: HTTP {(int)response.StatusCode}");
                return string.Empty;
            }

            return response.Content.ReadAsStringAsync().GetAwaiter().GetResult();
        }

        private List<SdnMatch> ParseAndMatch(string xml, string partyName, string partyType, int minScore)
        {
            var matches = new List<SdnMatch>();
            if (string.IsNullOrWhiteSpace(xml)) return matches;

            XDocument doc;
            try { doc = XDocument.Parse(xml); }
            catch { Log("Failed to parse OFAC XML response"); return matches; }

            XNamespace ns = doc.Root?.Name.Namespace ?? XNamespace.None;
            string normalizedSearch = Normalize(partyName);
            string[] searchTokens = normalizedSearch.Split(' ', StringSplitOptions.RemoveEmptyEntries);

            foreach (var entity in doc.Descendants(ns + "entity"))
            {
                string entityId = entity.Attribute("id")?.Value ?? "";

                // Collect all names and aliases for this entity
                var allNames = new List<string>();
                foreach (var nameEl in entity.Descendants(ns + "formattedFullName"))
                    if (!string.IsNullOrWhiteSpace(nameEl.Value))
                        allNames.Add(nameEl.Value.Trim());
                foreach (var nameEl in entity.Descendants(ns + "formattedLastName"))
                    if (!string.IsNullOrWhiteSpace(nameEl.Value))
                        allNames.Add(nameEl.Value.Trim());

                if (allNames.Count == 0) continue;

                // Entity type
                string entityType = entity.Descendants(ns + "entityType").FirstOrDefault()?.Value?.Trim() ?? "";

                // Filter by type if specified
                if (!string.IsNullOrWhiteSpace(partyType) &&
                    !string.IsNullOrEmpty(entityType) &&
                    !entityType.Contains(partyType, StringComparison.OrdinalIgnoreCase))
                    continue;

                // Score against all names, take highest
                int bestScore = 0;
                string bestName = allNames[0];
                foreach (string candidate in allNames)
                {
                    int s = FuzzyScore(normalizedSearch, searchTokens, Normalize(candidate));
                    if (s > bestScore) { bestScore = s; bestName = candidate; }
                }

                if (bestScore < minScore) continue;

                // Extract sanctions lists
                var lists = entity.Descendants(ns + "sanctionsList")
                    .Select(e => e.Value.Trim())
                    .Where(v => !string.IsNullOrWhiteSpace(v))
                    .Distinct().ToList();

                // Extract programs
                var programs = entity.Descendants(ns + "sanctionsProgram")
                    .Select(e => e.Value.Trim())
                    .Where(v => !string.IsNullOrWhiteSpace(v))
                    .Distinct().ToList();

                // Extract countries from addresses
                var countries = entity.Descendants(ns + "country")
                    .Select(e => e.Value.Trim())
                    .Where(v => !string.IsNullOrWhiteSpace(v))
                    .Distinct().ToList();

                // All names beyond the primary = aliases
                var aliases = allNames.Where(n => n != bestName).Distinct().ToList();

                matches.Add(new SdnMatch
                {
                    EntityId = entityId,
                    Name = bestName,
                    Aliases = aliases,
                    EntityType = entityType,
                    SanctionsList = lists,
                    Programs = programs,
                    Countries = countries,
                    Score = bestScore
                });
            }

            return matches.OrderByDescending(m => m.Score).Take(10).ToList();
        }

        private int FuzzyScore(string normalizedSearch, string[] searchTokens, string normalizedTarget)
        {
            if (normalizedTarget == normalizedSearch) return 100;
            if (normalizedTarget.Contains(normalizedSearch)) return 95;
            if (normalizedSearch.Contains(normalizedTarget)) return 92;

            string[] targetTokens = normalizedTarget.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            if (searchTokens.Length == 0) return 0;

            int matchedTokens = searchTokens.Count(st =>
                targetTokens.Any(tt => tt == st || tt.Contains(st) || st.Contains(tt)));
            int tokenScore = (int)((double)matchedTokens / searchTokens.Length * 90);

            if (normalizedSearch.Length <= 25 && normalizedTarget.Length <= 35)
            {
                int dist = LevenshteinDistance(normalizedSearch, normalizedTarget);
                int maxLen = Math.Max(normalizedSearch.Length, normalizedTarget.Length);
                int levScore = (int)((1.0 - (double)dist / maxLen) * 85);
                return Math.Max(tokenScore, levScore);
            }

            return tokenScore;
        }

        private string Normalize(string s)
        {
            if (string.IsNullOrWhiteSpace(s)) return "";
            return s.ToUpperInvariant()
                    .Replace(",", " ").Replace(".", " ").Replace("-", " ")
                    .Replace("'", "").Replace("\"", "")
                    .Replace("  ", " ").Trim();
        }

        private int LevenshteinDistance(string a, string b)
        {
            int[,] dp = new int[a.Length + 1, b.Length + 1];
            for (int i = 0; i <= a.Length; i++) dp[i, 0] = i;
            for (int j = 0; j <= b.Length; j++) dp[0, j] = j;
            for (int i = 1; i <= a.Length; i++)
                for (int j = 1; j <= b.Length; j++)
                    dp[i, j] = a[i - 1] == b[j - 1]
                        ? dp[i - 1, j - 1]
                        : 1 + Math.Min(dp[i - 1, j - 1], Math.Min(dp[i - 1, j], dp[i, j - 1]));
            return dp[a.Length, b.Length];
        }

        private class SdnMatch
        {
            public string EntityId { get; set; }
            public string Name { get; set; }
            public List<string> Aliases { get; set; }
            public string EntityType { get; set; }
            public List<string> SanctionsList { get; set; }
            public List<string> Programs { get; set; }
            public List<string> Countries { get; set; }
            public int Score { get; set; }
        }
    }
}
