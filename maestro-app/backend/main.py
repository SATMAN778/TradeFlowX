import os
import uuid
import datetime
import urllib.parse
from typing import Dict, Optional, Any
import jwt
import httpx
from fastapi import FastAPI, Request, Response, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables
backend_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(backend_dir, '.env')
load_dotenv(dotenv_path=env_path)

# App Configuration
CLIENT_ID = os.getenv("UIPATH_CLIENT_ID", "<your-external-app-client-id>")
CLIENT_SECRET = os.getenv("UIPATH_CLIENT_SECRET", "<your-external-app-client-secret>")
ORG_NAME = os.getenv("UIPATH_ORG_NAME", "<your-organization-name>")
TENANT_NAME = os.getenv("UIPATH_TENANT_NAME", "<your-tenant-name>")
REDIRECT_URI = os.getenv("UIPATH_REDIRECT_URI", "http://localhost:3000/callback")
BASE_URL = os.getenv("UIPATH_BASE_URL", "https://cloud.uipath.com").rstrip('/')
SCOPES = os.getenv(
    "UIPATH_SCOPES",
    "OR.Default offline_access openid profile email OR.Administration OR.Folders OR.Folders.Read OR.Jobs OR.Jobs.Read OR.Tasks OR.Tasks.Read OR.Tasks.Write PIMS"
)

# Endpoint mappings
AUTHORIZE_ENDPOINT = f"{BASE_URL}/{ORG_NAME}/identity_/connect/authorize"
TOKEN_ENDPOINT = f"{BASE_URL}/{ORG_NAME}/identity_/connect/token"

app = FastAPI(title="USI Python API", version="1.0.0")

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Disable caching for API responses
@app.middleware("http")
async def add_no_cache_headers(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

# In-memory session store (Lost on server restart)
# Maps sessionId -> sessionInfo dictionary
session_store: Dict[str, Dict[str, Any]] = {}

class CallbackRequest(BaseModel):
    code: str
    state: str

class CompleteTaskRequest(BaseModel):
    taskId: int
    folderId: int
    action: str
    data: Dict[str, Any]

class AssignTaskRequest(BaseModel):
    taskId: int
    folderId: int

def extract_email_from_jwt(token: str) -> Optional[str]:
    try:
        # Decode without verification (signature checked by UiPath Identity)
        payload = jwt.decode(token, options={"verify_signature": False})
        return payload.get("email")
    except Exception as e:
        print(f"Error decoding JWT: {e}")
        return None

async def refresh_session_token_if_needed(session_id: str, session: Dict[str, Any]) -> Dict[str, Any]:
    # Check if token is expiring within 5 minutes (300 seconds)
    expiry = session.get("expires_at")
    if not expiry:
        return session
        
    now = datetime.datetime.now(datetime.timezone.utc)
    time_to_expiry = (expiry - now).total_seconds()
    
    if time_to_expiry < 300 and session.get("refresh_token"):
        print(f"Token expiring soon for session {session_id} ({time_to_expiry}s remaining). Refreshing...")
        async with httpx.AsyncClient() as client:
            try:
                data = {
                    "grant_type": "refresh_token",
                    "client_id": CLIENT_ID,
                    "client_secret": CLIENT_SECRET,
                    "refresh_token": session["refresh_token"]
                }
                res = await client.post(TOKEN_ENDPOINT, data=data)
                if res.status_code == 200:
                    token_data = res.json()
                    session["access_token"] = token_data["access_token"]
                    if "refresh_token" in token_data:
                        session["refresh_token"] = token_data["refresh_token"]
                    session["expires_at"] = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(seconds=token_data["expires_in"])
                    session_store[session_id] = session
                    print(f"Successfully refreshed token for session {session_id}")
                else:
                    print(f"Failed to refresh token: {res.status_code} - {res.text}")
            except Exception as e:
                print(f"Exception refreshing token: {e}")
                
    return session

def get_current_session(request: Request) -> Dict[str, Any]:
    session_id = request.cookies.get("session_id")
    has_session = session_id in session_store if session_id else False
    
    with open(os.path.join(backend_dir, "session.log"), "a", encoding="utf-8") as f:
        f.write(f"PATH: {request.url.path} | METHOD: {request.method} | Cookie present: {bool(session_id)} | Session in store: {has_session}\n")
        
    if not session_id or session_id not in session_store:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session not found or expired"
        )
    
    session = session_store[session_id]
    
    # Check absolute expiry (refresh token handles access token refreshes up to 60 days)
    expiry = session.get("expires_at")
    if not expiry:
         raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired"
        )
         
    return {"session_id": session_id, "session": session}

@app.get("/api/auth/login-url")
def get_login_url(response: Response):
    state = uuid.uuid4().hex
    
    response.set_cookie(
        key="oauth_state",
        value=state,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=600 # 10 minutes
    )
    
    params = {
        "response_type": "code",
        "client_id": CLIENT_ID,
        "scope": SCOPES,
        "redirect_uri": REDIRECT_URI,
        "state": state
    }
    authorize_url = f"{AUTHORIZE_ENDPOINT}?{urllib.parse.urlencode(params)}"
    return {"url": authorize_url, "state": state}

