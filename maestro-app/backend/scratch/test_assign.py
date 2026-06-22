import asyncio
import httpx
import os
import sys

# Add backend dir to path to import main
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from main import session_store

async def main():
    if not session_store:
        print("No active sessions in session store! Please make sure the app is logged in.")
        return
        
    session_id = list(session_store.keys())[0]
    print(f"Using active session: {session_id}")
    
    # We need a task ID and folder ID to assign. Let's use the ones from our logs:
    # Task ID: 100050480, Folder ID: 3094088
    payload = {
        "taskId": 100050480,
        "folderId": 3094088
    }
    
    cookies = {
        "session_id": session_id
    }
    
    async with httpx.AsyncClient() as client:
        # Test assign
        print("Sending POST request to assign task...")
        res = await client.post("http://localhost:5000/api/cases/tasks/assign", json=payload, cookies=cookies)
        print(f"Status: {res.status_code}")
        print(f"Headers: {res.headers}")
        print(f"Body: {res.text}")

if __name__ == "__main__":
    asyncio.run(main())
