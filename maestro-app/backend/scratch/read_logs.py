import json
import os

transcript_path = r"C:\Users\gupta\.gemini\antigravity-ide\brain\eeb73a98-ac9b-43a7-964f-d3c82bf33b1b\.system_generated\logs\transcript.jsonl"

with open(transcript_path, "r", encoding="utf-8") as f:
    for line in f:
        try:
            data = json.loads(line)
            # check if it is a tool call to browser_subagent or contains test_claim_approve_reject
            if "test_claim_approve_reject" in str(data):
                print(f"=== STEP {data.get('step_index')} ===")
                print(json.dumps(data, indent=2)[:4000])
                print("\n" + "="*40 + "\n")
        except Exception as e:
            pass