@app.post("/api/auth/callback")
async def callback(request: Request, response: Response, payload: CallbackRequest):
    stored_state = request.cookies.get("oauth_state")
    if not stored_state or stored_state != payload.state:
        raise HTTPException(status_code=400, detail="Invalid state parameter")
        
    response.delete_cookie("oauth_state")
    
    async with httpx.AsyncClient() as client:
        try:
            data = {
                "grant_type": "authorization_code",
                "code": payload.code,
                "redirect_uri": REDIRECT_URI,
                "client_id": CLIENT_ID,
                "client_secret": CLIENT_SECRET
            }
            res = await client.post(TOKEN_ENDPOINT, data=data)
            if res.status_code != 200:
                raise HTTPException(status_code=res.status_code, detail=f"Token exchange failed: {res.text}")
                
            token_data = res.json()
            session_id = uuid.uuid4().hex
            
            session_store[session_id] = {
                "session_id": session_id,
                "access_token": token_data["access_token"],
                "refresh_token": token_data.get("refresh_token"),
                "expires_at": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(seconds=token_data["expires_in"]),
                "scope": token_data.get("scope")
            }
            
            response.set_cookie(
                key="session_id",
                value=session_id,
                httponly=True,
                samesite="lax",
                secure=False,
                max_age=60 * 24 * 60 * 60 # 60 days
            )
            
            return {
                "authenticated": True, 
                "expiresAt": session_store[session_id]["expires_at"].isoformat()
            }
        except httpx.RequestError as e:
            raise HTTPException(status_code=502, detail=f"Failed to connect to UiPath Identity: {e}")

@app.get("/api/auth/status")
def get_status(request: Request):
    session_id = request.cookies.get("session_id")
    if not session_id or session_id not in session_store:
        return {"authenticated": False}
        
    session = session_store[session_id]
    return {
        "authenticated": True,
        "expiresAt": session["expires_at"].isoformat()
    }

@app.post("/api/auth/logout")
def logout(request: Request, response: Response):
    session_id = request.cookies.get("session_id")
    if session_id:
        session_store.pop(session_id, None)
        response.delete_cookie("session_id")
    return {"authenticated": False}

