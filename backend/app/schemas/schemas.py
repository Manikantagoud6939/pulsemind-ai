from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime

# Authentication Schemas
class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "Employee"
    department: str
    skills: List[str] = []

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    role: str
    department: str
    skills: List[str]
    avatar_url: Optional[str] = None
    availability_status: str
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class TokenData(BaseModel):
    email: Optional[str] = None

# Chat & RAG Schemas
class MessageCreate(BaseModel):
    content: str

class MessageResponse(BaseModel):
    id: int
    sender: str
    content: str
    citations: List[Dict[str, Any]] = []
    created_at: datetime

    class Config:
        from_attributes = True

class SessionCreate(BaseModel):
    title: Optional[str] = "New Chat"

class SessionResponse(BaseModel):
    id: int
    title: str
    created_at: datetime
    messages: List[MessageResponse] = []

    class Config:
        from_attributes = True

# Data & Insights Schemas
class ProjectResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    health_score: int
    metrics: Dict[str, Any]
    risk_level: str
    recommendations: List[str]
    warnings: List[str]
    created_at: datetime

    class Config:
        from_attributes = True

class EventResponse(BaseModel):
    id: int
    event_type: str
    title: str
    description: str
    recorded_by: Optional[int]
    project_id: Optional[int]
    event_date: datetime
    metadata_json: Dict[str, Any]

    class Config:
        from_attributes = True

class DecisionResponse(BaseModel):
    id: int
    title: str
    decision_date: datetime
    discussion: str
    reason: str
    alternatives: List[str]
    final_decision: str
    recorded_by: Optional[int]
    project_id: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True

class KnowledgeGapResponse(BaseModel):
    id: int
    query_cluster: str
    hit_count: int
    documentation_missing: bool
    priority: str
    suggested_documentation: Optional[str] = None
    notified_admin: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class PolicyConflictResponse(BaseModel):
    id: int
    source_document_a_id: int
    source_document_b_id: int
    policy_name_a: str
    policy_name_b: str
    conflict_desc: str
    conflict_percentage: float
    affected_departments: List[str]
    suggested_correction: Optional[str] = None
    severity: str
    resolved: bool
    created_at: datetime

    class Config:
        from_attributes = True

class MeetingResponse(BaseModel):
    id: int
    title: str
    meeting_date: datetime
    transcript: Optional[str] = None
    summary: Optional[str] = None
    action_items: List[Dict[str, Any]]
    risks: List[str]
    future_tasks: List[str]
    recorded_by: Optional[int]
    project_id: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True

class OnboardingPathResponse(BaseModel):
    id: int
    user_id: int
    learning_path: Dict[str, Any]
    required_documents: List[Dict[str, Any]]
    mentor_suggestions: List[str]
    training_tasks: List[Dict[str, Any]]
    daily_schedule: Dict[str, Any]
    progress_percentage: float
    skill_assessment: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True

class NotificationResponse(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    category: str
    read: bool
    created_at: datetime

    class Config:
        from_attributes = True
