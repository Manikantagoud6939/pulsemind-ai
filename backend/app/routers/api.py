from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import json

from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.config import settings
from app.models.models import (
    User, Project, Document, DocumentChunk, CompanyMemoryEvent,
    DecisionRecord, KnowledgeGap, PolicyConflict, Meeting, OnboardingPath,
    Notification, ChatSession, ChatMessage
)
from app.schemas.schemas import (
    UserLogin, UserCreate, UserResponse, Token, SessionResponse,
    MessageCreate, MessageResponse, ProjectResponse, EventResponse,
    DecisionResponse, KnowledgeGapResponse, PolicyConflictResponse,
    MeetingResponse, OnboardingPathResponse, NotificationResponse
)
from app.services.rag_service import RAGService
from app.services.agent_orchestrator import AgentOrchestrator
from app.services.analysis_service import AnalysisService

# Security dependencies
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

router = APIRouter()

def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

# Helper to enforce roles
class RoleChecker:
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: User = Depends(get_current_user)):
        if current_user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted for your role"
            )

# --- AUTHENTICATION ---
@router.post("/auth/register", response_model=Token)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user_in.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    new_user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=user_in.role,
        department=user_in.department,
        skills=user_in.skills
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    access_token = create_access_token(subject=new_user.email)
    return {"access_token": access_token, "token_type": "bearer", "user": new_user}