@app.get("/api/cases")
async def get_cases(session_data: dict = Depends(get_current_session)):
    session_id = session_data["session_id"]
    session = await refresh_session_token_if_needed(session_id, session_data["session"])
    
    url = f"{BASE_URL}/{ORG_NAME}/{TENANT_NAME}/pims_/api/v1/processes/summary?processType=CaseManagement"
    headers = {
        "Authorization": f"Bearer {session['access_token']}",
        "Accept": "application/json"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            res = await client.get(url, headers=headers)
            if res.status_code != 200:
                raise HTTPException(status_code=res.status_code, detail=res.text)
            return res.json()
        except httpx.RequestError as e:
            raise HTTPException(status_code=502, detail=f"UiPath API connection failed: {e}")

@app.get("/api/cases/{process_key}/instances")
async def get_case_instances(process_key: str, session_data: dict = Depends(get_current_session)):
    session_id = session_data["session_id"]
    session = await refresh_session_token_if_needed(session_id, session_data["session"])
    
    url = f"{BASE_URL}/{ORG_NAME}/{TENANT_NAME}/pims_/api/v1/instances?processKey={process_key}&pageSize=200&processType=CaseManagement"
    headers = {
        "Authorization": f"Bearer {session['access_token']}",
        "Accept": "application/json"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            res = await client.get(url, headers=headers)
            if res.status_code != 200:
                raise HTTPException(status_code=res.status_code, detail=res.text)
            return res.json()
        except httpx.RequestError as e:
            raise HTTPException(status_code=502, detail=f"UiPath API connection failed: {e}")

@app.get("/api/cases/instances/{instance_id}/hitl-link")
async def get_hitl_link(instance_id: str, folderKey: str, session_data: dict = Depends(get_current_session)):
    session_id = session_data["session_id"]
    session = await refresh_session_token_if_needed(session_id, session_data["session"])
    
    url = f"{BASE_URL}/{ORG_NAME}/{TENANT_NAME}/pims_/api/v1/element-executions/case-instances/{instance_id}"
    headers = {
        "Authorization": f"Bearer {session['access_token']}",
        "Accept": "application/json",
        "x-uipath-folderkey": folderKey
    }
    
    async with httpx.AsyncClient() as client:
        try:
            res = await client.get(url, headers=headers)
            if res.status_code != 200:
                raise HTTPException(status_code=res.status_code, detail=res.text)
                
            data = res.json()
            executions = data.get("elementExecutions", [])
            external_link = None
            
            for elem in executions:
                if elem.get("elementType") == "UserTask" and elem.get("status") == "InProgress":
                    raw_link = elem.get("externalLink")
                    if raw_link:
                        task_id = raw_link.split('/')[-1]
                        external_link = f"{BASE_URL}/{ORG_NAME}/{TENANT_NAME}/actions_/current-task/tasks/{task_id}"
                    break
                    
            return {"externalLink": external_link}
        except httpx.RequestError as e:
            raise HTTPException(status_code=502, detail=f"UiPath API connection failed: {e}")

@app.get("/api/cases/instances/{instance_id}/task-details")
async def get_task_details(instance_id: str, folderKey: str, session_data: dict = Depends(get_current_session)):
    session_id = session_data["session_id"]
    session = await refresh_session_token_if_needed(session_id, session_data["session"])
    
    headers = {
        "Authorization": f"Bearer {session['access_token']}",
        "Accept": "application/json"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            # 1. Fetch task executions
            elem_url = f"{BASE_URL}/{ORG_NAME}/{TENANT_NAME}/pims_/api/v1/element-executions/case-instances/{instance_id}"
            elem_headers = {**headers, "x-uipath-folderkey": folderKey}
            elem_res = await client.get(elem_url, headers=elem_headers)
            if elem_res.status_code != 200:
                raise HTTPException(status_code=elem_res.status_code, detail=elem_res.text)
                
            elem_data = elem_res.json()
            executions = elem_data.get("elementExecutions", [])
            task_id = None
            external_link = None
            
            for elem in executions:
                if elem.get("elementType") == "UserTask" and elem.get("status") == "InProgress":
                    raw_link = elem.get("externalLink")
                    if raw_link:
                        task_id = raw_link.split('/')[-1]
                        external_link = f"{BASE_URL}/{ORG_NAME}/{TENANT_NAME}/actions_/current-task/tasks/{task_id}"
                    break
            
            # Fallback to GetTasksAcrossFolders
            if not task_id:
                fallback_url = f"{BASE_URL}/{ORG_NAME}/{TENANT_NAME}/orchestrator_/odata/Tasks/UiPath.Server.Configuration.OData.GetTasksAcrossFolders?jobId={instance_id}"
                fb_res = await client.get(fallback_url, headers=headers)
                if fb_res.status_code == 200:
                    fb_data = fb_res.json()
                    fb_tasks = fb_data.get("value", [])
                    if fb_tasks:
                        task_id = str(fb_tasks[0].get("Id"))
                        external_link = f"{BASE_URL}/{ORG_NAME}/{TENANT_NAME}/actions_/current-task/tasks/{task_id}"
            
            if not task_id:
                return {"externalLink": None, "task": None}
                
            # 2. Resolve folderKey -> folderId
            folders_url = f"{BASE_URL}/{ORG_NAME}/{TENANT_NAME}/orchestrator_/api/Folders/GetAllForCurrentUser"
            folders_res = await client.get(folders_url, headers=headers)
            if folders_res.status_code != 200:
                raise HTTPException(status_code=folders_res.status_code, detail=folders_res.text)
                
            folders_data = folders_res.json()
            folder_id = None
            for folder in folders_data.get("PageItems", []):
                if folder.get("Key", "").lower() == folderKey.lower():
                    folder_id = folder.get("Id")
                    break
                    
            if folder_id is None:
                raise HTTPException(status_code=400, detail="Folder key not found")
                
            # 3. Get task details by ID
            task_url = f"{BASE_URL}/{ORG_NAME}/{TENANT_NAME}/orchestrator_/tasks/AppTasks/GetAppTaskById?taskId={task_id}"
            task_headers = {**headers, "X-UIPATH-OrganizationUnitId": str(folder_id)}
            task_res = await client.get(task_url, headers=task_headers)
            if task_res.status_code != 200:
                 raise HTTPException(status_code=task_res.status_code, detail=task_res.text)
                 
            task_obj = task_res.json()
            # Ensure taskId and priority inside task data are populated if null/empty
            task_data = task_obj.get("data") or task_obj.get("Data") or {}
            if isinstance(task_data, dict):
                if not task_data.get("taskId"):
                    task_data["taskId"] = task_id
                if not task_data.get("priority"):
                    task_data["priority"] = task_obj.get("priority") or "Medium"
                    
            current_user_email = extract_email_from_jwt(session["access_token"])
            
            return {
                "taskId": task_id,
                "folderId": folder_id,
                "externalLink": external_link,
                "task": task_obj,
                "currentUserEmail": current_user_email
            }
        except httpx.RequestError as e:
            raise HTTPException(status_code=502, detail=f"UiPath API connection failed: {e}")

@app.get("/api/cases/instances/{instance_id}/details")
async def get_instance_details(instance_id: str, folderKey: str, session_data: dict = Depends(get_current_session)):
    session_id = session_data["session_id"]
    session = await refresh_session_token_if_needed(session_id, session_data["session"])
    
    headers = {
        "Authorization": f"Bearer {session['access_token']}",
        "Accept": "application/json",
        "x-uipath-folderkey": folderKey
    }
    
    async with httpx.AsyncClient() as client:
        try:
            # 1. Fetch case instance info
            inst_url = f"{BASE_URL}/{ORG_NAME}/{TENANT_NAME}/pims_/api/v1/instances/{instance_id}"
            inst_res = await client.get(inst_url, headers=headers)
            if inst_res.status_code != 200:
                raise HTTPException(status_code=inst_res.status_code, detail=inst_res.text)
            instance = inst_res.json()
            
            # 2. Fetch variables
            vars_url = f"{BASE_URL}/{ORG_NAME}/{TENANT_NAME}/pims_/api/v1/instances/{instance_id}/variables"
            vars_res = await client.get(vars_url, headers=headers)
            variables = []
            if vars_res.status_code == 200:
                variables = vars_res.json()
                
            # Convert variables to simple dict for easy mapping
            vars_dict = {}
            if isinstance(variables, list):
                for v in variables:
                    if isinstance(v, dict) and "name" in v and "value" in v:
                        vars_dict[v["name"]] = v["value"]
            elif isinstance(variables, dict) and "variables" in variables:
                for v in variables.get("variables", []):
                    if isinstance(v, dict) and "name" in v and "value" in v:
                        vars_dict[v["name"]] = v["value"]
            elif isinstance(variables, dict):
                vars_dict = variables
                
            # 3. Fetch case-json
            case_json_url = f"{BASE_URL}/{ORG_NAME}/{TENANT_NAME}/pims_/api/v1/cases/{instance_id}/case-json"
            case_json_res = await client.get(case_json_url, headers=headers)
            case_json = None
            if case_json_res.status_code == 200:
                case_json = case_json_res.json()
                
            # 4. Fetch element-executions (execution history)
            elem_url = f"{BASE_URL}/{ORG_NAME}/{TENANT_NAME}/pims_/api/v1/element-executions/case-instances/{instance_id}"
            elem_res = await client.get(elem_url, headers=headers)
            executions = []
            if elem_res.status_code == 200:
                executions = elem_res.json().get("elementExecutions", [])
                
            # Process stages
            processed_stages = []
            if case_json and "nodes" in case_json:
                exec_map = {ex["elementId"]: ex for ex in executions if isinstance(ex, dict) and "elementId" in ex}
                
                bindings_map = {}
                if "root" in case_json and isinstance(case_json["root"], dict):
                    data_obj = case_json["root"].get("data", {})
                    if isinstance(data_obj, dict):
                        uipath_obj = data_obj.get("uipath", {})
                        if isinstance(uipath_obj, dict):
                            bindings = uipath_obj.get("bindings", [])
                            for binding in bindings:
                                if isinstance(binding, dict) and "id" in binding:
                                    bindings_map[binding["id"]] = binding
                            
                def resolve_binding(val):
                    if isinstance(val, str) and val.startswith("=bindings."):
                        b_id = val[len("=bindings."):]
                        b = bindings_map.get(b_id)
                        if b:
                            return b.get("default") or b.get("name") or val
                    return val

                for node in case_json.get("nodes", []):
                    if not isinstance(node, dict):
                        continue
                    node_type = node.get("type")
                    stage_type = node.get("stageType")
                    if node_type != "case-management:Trigger" and stage_type != "case-management:ExceptionStage":
                        node_id = node.get("id")
                        node_exec = exec_map.get(node_id) if node_id else None
                        
                        processed_tasks = []
                        tasks_data = node.get("data", {}).get("tasks", [])
                        for task_group in tasks_data:
                            if isinstance(task_group, list):
                                for task in task_group:
                                    if not isinstance(task, dict):
                                        continue
                                    t_id = task.get("id") or task.get("elementId")
                                    t_exec = exec_map.get(t_id) if t_id else None
                                    
                                    t_name = task.get("displayName")
                                    if not t_name and isinstance(task.get("data"), dict) and task["data"].get("name"):
                                        t_name = resolve_binding(task["data"]["name"])
                                        
                                    processed_tasks.append({
                                        "id": t_id or "undefined",
                                        "name": t_name or "undefined",
                                        "startedTime": t_exec.get("startedTimeUtc") if t_exec else None,
                                        "completedTime": t_exec.get("completedTimeUtc") if t_exec else None,
                                        "status": t_exec.get("status", "Not Started") if t_exec else "Not Started",
                                        "type": task.get("type", "undefined")
                                    })
                                    
                        derived_status = "pending"
                        if processed_tasks:
                            if all(t["status"] == "Completed" for t in processed_tasks):
                                derived_status = "completed"
                            elif any(t["status"] != "Not Started" for t in processed_tasks):
                                derived_status = "in_progress"
                        else:
                            norm_status = node_exec.get("status", "Not Started").lower() if node_exec else "not started"
                            if norm_status == "completed":
                                derived_status = "completed"
                            elif norm_status == "running" or norm_status == "inprogress":
                                derived_status = "in_progress"
                                
                        processed_stages.append({
                            "id": node_id,
                            "title": node.get("data", {}).get("label") or "Undefined Stage",
                            "status": derived_status,
                            "description": node.get("data", {}).get("description") or "",
                            "tasks": processed_tasks
                        })
                        
            return {
                "instance": instance,
                "variables": vars_dict,
                "stages": processed_stages
            }
        except httpx.RequestError as e:
            raise HTTPException(status_code=502, detail=f"UiPath API connection failed: {e}")

@app.post("/api/cases/tasks/complete")
async def complete_task(payload: CompleteTaskRequest, session_data: dict = Depends(get_current_session)):
    try:
        with open(os.path.join(backend_dir, "session.log"), "a", encoding="utf-8") as f:
            f.write(f"ENTERED complete_task body | taskId: {payload.taskId} | folderId: {payload.folderId}\n")
        session_id = session_data["session_id"]
        session = await refresh_session_token_if_needed(session_id, session_data["session"])
        
        url = f"{BASE_URL}/{ORG_NAME}/{TENANT_NAME}/orchestrator_/tasks/AppTasks/CompleteAppTask"
        headers = {
            "Authorization": f"Bearer {session['access_token']}",
            "Accept": "application/json",
            "X-UIPATH-OrganizationUnitId": str(payload.folderId)
        }
        
        complete_body = {
            "taskId": payload.taskId,
            "data": payload.data,
            "action": payload.action
        }
        
        async with httpx.AsyncClient() as client:
            res = await client.post(url, headers=headers, json=complete_body)
            if res.status_code != 200:
                raise HTTPException(status_code=res.status_code, detail=res.text)
            return {"success": True}
    except Exception as e:
        import traceback
        with open(os.path.join(backend_dir, "global_error.log"), "a", encoding="utf-8") as f:
            f.write(f"COMPLETE TASK EXCEPTION: {e}\n{traceback.format_exc()}\n")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/cases/tasks/assign")
async def assign_task(payload: AssignTaskRequest, session_data: dict = Depends(get_current_session)):
    try:
        with open(os.path.join(backend_dir, "session.log"), "a", encoding="utf-8") as f:
            f.write(f"ENTERED assign_task body | taskId: {payload.taskId} | folderId: {payload.folderId}\n")
        session_id = session_data["session_id"]
        session = await refresh_session_token_if_needed(session_id, session_data["session"])
        
        email = extract_email_from_jwt(session["access_token"])
        if not email:
            raise HTTPException(status_code=400, detail="Could not determine user email from token")
            
        url = f"{BASE_URL}/{ORG_NAME}/{TENANT_NAME}/orchestrator_/odata/Tasks/UiPath.Server.Configuration.OData.AssignTasks"
        headers = {
            "Authorization": f"Bearer {session['access_token']}",
            "Accept": "application/json",
            "X-UIPATH-OrganizationUnitId": str(payload.folderId)
        }
        
        assign_body = {
            "taskAssignments": [
                {"TaskId": payload.taskId, "UserNameOrEmail": email}
            ]
        }
        
        async with httpx.AsyncClient() as client:
            res = await client.post(url, headers=headers, json=assign_body)
            with open(os.path.join(backend_dir, "session.log"), "a", encoding="utf-8") as f:
                f.write(f"AssignTasks Response: status={res.status_code} | body={res.text}\n")
            if res.status_code != 204 and res.status_code != 200:
                raise HTTPException(status_code=res.status_code, detail=res.text)
            
            if res.status_code == 200:
                try:
                    resp_json = res.json()
                    value_list = resp_json.get("value", [])
                    if value_list and isinstance(value_list, list):
                        error_item = value_list[0]
                        if isinstance(error_item, dict):
                            error_code = error_item.get("ErrorCode")
                            error_msg = error_item.get("ErrorMessage")
                            if error_code and error_code != 2417:
                                raise HTTPException(status_code=400, detail=error_msg or "Failed to assign task")
                except Exception as e:
                    if isinstance(e, HTTPException):
                        raise e
                    pass
            return {"success": True}
    except Exception as e:
        import traceback
        with open(os.path.join(backend_dir, "global_error.log"), "a", encoding="utf-8") as f:
            f.write(f"ASSIGN TASK EXCEPTION: {e}\n{traceback.format_exc()}\n")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/cases/tasks/unassign")
async def unassign_task(payload: AssignTaskRequest, session_data: dict = Depends(get_current_session)):
    try:
        with open(os.path.join(backend_dir, "session.log"), "a", encoding="utf-8") as f:
            f.write(f"ENTERED unassign_task body | taskId: {payload.taskId} | folderId: {payload.folderId}\n")
        session_id = session_data["session_id"]
        session = await refresh_session_token_if_needed(session_id, session_data["session"])
        
        url = f"{BASE_URL}/{ORG_NAME}/{TENANT_NAME}/orchestrator_/odata/Tasks/UiPath.Server.Configuration.OData.UnassignTasks"
        headers = {
            "Authorization": f"Bearer {session['access_token']}",
            "Accept": "application/json",
            "X-UIPATH-OrganizationUnitId": str(payload.folderId)
        }
        
        unassign_body = {
            "taskIds": [payload.taskId]
        }
        
        async with httpx.AsyncClient() as client:
            res = await client.post(url, headers=headers, json=unassign_body)
            with open(os.path.join(backend_dir, "session.log"), "a", encoding="utf-8") as f:
                f.write(f"UnassignTasks Response: status={res.status_code} | body={res.text}\n")
            if res.status_code != 204 and res.status_code != 200:
                raise HTTPException(status_code=res.status_code, detail=res.text)
            
            if res.status_code == 200:
                try:
                    resp_json = res.json()
                    value_list = resp_json.get("value", [])
                    if value_list and isinstance(value_list, list):
                        error_item = value_list[0]
                        if isinstance(error_item, dict):
                            error_code = error_item.get("ErrorCode")
                            error_msg = error_item.get("ErrorMessage")
                            if error_code:
                                raise HTTPException(status_code=400, detail=error_msg or "Failed to unassign task")
                except Exception as e:
                    if isinstance(e, HTTPException):
                        raise e
                    pass
            return {"success": True}
    except Exception as e:
        import traceback
        with open(os.path.join(backend_dir, "global_error.log"), "a", encoding="utf-8") as f:
            f.write(f"UNASSIGN TASK EXCEPTION: {e}\n{traceback.format_exc()}\n")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/tasks/my-tasks")
async def get_my_tasks(session_data: dict = Depends(get_current_session)):
    """Fetch all pending HITL tasks across folders for the current user (assigned or unassigned)."""
    session_id = session_data["session_id"]
    session = await refresh_session_token_if_needed(session_id, session_data["session"])

    current_user_email = extract_email_from_jwt(session["access_token"])

    headers = {
        "Authorization": f"Bearer {session['access_token']}",
        "Accept": "application/json",
    }

    async with httpx.AsyncClient() as client:
        try:
            # 1. Get all folders the user has access to
            folders_url = f"{BASE_URL}/{ORG_NAME}/{TENANT_NAME}/orchestrator_/api/Folders/GetAllForCurrentUser"
            folders_res = await client.get(folders_url, headers=headers)
            folders = []
            if folders_res.status_code == 200:
                folders_data = folders_res.json()
                folders = folders_data.get("PageItems", [])

            # 2. Fetch tasks across all folders (Pending + InProgress)
            tasks_url = (
                f"{BASE_URL}/{ORG_NAME}/{TENANT_NAME}/orchestrator_/odata/Tasks"
                f"/UiPath.Server.Configuration.OData.GetTasksAcrossFolders"
                f"?$filter=Status ne 'Completed'"
                f"&$orderby=CreationTime desc&$top=100"
            )
            tasks_res = await client.get(tasks_url, headers=headers)
            if tasks_res.status_code != 200:
                raise HTTPException(status_code=tasks_res.status_code, detail=tasks_res.text)

            tasks_data = tasks_res.json()
            raw_tasks = tasks_data.get("value", [])

            # Build folder lookup: folderId -> (folderKey, folderName)
            folder_map: dict = {}
            for f in folders:
                fid = f.get("Id")
                if fid:
                    folder_map[fid] = {"key": f.get("Key", ""), "name": f.get("FullyQualifiedName", f.get("DisplayName", ""))}

            result_tasks = []
            for t in raw_tasks:
                folder_id = t.get("OrganizationUnitId")
                folder_info = folder_map.get(folder_id, {})
                folder_key = folder_info.get("key", "")

                task_id = str(t.get("Id", ""))
                external_link = None
                if task_id:
                    external_link = f"{BASE_URL}/{ORG_NAME}/{TENANT_NAME}/actions_/current-task/tasks/{task_id}"

                # Fetch full task details to retrieve the custom form/action data
                task_data_payload = {}
                detail_obj = {}
                if task_id and folder_id:
                    detail_url = f"{BASE_URL}/{ORG_NAME}/{TENANT_NAME}/orchestrator_/tasks/AppTasks/GetAppTaskById?taskId={task_id}"
                    detail_headers = {**headers, "X-UIPATH-OrganizationUnitId": str(folder_id)}
                    try:
                        detail_res = await client.get(detail_url, headers=detail_headers)
                        if detail_res.status_code == 200:
                            detail_obj = detail_res.json()
                            task_data_payload = detail_obj.get("data") or detail_obj.get("Data") or {}
                            # Fix: Ensure taskId and priority inside task data are populated if null/empty
                            if isinstance(task_data_payload, dict):
                                if not task_data_payload.get("taskId"):
                                    task_data_payload["taskId"] = task_id
                                if not task_data_payload.get("priority"):
                                    task_data_payload["priority"] = t.get("Priority") or "Medium"
                    except Exception as e:
                        print(f"Error fetching task details for task {task_id}: {e}")

                # Determine assignment using raw tasks (fallback) OR detail_obj (primary)
                assigned_user = detail_obj.get("assignedToUser") or detail_obj.get("AssignedToUser") or t.get("AssignedToUser")
                assigned_email = None
                if assigned_user:
                    if isinstance(assigned_user, dict):
                        assigned_email = (
                            assigned_user.get("emailAddress")
                            or assigned_user.get("Email")
                            or assigned_user.get("userName")
                            or assigned_user.get("Name")
                            or assigned_user.get("UserNameOrEmail")
                        )
                    elif isinstance(assigned_user, str):
                        assigned_email = assigned_user

                # Show tasks that are unassigned OR assigned to the current user
                if assigned_email and current_user_email and assigned_email.lower() != current_user_email.lower():
                    continue

                result_tasks.append({
                    "taskId": task_id,
                    "folderId": folder_id,
                    "folderKey": folder_key,
                    "title": t.get("Title") or t.get("Name") or "Approval Task",
                    "priority": t.get("Priority", "Medium"),
                    "status": t.get("Status", "Pending"),
                    "assignedToUser": assigned_email,
                    "caseInstanceId": str(t.get("JobKey") or t.get("JobId") or ""),
                    "createdAt": t.get("CreationTime", ""),
                    "data": task_data_payload,
                    "externalLink": external_link,
                    "currentUserEmail": current_user_email,
                })

            return {"tasks": result_tasks, "count": len(result_tasks)}

        except httpx.RequestError as e:
            raise HTTPException(status_code=502, detail=f"UiPath API connection failed: {e}")

@app.get("/api/tasks/history")
async def get_tasks_history(session_data: dict = Depends(get_current_session)):
    """Fetch completed HITL tasks across folders for the current user."""
    session_id = session_data["session_id"]
    session = await refresh_session_token_if_needed(session_id, session_data["session"])

    current_user_email = extract_email_from_jwt(session["access_token"])

    headers = {
        "Authorization": f"Bearer {session['access_token']}",
        "Accept": "application/json",
    }

    async with httpx.AsyncClient() as client:
        try:
            # 1. Get all folders the user has access to
            folders_url = f"{BASE_URL}/{ORG_NAME}/{TENANT_NAME}/orchestrator_/api/Folders/GetAllForCurrentUser"
            folders_res = await client.get(folders_url, headers=headers)
            folders = []
            if folders_res.status_code == 200:
                folders_data = folders_res.json()
                folders = folders_data.get("PageItems", [])

            # 2. Fetch completed tasks across all folders
            tasks_url = (
                f"{BASE_URL}/{ORG_NAME}/{TENANT_NAME}/orchestrator_/odata/Tasks"
                f"/UiPath.Server.Configuration.OData.GetTasksAcrossFolders"
                f"?$filter=Status eq 'Completed'"
                f"&$orderby=LastModificationTime desc&$top=100"
            )
            tasks_res = await client.get(tasks_url, headers=headers)
            if tasks_res.status_code != 200:
                raise HTTPException(status_code=tasks_res.status_code, detail=tasks_res.text)

            tasks_data = tasks_res.json()
            raw_tasks = tasks_data.get("value", [])

            folder_map: dict = {}
            for f in folders:
                fid = f.get("Id")
                if fid:
                    folder_map[fid] = {"key": f.get("Key", ""), "name": f.get("FullyQualifiedName", f.get("DisplayName", ""))}

            result_tasks = []
            for t in raw_tasks:
                folder_id = t.get("OrganizationUnitId")
                folder_info = folder_map.get(folder_id, {})
                folder_key = folder_info.get("key", "")

                task_id = str(t.get("Id", ""))
                
                # Fetch full task details to retrieve the custom form/action data and final action taken
                task_data_payload = {}
                action_taken = None
                detail_obj = {}
                if task_id and folder_id:
                    detail_url = f"{BASE_URL}/{ORG_NAME}/{TENANT_NAME}/orchestrator_/tasks/AppTasks/GetAppTaskById?taskId={task_id}"
                    detail_headers = {**headers, "X-UIPATH-OrganizationUnitId": str(folder_id)}
                    try:
                        detail_res = await client.get(detail_url, headers=detail_headers)
                        if detail_res.status_code == 200:
                            detail_obj = detail_res.json()
                            task_data_payload = detail_obj.get("data") or detail_obj.get("Data") or {}
                            action_taken = detail_obj.get("action") or detail_obj.get("Action")
                    except Exception as e:
                        print(f"Error fetching task details for completed task {task_id}: {e}")

                assigned_user = detail_obj.get("assignedToUser") or detail_obj.get("AssignedToUser") or t.get("AssignedToUser")
                assigned_email = None
                if assigned_user:
                    if isinstance(assigned_user, dict):
                        assigned_email = (
                            assigned_user.get("emailAddress")
                            or assigned_user.get("Email")
                            or assigned_user.get("userName")
                            or assigned_user.get("Name")
                            or assigned_user.get("UserNameOrEmail")
                        )
                    elif isinstance(assigned_user, str):
                        assigned_email = assigned_user

                if assigned_email and current_user_email and assigned_email.lower() != current_user_email.lower():
                    continue

                result_tasks.append({
                    "taskId": task_id,
                    "folderId": folder_id,
                    "folderKey": folder_key,
                    "title": t.get("Title") or t.get("Name") or "Approval Task",
                    "priority": t.get("Priority", "Medium"),
                    "status": t.get("Status", "Completed"),
                    "assignedToUser": assigned_email,
                    "actionTaken": action_taken or t.get("Action") or "Completed",
                    "caseInstanceId": str(t.get("JobKey") or t.get("JobId") or ""),
                    "createdAt": t.get("CreationTime", ""),
                    "completedAt": t.get("CompletionTime") or t.get("LastModificationTime") or "",
                    "data": task_data_payload,
                    "currentUserEmail": current_user_email,
                })

            return {"tasks": result_tasks, "count": len(result_tasks)}
        except httpx.RequestError as e:
            raise HTTPException(status_code=502, detail=f"UiPath API connection failed: {e}")

@app.get("/api/stats/overview")
async def get_trade_overview(session_data: dict = Depends(get_current_session)):
    """
    Aggregate live trade stats from running case instances:
    - Unique port-of-loading → port-of-entry routes
    - OFAC screening summary
    - ISF filing summary
    - Active / completed counts
    Returns quickly by sampling up to 20 running instances in parallel.
    """
    session_id = session_data["session_id"]
    session = await refresh_session_token_if_needed(session_id, session_data["session"])

    base_headers = {
        "Authorization": f"Bearer {session['access_token']}",
        "Accept": "application/json",
    }

    async with httpx.AsyncClient(timeout=15) as client:
        try:
            # 1. Get all case processes
            processes_url = f"{BASE_URL}/{ORG_NAME}/{TENANT_NAME}/pims_/api/v1/processes/summary?processType=CaseManagement"
            proc_res = await client.get(processes_url, headers=base_headers)
            if proc_res.status_code != 200:
                return {"routes": [], "ofac": {}, "isf": {}, "activeCases": 0, "activeInstances": 0, "error": "processes unavailable"}

            processes = proc_res.json().get("processes", [])
            total_running = sum(p.get("runningCount", 0) for p in processes)
            total_completed = sum(p.get("completedCount", 0) for p in processes)

            # 2. Collect up to 20 running instance IDs across all processes (for variable sampling)
            instance_samples = []
            for proc in processes:
                if proc.get("runningCount", 0) == 0:
                    continue
                pk = proc.get("processKey", "")
                if not pk:
                    continue
                inst_url = f"{BASE_URL}/{ORG_NAME}/{TENANT_NAME}/pims_/api/v1/instances?processKey={pk}&pageSize=10&processType=CaseManagement"
                inst_res = await client.get(inst_url, headers=base_headers)
                if inst_res.status_code == 200:
                    instances = inst_res.json().get("instances", [])
                    for inst in instances:
                        if inst.get("latestRunStatus", "").lower() in ("inprogress", "running"):
                            instance_samples.append({
                                "instanceId": inst.get("instanceId", ""),
                                "folderKey": inst.get("folderKey", "")
                            })
                            if len(instance_samples) >= 20:
                                break
                if len(instance_samples) >= 20:
                    break

            # 3. Fetch variables for sampled instances in parallel
            async def fetch_vars(inst_id: str, folder_key: str) -> dict:
                try:
                    headers = {**base_headers, "x-uipath-folderkey": folder_key}
                    vars_url = f"{BASE_URL}/{ORG_NAME}/{TENANT_NAME}/pims_/api/v1/instances/{inst_id}/variables"
                    r = await client.get(vars_url, headers=headers)
                    if r.status_code != 200:
                        return {}
                    raw = r.json()
                    # normalise list or dict format
                    if isinstance(raw, list):
                        return {v["name"]: v["value"] for v in raw if isinstance(v, dict) and "name" in v and "value" in v}
                    elif isinstance(raw, dict) and "variables" in raw:
                        return {v["name"]: v["value"] for v in raw["variables"] if isinstance(v, dict) and "name" in v and "value" in v}
                    elif isinstance(raw, dict):
                        return raw
                    return {}
                except Exception:
                    return {}

            import asyncio
            vars_list = await asyncio.gather(*[
                fetch_vars(s["instanceId"], s["folderKey"]) for s in instance_samples
            ])

            # 4. Aggregate stats from variable bags
            routes_set: set = set()
            ofac_counts: dict = {}
            isf_counts: dict = {}

            for v in vars_list:
                pol = str(v.get("portOfLoading") or v.get("PortOfLoading") or "").strip()
                poe = str(v.get("portOfEntryUSA") or v.get("portOfEntry") or v.get("PortOfEntry") or "").strip()
                if pol and poe:
                    routes_set.add(f"{pol} → {poe}")
                elif pol:
                    routes_set.add(f"{pol} → (en route)")
                elif poe:
                    routes_set.add(f"(origin TBD) → {poe}")

                ofac = str(v.get("ofacScreeningResult") or v.get("OFACScreeningResult") or "").strip()
                if ofac:
                    ofac_counts[ofac] = ofac_counts.get(ofac, 0) + 1

                isf = str(v.get("isfFilingStatus") or v.get("ISFFilingStatus") or "").strip()
                if isf:
                    isf_counts[isf] = isf_counts.get(isf, 0) + 1

            return {
                "routes": sorted(routes_set),
                "ofac": ofac_counts,
                "isf": isf_counts,
                "activeInstances": total_running,
                "completedInstances": total_completed,
                "sampledInstances": len(instance_samples),
            }

        except httpx.RequestError as e:
            raise HTTPException(status_code=502, detail=f"UiPath API connection failed: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=True)
