from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.models import Document, PolicyConflict, Meeting, OnboardingPath, User, Project, Notification
from app.services.rag_service import RAGService
import json

class AnalysisService:
    @staticmethod
    def detect_policy_conflicts(db: Session) -> List[Dict[str, Any]]:
        """Scans all documents to detect contradictions. Creates PolicyConflict entries."""
        docs = db.query(Document).filter(Document.file_type == 'text').all()
        if len(docs) < 2:
            return []

        conflicts = []
        # Check pairs of documents
        for i in range(len(docs)):
            for j in range(i + 1, len(docs)):
                doc_a = docs[i]
                doc_b = docs[j]
                
                # Dynamic matching based on keywords in files
                # Real conflict detection would read chunks, but we can simulate/AI prompt
                content_a = doc_a.summary or doc_a.title
                content_b = doc_b.summary or doc_b.title

                # Construct AI Prompt to scan for contradictions
                prompt = (
                    f"Compare the following two documents for contradictions or discrepancies.\n"
                    f"Doc A Title: {doc_a.title}\nDoc A Summary: {content_a}\n\n"
                    f"Doc B Title: {doc_b.title}\nDoc B Summary: {content_b}\n\n"
                    f"Output details in JSON format with fields: 'has_conflict' (boolean), "
                    f"'policy_name_a' (str), 'policy_name_b' (str), 'conflict_desc' (str), "
                    f"'conflict_percentage' (float 0-100), 'affected_departments' (list of str), "
                    f"'suggested_correction' (str), 'severity' (str: 'Low', 'Medium', 'High')."
                )

                system_instruction = "You are a professional corporate compliance auditor. You output ONLY valid JSON objects."

                try:
                    ai_response = RAGService.query_llm(prompt, system_instruction)
                    # Clean markdown code block if present
                    if "```json" in ai_response:
                        ai_response = ai_response.split("```json")[1].split("```")[0]
                    elif "```" in ai_response:
                        ai_response = ai_response.split("```")[1].split("```")[0]
                    
                    data = json.loads(ai_response.strip())
                    if data.get("has_conflict"):
                        # Check if conflict already logged
                        existing = db.query(PolicyConflict).filter(
                            ((PolicyConflict.source_document_a_id == doc_a.id) & (PolicyConflict.source_document_b_id == doc_b.id)) |
                            ((PolicyConflict.source_document_a_id == doc_b.id) & (PolicyConflict.source_document_b_id == doc_a.id))
                        ).first()

                        if not existing:
                            conflict = PolicyConflict(
                                source_document_a_id=doc_a.id,
                                source_document_b_id=doc_b.id,
                                policy_name_a=data.get("policy_name_a", doc_a.title),
                                policy_name_b=data.get("policy_name_b", doc_b.title),
                                conflict_desc=data.get("conflict_desc", "Policy mismatch found."),
                                conflict_percentage=data.get("conflict_percentage", 50.0),
                                affected_departments=data.get("affected_departments", ["Operations"]),
                                suggested_correction=data.get("suggested_correction", "Review updated compliance rules."),
                                severity=data.get("severity", "Medium"),
                                resolved=False
                            )
                            db.add(conflict)
                            db.commit()
                            db.refresh(conflict)
                            
                            # Create notification for admins
                            admins = db.query(User).filter(User.role.in_(["Admin", "Super Admin"])).all()
                            for admin in admins:
                                notification = Notification(
                                    user_id=admin.id,
                                    title="Policy Conflict Detected",
                                    message=f"Conflict found between '{conflict.policy_name_a}' and '{conflict.policy_name_b}' ({conflict.conflict_percentage}% mismatch).",
                                    category="Policy Conflict",
                                    read=False
                                )
                                db.add(notification)
                            db.commit()
                            
                            conflicts.append(conflict)
                except Exception as e:
                    print(f"Error parsing conflict detection JSON: {e}")
        
        return conflicts

    @staticmethod
    def analyze_meeting(db: Session, meeting_id: int) -> Meeting:
        """Processes a meeting transcript, extracts action items, summary, and updates company memory."""
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if not meeting or not meeting.transcript:
            return meeting

        prompt = (
            f"Analyze the following meeting transcript:\n{meeting.transcript}\n\n"
            f"Extract detailed fields in JSON format:\n"
            f"1. 'summary' (str: 2-3 paragraph summary)\n"
            f"2. 'action_items' (list of dicts containing: 'task', 'assignee', 'deadline')\n"
            f"3. 'risks' (list of strings describing warnings/blockers)\n"
            f"4. 'future_tasks' (list of strings for future roadmap items)\n"
            f"5. 'timeline_event_title' (str: descriptive title for company memory timeline)\n"
            f"6. 'timeline_event_desc' (str: summary for company memory timeline)"
        )
        
        system_instruction = "You are an executive assistant. Output ONLY valid JSON."

        try:
            ai_response = RAGService.query_llm(prompt, system_instruction)
            if "```json" in ai_response:
                ai_response = ai_response.split("```json")[1].split("```")[0]
            elif "```" in ai_response:
                ai_response = ai_response.split("```")[1].split("```")[0]
            
            data = json.loads(ai_response.strip())
            
            meeting.summary = data.get("summary", "Meeting concluded.")
            meeting.action_items = data.get("action_items", [])
            meeting.risks = data.get("risks", [])
            meeting.future_tasks = data.get("future_tasks", [])
            db.commit()
            
            # Log automatically to Company Memory Timeline
            from app.models.models import CompanyMemoryEvent
            event = CompanyMemoryEvent(
                event_type="Meeting Conducted",
                title=data.get("timeline_event_title", f"Meeting: {meeting.title}"),
                description=data.get("timeline_event_desc", f"Conducted sync for {meeting.title}."),
                recorded_by=meeting.recorded_by,
                project_id=meeting.project_id,
                metadata_json={
                    "meeting_id": meeting.id,
                    "action_items_count": len(meeting.action_items),
                    "key_risks": meeting.risks
                }
            )
            db.add(event)
            
            # Update Project Health and risk if meeting indicates risks
            if meeting.project_id and meeting.risks:
                project = db.query(Project).filter(Project.id == meeting.project_id).first()
                if project:
                    project.warnings = list(set(project.warnings + meeting.risks))
                    project.health_score = max(50, project.health_score - (10 * len(meeting.risks)))
                    if len(project.warnings) > 3:
                        project.risk_level = "Critical"
                    elif len(project.warnings) > 0:
                        project.risk_level = "Medium"
                    db.commit()
                    
                    # Notify project manager
                    pm = db.query(User).filter(User.role == "Manager", User.department == project.name).first()
                    if pm:
                        notif = Notification(
                            user_id=pm.id,
                            title="Project Health Degraded",
                            message=f"Project '{project.name}' health dropped to {project.health_score}% due to risks flagged in meeting '{meeting.title}'.",
                            category="Project Risk",
                            read=False
                        )
                        db.add(notif)
            
            db.commit()
            db.refresh(meeting)
        except Exception as e:
            print(f"Error analyzing meeting transcript JSON: {e}")
            
        return meeting

    @staticmethod
    def generate_onboarding(db: Session, employee_id: int) -> OnboardingPath:
        """Automatically builds a customized onboarding track based on the employee's role and skills."""
        user = db.query(User).filter(User.id == employee_id).first()
        if not user:
            return None

        prompt = (
            f"Generate a personalized learning path and onboarding check-list for a new hire:\n"
            f"Name: {user.full_name}\nRole: {user.role}\nDepartment: {user.department}\n"
            f"Skills: {', '.join(user.skills)}\n\n"
            f"Output in JSON format with fields:\n"
            f"1. 'learning_path' (dict with key phases e.g. 'Week 1', 'Week 2' containing topics/tasks)\n"
            f"2. 'required_documents' (list of dicts with keys 'title', 'purpose')\n"
            f"3. 'mentor_suggestions' (list of strings containing full names of recommended team members)\n"
            f"4. 'training_tasks' (list of dicts containing 'task', 'priority' ('High'/'Medium'/'Low'))\n"
            f"5. 'daily_schedule' (dict containing hourly events e.g. '09:00': 'HR Orientation', '10:00': 'Architect Sync')\n"
            f"6. 'skill_assessment' (dict listing core focus skills and target competencies e.g. 'React': 'Advanced')"
        )
        
        system_instruction = "You are an HR Specialist onboarding coach. Output ONLY valid JSON."

        try:
            ai_response = RAGService.query_llm(prompt, system_instruction)
            if "```json" in ai_response:
                ai_response = ai_response.split("```json")[1].split("```")[0]
            elif "```" in ai_response:
                ai_response = ai_response.split("```")[1].split("```")[0]
            
            data = json.loads(ai_response.strip())
            
            # Check if path already exists
            path = db.query(OnboardingPath).filter(OnboardingPath.user_id == user.id).first()
            if not path:
                path = OnboardingPath(user_id=user.id)
                db.add(path)
                
            path.learning_path = data.get("learning_path", {})
            path.required_documents = data.get("required_documents", [])
            path.mentor_suggestions = data.get("mentor_suggestions", ["Lead Developer"])
            path.training_tasks = data.get("training_tasks", [])
            path.daily_schedule = data.get("daily_schedule", {})
            path.skill_assessment = data.get("skill_assessment", {})
            path.progress_percentage = 0.0
            
            db.commit()
            db.refresh(path)
            
            # Log onboarding creation to timeline
            from app.models.models import CompanyMemoryEvent
            event = CompanyMemoryEvent(
                event_type="HR Onboarding Created",
                title=f"Onboarding Path Generated for {user.full_name}",
                description=f"Generated an AI onboarding learning path for {user.full_name} ({user.role} - {user.department}).",
                recorded_by=user.id,
                metadata_json={"user_id": user.id, "role": user.role}
            )
            db.add(event)
            db.commit()
            
            return path
        except Exception as e:
            print(f"Error generating onboarding: {e}")
            # Fallback path if AI fails
            path = db.query(OnboardingPath).filter(OnboardingPath.user_id == user.id).first()
            if not path:
                path = OnboardingPath(
                    user_id=user.id,
                    learning_path={"Week 1": ["HR Onboarding", "Read Core Manual"], "Week 2": ["System Setup", "First Ticket"]},
                    required_documents=[{"title": "Code of Conduct", "purpose": "Legal requirements"}],
                    mentor_suggestions=["Lead Architect"],
                    training_tasks=[{"task": "Setup git repository access", "priority": "High"}],
                    daily_schedule={"09:00": "HR Orientation", "14:00": "Mentor Check-In"},
                    skill_assessment={"Git": "Intermediate"},
                    progress_percentage=0.0
                )
                db.add(path)
                db.commit()
                db.refresh(path)
            return path