@router.post("/auth/login", response_model=Token)
def login(user_in: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_in.email).first()
    if not user or not verify_password(user_in.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    access_token = create_access_token(subject=user.email)
    return {"access_token": access_token, "token_type": "bearer", "user": user}

@router.get("/auth/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# --- AI CHAT & RAG ENGINE ---
@router.post("/chat/sessions", response_model=SessionResponse)
def create_chat_session(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    session = ChatSession(user_id=current_user.id, title="New Conversation")
    db.add(session)
    db.commit()
    db.refresh(session)
    return session

@router.get("/chat/sessions", response_model=List[SessionResponse])
def get_chat_sessions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(ChatSession).filter(ChatSession.user_id == current_user.id).order_by(ChatSession.created_at.desc()).all()

@router.post("/chat/sessions/{session_id}/messages")
def send_chat_message(
    session_id: int,
    msg_in: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    session = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
        
    # Save User message
    user_msg = ChatMessage(session_id=session.id, sender="user", content=msg_in.content)
    db.add(user_msg)
    
    # Run Orchestrator (Multi-Agent RAG)
    orchestrator_response = AgentOrchestrator.process_query(db, msg_in.content, current_user.id)
    
    # Save AI message
    ai_msg = ChatMessage(
        session_id=session.id,
        sender="assistant",
        content=orchestrator_response["answer"],
        citations=orchestrator_response["citations"]
    )
    db.add(ai_msg)
    db.commit()
    db.refresh(ai_msg)

    # Automatically set title on first message
    if session.title == "New Conversation":
        session.title = msg_in.content[:30] + "..." if len(msg_in.content) > 30 else msg_in.content
        db.commit()
        
    return {
        "user_message": user_msg,
        "assistant_message": ai_msg,
        "agents_involved": orchestrator_response.get("agents_involved", []),
        "collab_log": orchestrator_response.get("collab_log", "")
    }

# --- DOCUMENT CENTER & CONFLICT DETECTOR ---
@router.post("/documents/upload")
def upload_document(
    title: str,
    department: str,
    file_type: str,
    content: str,  # Simplification for hackathon upload
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Create Document record
    doc = Document(
        title=title,
        file_path=f"file:///documents/{title.replace(' ', '_').lower()}.txt",
        file_type="text",
        uploaded_by=current_user.id,
        department=department,
        summary=content[:300] + "..." if len(content) > 300 else content
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    
    # Split content and generate embeddings
    chunks = [content[i:i+800] for i in range(0, len(content), 700)]
    for idx, text in enumerate(chunks):
        embedding_val = RAGService.get_embedding(text)
        chunk = DocumentChunk(
            document_id=doc.id,
            content=text,
            chunk_index=idx,
            embedding=embedding_val
        )
        db.add(chunk)
    db.commit()
    
    # Log to Timeline
    event = CompanyMemoryEvent(
        event_type="Document Uploaded",
        title=f"New Policy/Doc: {title}",
        description=f"Document '{title}' uploaded for department '{department}'. Summary: {doc.summary}",
        recorded_by=current_user.id,
        metadata_json={"document_id": doc.id}
    )
    db.add(event)
    db.commit()

    # Trigger Policy Conflict Scan
    AnalysisService.detect_policy_conflicts(db)
    
    return {"message": "Document uploaded and indexed successfully", "document_id": doc.id}

@router.get("/documents", response_model=List[Dict[str, Any]])
def get_documents(db: Session = Depends(get_db)):
    docs = db.query(Document).all()
    return [{"id": d.id, "title": d.title, "file_path": d.file_path, "department": d.department, "uploaded_by": d.uploader.full_name if d.uploader else "System", "created_at": d.created_at} for d in docs]

@router.get("/conflicts", response_model=List[PolicyConflictResponse])
def get_conflicts(db: Session = Depends(get_db)):
    return db.query(PolicyConflict).order_by(PolicyConflict.created_at.desc()).all()

# --- MEETINGS ANALYZER ---
@router.post("/meetings/analyze")
def create_and_analyze_meeting(
    title: str,
    transcript: str,
    project_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    meeting = Meeting(
        title=title,
        meeting_date=datetime.now(),
        transcript=transcript,
        recorded_by=current_user.id,
        project_id=project_id
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    
    analyzed_meeting = AnalysisService.analyze_meeting(db, meeting.id)
    return analyzed_meeting

@router.get("/meetings", response_model=List[MeetingResponse])
def get_meetings(db: Session = Depends(get_db)):
    return db.query(Meeting).order_by(Meeting.meeting_date.desc()).all()

# --- ONBOARDING ENGINE ---
@router.post("/onboarding/generate/{user_id}", response_model=OnboardingPathResponse)
def generate_employee_onboarding(
    user_id: int,
    db: Session = Depends(get_db),
    check_role = Depends(RoleChecker(["Super Admin", "Admin", "HR"]))
):
    path = AnalysisService.generate_onboarding(db, user_id)
    if not path:
        raise HTTPException(status_code=404, detail="User not found")
    return path

@router.get("/onboarding/{user_id}", response_model=OnboardingPathResponse)
def get_employee_onboarding(user_id: int, db: Session = Depends(get_db)):
    path = db.query(OnboardingPath).filter(OnboardingPath.user_id == user_id).first()
    if not path:
        # Create a basic onboarding automatically
        return generate_employee_onboarding(user_id, db)
    return path

@router.put("/onboarding/{user_id}/progress")
def update_onboarding_progress(user_id: int, progress: float, db: Session = Depends(get_db)):
    path = db.query(OnboardingPath).filter(OnboardingPath.user_id == user_id).first()
    if not path:
        raise HTTPException(status_code=404, detail="Onboarding not found")
    path.progress_percentage = min(100.0, max(0.0, progress))
    db.commit()
    return {"status": "success", "progress": path.progress_percentage}

# --- DIRECTORY & EXPERTISE FINDER ---
@router.get("/employees", response_model=List[UserResponse])
def get_employees(db: Session = Depends(get_db)):
    return db.query(User).all()

@router.get("/expertise/search")
def search_experts(skill: str, db: Session = Depends(get_db)):
    users = db.query(User).all()
    matched_experts = []
    
    # Query details based on skill match
    for u in users:
        # Check skill matches (case insensitive matching)
        if any(skill.lower() in s.lower() for s in u.skills):
            # Dynamic rating logic for hackathon visual polish
            rating = 5 if any("lead" in u.role.lower() or "senior" in u.role.lower() for s in u.skills) else 4
            if "junior" in u.role.lower():
                rating = 3
                
            matched_experts.append({
                "id": u.id,
                "full_name": u.full_name,
                "role": u.role,
                "department": u.department,
                "avatar_url": u.avatar_url,
                "skills": u.skills,
                "rating": rating,
                "availability": u.availability_status,
                "experience": "4+ Years" if rating >= 4 else "1-2 Years",
                "projects": [p.name for p in db.query(Project).limit(2).all()]
            })
            
    return matched_experts

# --- COMPANY MEMORY TIMELINE ---
@router.get("/timeline", response_model=List[EventResponse])
def get_timeline(db: Session = Depends(get_db)):
    return db.query(CompanyMemoryEvent).order_by(CompanyMemoryEvent.event_date.desc()).all()

# --- DECISION LOGS ---
@router.get("/decisions", response_model=List[DecisionResponse])
def get_decisions(db: Session = Depends(get_db)):
    return db.query(DecisionRecord).order_by(DecisionRecord.decision_date.desc()).all()

# --- PROJECT HEALTH ---
@router.get("/projects", response_model=List[ProjectResponse])
def get_projects(db: Session = Depends(get_db)):
    return db.query(Project).all()

# --- KNOWLEDGE GAPS ---
@router.get("/gaps", response_model=List[KnowledgeGapResponse])
def get_gaps(db: Session = Depends(get_db)):
    return db.query(KnowledgeGap).order_by(KnowledgeGap.hit_count.desc()).all()

# --- NOTIFICATIONS ---
@router.get("/notifications", response_model=List[NotificationResponse])
def get_notifications(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Notification).filter(Notification.user_id == current_user.id).order_by(Notification.created_at.desc()).all()

@router.put("/notifications/{notif_id}/read")
def read_notification(notif_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    notif = db.query(Notification).filter(Notification.id == notif_id, Notification.user_id == current_user.id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.read = True
    db.commit()
    return {"status": "success"}

# --- KNOWLEDGE GRAPH DATA ---
@router.get("/graph")
def get_knowledge_graph(db: Session = Depends(get_db)):
    """Generates the interactive React Flow nodes and edges dynamically representing company entities."""
    users = db.query(User).all()
    projects = db.query(Project).all()
    documents = db.query(Document).all()
    
    nodes = []
    edges = []
    
    # Track coordinates for spatial distribution
    x, y = 100, 100
    
    # 1. Add Department Central Nodes
    departments = list(set([u.department for u in users]))
    for idx, dept in enumerate(departments):
        nodes.append({
            "id": f"dept-{dept}",
            "type": "input",
            "data": {"label": f"🏢 {dept} Department"},
            "position": {"x": 300 * idx, "y": 50},
            "style": {"background": "#1e1b4b", "color": "#818cf8", "border": "1px solid #4f46e5"}
        })

    # 2. Add User Nodes
    for idx, u in enumerate(users):
        u_node_id = f"user-{u.id}"
        nodes.append({
            "id": u_node_id,
            "data": {"label": f"👤 {u.full_name} ({u.role})"},
            "position": {"x": 200 * idx, "y": 200},
            "style": {"background": "#0f172a", "color": "#e2e8f0", "border": "1px solid #334155"}
        })
        # Edge User -> Department
        edges.append({
            "id": f"edge-u-d-{u.id}",
            "source": u_node_id,
            "target": f"dept-{u.department}",
            "label": "Member Of",
            "animated": False
        })

    # 3. Add Project Nodes
    for idx, p in enumerate(projects):
        p_node_id = f"project-{p.id}"
        nodes.append({
            "id": p_node_id,
            "data": {"label": f"🚀 {p.name} ({p.health_score}%)"},
            "position": {"x": 250 * idx, "y": 350},
            "style": {"background": "#064e3b" if p.health_score >= 80 else "#7f1d1d", "color": "#f8fafc", "border": "1px solid #10b981"}
        })
        # Edge Project -> Department (heuristic: matches PM department or default)
        edges.append({
            "id": f"edge-p-d-{p.id}",
            "source": p_node_id,
            "target": f"dept-{departments[idx % len(departments)]}",
            "label": "Managed By",
            "animated": True
        })

    # 4. Add Document Nodes
    for idx, d in enumerate(documents):
        d_node_id = f"doc-{d.id}"
        nodes.append({
            "id": d_node_id,
            "type": "output",
            "data": {"label": f"📄 {d.title}"},
            "position": {"x": 150 * idx, "y": 500},
            "style": {"background": "#1c1917", "color": "#f5f5f4", "border": "1px solid #78716c"}
        })
        
        # Link Document to Department
        if d.department:
            edges.append({
                "id": f"edge-doc-d-{d.id}",
                "source": d_node_id,
                "target": f"dept-{d.department}",
                "label": "Policy Context"
            })
            
        # Link Document to Uploader
        if d.uploaded_by:
            edges.append({
                "id": f"edge-doc-u-{d.id}",
                "source": f"user-{d.uploaded_by}",
                "target": d_node_id,
                "label": "Created By"
            })
            
    return {"nodes": nodes, "edges": edges}

# --- ANALYTICS DASHBOARD ---
@router.get("/analytics")
def get_analytics(db: Session = Depends(get_db)):
    """Computes usage, gaps, and data counts for Charts."""
    total_users = db.query(User).count()
    total_projects = db.query(Project).count()
    total_docs = db.query(Document).count()
    total_conflicts = db.query(PolicyConflict).count()
    total_gaps = db.query(KnowledgeGap).count()
    total_meetings = db.query(Meeting).count()

    # Hit counts for top asked queries
    gaps = db.query(KnowledgeGap).order_by(KnowledgeGap.hit_count.desc()).limit(5).all()
    queries_chart = {
        "labels": [g.query_cluster for g in gaps],
        "data": [g.hit_count for g in gaps]
    }

    # Department distribution
    users = db.query(User).all()
    departments = {}
    for u in users:
        departments[u.department] = departments.get(u.department, 0) + 1
        
    dept_chart = {
        "labels": list(departments.keys()),
        "data": list(departments.values())
    }

    # Knowledge Growth Mock Data (standard hackathon premium charts)
    growth_chart = {
        "labels": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"],
        "data": [12, 24, 35, 48, 62, 80, total_docs + 10]
    }

    return {
        "summary": {
            "users": total_users,
            "projects": total_projects,
            "documents": total_docs,
            "conflicts": total_conflicts,
            "gaps": total_gaps,
            "meetings": total_meetings
        },
        "queries_chart": queries_chart,
        "dept_chart": dept_chart,
        "growth_chart": growth_chart
    }
