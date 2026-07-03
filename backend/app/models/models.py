from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, JSON, Table
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.core.config import settings

# Conditional pgvector type loading
if "postgresql" in settings.DATABASE_URL:
    try:
        from pgvector.sqlalchemy import Vector
        EmbeddingType = Vector(1536)
    except ImportError:
        EmbeddingType = JSON
else:
    EmbeddingType = JSON

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), default="Employee")  # 'Super Admin', 'Admin', 'HR', 'Manager', 'Employee'
    department = Column(String(100), nullable=False)
    skills = Column(JSON, default=list)  # Stored as list of strings
    avatar_url = Column(Text, nullable=True)
    availability_status = Column(String(50), default="Available")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    documents = relationship("Document", back_populates="uploader")
    events = relationship("CompanyMemoryEvent", back_populates="recorder")
    decisions = relationship("DecisionRecord", back_populates="recorder")
    meetings = relationship("Meeting", back_populates="recorder")
    onboarding = relationship("OnboardingPath", back_populates="user", uselist=False)
    notifications = relationship("Notification", back_populates="user")
    chat_sessions = relationship("ChatSession", back_populates="user")

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    health_score = Column(Integer, default=100)
    metrics = Column(JSON, default=lambda: {
        "documentation": 100, 
        "testing": 100, 
        "security": 100, 
        "performance": 100, 
        "deployment_readiness": 100, 
        "bug_density": 0
    })
    risk_level = Column(String(50), default="Low")  # 'Low', 'Medium', 'High', 'Critical'
    recommendations = Column(JSON, default=list)
    warnings = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    events = relationship("CompanyMemoryEvent", back_populates="project")
    decisions = relationship("DecisionRecord", back_populates="project")
    meetings = relationship("Meeting", back_populates="project")

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    file_path = Column(Text, nullable=False)
    file_type = Column(String(50), nullable=False)  # 'pdf', 'docx', 'ppt', 'excel', 'image', 'text'
    uploaded_by = Column(Integer, ForeignKey("users.id"))
    department = Column(String(100), nullable=True)
    summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    uploader = relationship("User", back_populates="documents")
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")

class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"))
    content = Column(Text, nullable=False)
    chunk_index = Column(Integer, nullable=False)
    embedding = Column(EmbeddingType, nullable=True)

    # Relationships
    document = relationship("Document", back_populates="chunks")

class CompanyMemoryEvent(Base):
    __tablename__ = "company_memory_events"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String(100), nullable=False)  # 'Requirement Added', 'Meeting Conducted', etc.
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    recorded_by = Column(Integer, ForeignKey("users.id"))
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    event_date = Column(DateTime, default=datetime.utcnow)
    metadata_json = Column(JSON, default=dict)  # Stores details like { "changed_by": ..., "why": ... }

    # Relationships
    recorder = relationship("User", back_populates="events")
    project = relationship("Project", back_populates="events")

class DecisionRecord(Base):
    __tablename__ = "decision_records"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    decision_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    discussion = Column(Text, nullable=False)
    reason = Column(Text, nullable=False)
    alternatives = Column(JSON, default=list)
    final_decision = Column(Text, nullable=False)
    recorded_by = Column(Integer, ForeignKey("users.id"))
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    recorder = relationship("User", back_populates="decisions")
    project = relationship("Project", back_populates="decisions")

class KnowledgeGap(Base):
    __tablename__ = "knowledge_gaps"

    id = Column(Integer, primary_key=True, index=True)
    query_cluster = Column(String(255), nullable=False)
    hit_count = Column(Integer, default=1)
    documentation_missing = Column(Boolean, default=True)
    priority = Column(String(50), default="Medium")  # 'Low', 'Medium', 'High', 'Critical'
    suggested_documentation = Column(Text, nullable=True)
    notified_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class PolicyConflict(Base):
    __tablename__ = "policy_conflicts"

    id = Column(Integer, primary_key=True, index=True)
    source_document_a_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"))
    source_document_b_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"))
    policy_name_a = Column(String(255), nullable=False)
    policy_name_b = Column(String(255), nullable=False)
    conflict_desc = Column(Text, nullable=False)
    conflict_percentage = Column(Float, default=0.0)
    affected_departments = Column(JSON, default=list)
    suggested_correction = Column(Text, nullable=True)
    severity = Column(String(50), default="Medium")  # 'Low', 'Medium', 'High'
    resolved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    meeting_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    transcript = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)
    action_items = Column(JSON, default=list)  # [ { "task": ..., "assignee": ..., "deadline": ... } ]
    risks = Column(JSON, default=list)
    future_tasks = Column(JSON, default=list)
    recorded_by = Column(Integer, ForeignKey("users.id"))
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    recorder = relationship("User", back_populates="meetings")
    project = relationship("Project", back_populates="meetings")

class OnboardingPath(Base):
    __tablename__ = "onboarding_paths"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    learning_path = Column(JSON, default=dict)
    required_documents = Column(JSON, default=list)
    mentor_suggestions = Column(JSON, default=list)
    training_tasks = Column(JSON, default=list)
    daily_schedule = Column(JSON, default=dict)
    progress_percentage = Column(Float, default=0.0)
    skill_assessment = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="onboarding")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    category = Column(String(50), nullable=False)  # 'Missing Documentation', 'Policy Conflict', 'Project Risk', 'Meeting Summary'
    read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="notifications")

class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    title = Column(String(255), default="New Chat")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id", ondelete="CASCADE"))
    sender = Column(String(50), nullable=False)  # 'user', 'assistant'
    content = Column(Text, nullable=False)
    citations = Column(JSON, default=list)  # [ { "source": ..., "page": ... } ]
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    session = relationship("ChatSession", back_populates="messages")
