from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import requests
import uuid
import json
from datetime import datetime
from typing import Any, Dict

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User, UserRole
from app.models.project import Project, ProjectStatus
from app.schemas.brief import BriefStartRequest, BriefSubmitRequest, BriefResponse
from app.core.config import settings

router = APIRouter()

@router.post("/start", response_model=Dict[str, Any])
async def start_brief(
    request: BriefStartRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Create a project entry to act as a session
    # Find a manager if needed, or assign to self if admin/manager
    manager_id = current_user.id
    if current_user.role == UserRole.client:
        manager = db.query(User).filter(User.role == UserRole.manager).first()
        if manager:
            manager_id = manager.id

    db_project = Project(
        name=request.seed.project_name,
        description=f"Objective: {request.seed.objective}",
        status=ProjectStatus.briefing,
        client_id=current_user.id,
        manager_id=manager_id,
        brief_history=json.dumps({"seed": request.seed.model_dump()})
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)

    # 2. Call n8n webhook
    if not settings.N8N_BRIEF_WEBHOOK_URL:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="N8N Webhook URL not configured"
        )

    payload = {
        "sessionId": str(db_project.id),
        "timestamp": datetime.now().isoformat(),
        "seed": request.seed.model_dump(),
        "context": {
            "source": "webapp_brief",
            "appVersion": settings.VERSION,
            "user_id": str(current_user.id)
        }
    }

    headers = {
        "X-Webhook-Secret": settings.N8N_WEBHOOK_SECRET or ""
    }

    try:
        response = requests.post(
            settings.N8N_BRIEF_WEBHOOK_URL,
            json=payload,
            headers=headers,
            timeout=10
        )
        response.raise_for_status()
        
        raw_text = response.text.strip()
        print(f"DEBUG: N8N Start Raw Response -> {raw_text[:500]}...")
        
        n8n_data = None
        
        # 1. Try standard JSON parsing
        try:
            n8n_data = response.json()
        except ValueError:
            # 2. Try parsing as NDJSON
            lines = raw_text.split('\n')
            for line in reversed(lines):
                if not line.strip(): continue
                try:
                    parsed_line = json.loads(line)
                    if isinstance(parsed_line, dict):
                        if "mode" in parsed_line:
                            n8n_data = parsed_line
                            break
                        elif parsed_line.get("type") == "item" and "content" in parsed_line:
                            content_str = parsed_line["content"].strip()
                            # Strip markdown code blocks if present
                            if content_str.startswith("```"):
                                lines_c = content_str.split('\n')
                                if lines_c[0].startswith("```"):
                                    content_str = "\n".join(lines_c[1:-1]).strip()
                                else:
                                    content_str = content_str.strip("`").strip()
                            
                            try:
                                content_json = json.loads(content_str)
                                if isinstance(content_json, dict) and "mode" in content_json:
                                    n8n_data = content_json
                                    break
                            except:
                                continue
                except:
                    continue
        
        if not n8n_data:
            print(f"ERROR: No valid brief schema in n8n response: {raw_text}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="The automation engine returned an unexpected format. Please check n8n node configuration."
            )

        # If complete immediately
        if n8n_data.get("mode") == "complete" or n8n_data.get("code") == 333 or str(n8n_data.get("code")) == "333":
            db_project.status = ProjectStatus.planning
            db_project.brief_content = n8n_data.get("brief_content", "Brief generated successfully.")
            db_project.next_question = None
        else:
            db_project.next_question = json.dumps(n8n_data)
            
        db.commit()
        
        return {
            "sessionId": str(db_project.id),
            "n8n_response": n8n_data
        }

    except requests.exceptions.RequestException as e:
        print(f"ERROR calling n8n: {str(e)}")
        # If n8n fails, we still have the project but we can't proceed with the flow
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Communication with automation engine failed. Please try again later."
        )

@router.get("/status/{session_id}", response_model=Dict[str, Any])
async def get_brief_status(
    session_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_project = db.query(Project).filter(Project.id == session_id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if db_project.client_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Access denied")

    n8n_response = None
    if db_project.next_question:
        try:
            n8n_response = json.loads(db_project.next_question)
        except:
            pass

    return {
        "sessionId": str(db_project.id),
        "status": db_project.status,
        "n8n_response": n8n_response,
        "brief_content": db_project.brief_content
    }

@router.post("/submit", response_model=Dict[str, Any])
async def submit_brief_step(
    request: BriefSubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Verify project/session
    db_project = db.query(Project).filter(Project.id == request.sessionId).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if db_project.client_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Access denied")

    # 2. Update history
    history = json.loads(db_project.brief_history or "{}")
    if "steps" not in history:
        history["steps"] = []
    history["steps"].append(request.data)
    db_project.brief_history = json.dumps(history)
    db.commit()

    # 3. Call n8n for next step or completion
    payload = {
        "sessionId": str(db_project.id),
        "timestamp": datetime.now().isoformat(),
        "data": request.data,
        "context": {
            "source": "webapp_brief",
            "appVersion": settings.VERSION
        }
    }

    headers = {
        "X-Webhook-Secret": settings.N8N_WEBHOOK_SECRET or ""
    }

    try:
        response = requests.post(
            settings.N8N_BRIEF_WEBHOOK_URL,
            json=payload,
            headers=headers,
            timeout=10
        )
        response.raise_for_status()
        
        raw_text = response.text.strip()
        print(f"DEBUG: N8N Raw Response -> {raw_text[:500]}...")
        
        n8n_data = None
        
        # 1. Try standard JSON parsing
        try:
            n8n_data = response.json()
        except ValueError:
            # 2. Try parsing as NDJSON (Newline Delimited JSON)
            # n8n sometimes returns execution trails/multiple objects
            lines = raw_text.split('\n')
            for line in reversed(lines):
                if not line.strip(): continue
                try:
                    parsed_line = json.loads(line)
                    # Check if this is the actual content wrapped in n8n metadata
                    if isinstance(parsed_line, dict):
                        if "mode" in parsed_line:
                            n8n_data = parsed_line
                            break
                        elif parsed_line.get("type") == "item" and "content" in parsed_line:
                            content_str = parsed_line["content"].strip()
                            # Strip markdown code blocks if present
                            if content_str.startswith("```"):
                                lines_c = content_str.split('\n')
                                if lines_c[0].startswith("```"):
                                    content_str = "\n".join(lines_c[1:-1]).strip()
                                else:
                                    content_str = content_str.strip("`").strip()
                            
                            try:
                                content_json = json.loads(content_str)
                                if isinstance(content_json, dict) and "mode" in content_json:
                                    n8n_data = content_json
                                    break
                            except:
                                continue
                except:
                    continue
        
        if not n8n_data:
            print(f"ERROR: Could not find valid brief data in n8n response: {raw_text}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Invalid response format from automation engine."
            )

        # If complete (either via mode or custom code 333), update project status
        if n8n_data.get("mode") == "complete" or n8n_data.get("code") == 333 or str(n8n_data.get("code")) == "333":
            db_project.status = ProjectStatus.planning
            db_project.brief_content = n8n_data.get("brief_content", "Brief generated and sent successfully.")
            db_project.next_question = None
        else:
            db_project.next_question = json.dumps(n8n_data)
        
        db.commit()
        
        return n8n_data

    except requests.exceptions.RequestException as e:
        print(f"ERROR calling n8n: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Communication with automation engine failed."
        )
