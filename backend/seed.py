import os
import sys

# Ensure backend directory is in path for imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'app')))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models.models import (
    User, Project, Document, DocumentChunk, CompanyMemoryEvent,
    DecisionRecord, KnowledgeGap, PolicyConflict, Meeting, OnboardingPath, Notification,
    ChatSession, ChatMessage
)
from datetime import datetime, timedelta

def seed_db():
    print("Re-creating all database tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        print("Inserting seed data...")

        # 1. Create Users
        users = [
            User(
                email="admin@pulsemind.ai",
                hashed_password=get_password_hash("admin123"),
                full_name="Alice Chen",
                role="Super Admin",
                department="Engineering",
                skills=["React", "TypeScript", "FastAPI", "PostgreSQL", "Docker", "Kubernetes", "System Architecture"],
                availability_status="Available"
            ),
            User(
                email="hr@pulsemind.ai",
                hashed_password=get_password_hash("hr123"),
                full_name="Marcus Vance",
                role="HR",
                department="People Operations",
                skills=["Talent Acquisition", "Employee Onboarding", "Conflict Resolution", "Performance Reviews"],
                availability_status="In Meeting"
            ),
            User(
                email="manager@pulsemind.ai",
                hashed_password=get_password_hash("manager123"),
                full_name="Sarah Connor",
                role="Manager",
                department="Logistics & Dispatch",
                skills=["Project Management", "Agile", "Jira", "Risk Assessment", "Resource Allocation"],
                availability_status="Available"
            ),
            User(
                email="dev1@pulsemind.ai",
                hashed_password=get_password_hash("dev123"),
                full_name="David Miller",
                role="Employee",
                department="Engineering",
                skills=["Kubernetes", "Docker", "Go", "Python", "gRPC", "Prometheus"],
                availability_status="Available"
            ),
            User(
                email="dev2@pulsemind.ai",
                hashed_password=get_password_hash("dev123"),
                full_name="Emily Watson",
                role="Employee",
                department="Engineering",
                skills=["React", "Tailwind CSS", "Framer Motion", "UI Design", "Figma"],
                availability_status="Focus Mode"
            )
        ]
        db.add_all(users)
        db.commit()
        for u in users:
            db.refresh(u)
        print(f"Created {len(users)} users.")

        # 2. Create Projects
        projects = [
            Project(
                name="Logistics & Dispatch",
                description="Core distribution system overhaul migrating microservices to Kubernetes and updating the database structure.",
                health_score=85,
                metrics={
                    "documentation": 90,
                    "testing": 80,
                    "security": 95,
                    "performance": 85,
                    "deployment_readiness": 75,
                    "bug_density": 4
                },
                risk_level="Medium",
                recommendations=[
                    "Improve API test coverage for order state updates.",
                    "Update deployment charts to reflect new replica configs."
                ],
                warnings=[
                    "Dependency drift detected on auth service library."
                ]
            ),
            Project(
                name="NextGen Dashboard",
                description="High-performance customer intelligence frontend utilizing React, Chart.js and Framer Motion.",
                health_score=98,
                metrics={
                    "documentation": 100,
                    "testing": 95,
                    "security": 100,
                    "performance": 95,
                    "deployment_readiness": 100,
                    "bug_density": 0
                },
                risk_level="Low",
                recommendations=[
                    "Conduct UI accessibility audit before release."
                ],
                warnings=[]
            )
        ]
        db.add_all(projects)
        db.commit()
        for p in projects:
            db.refresh(p)
        print(f"Created {len(projects)} projects.")

        # 3. Create Documents
        docs = [
            Document(
                title="Leave & Remote Policy 2026",
                file_path="file:///documents/leave_policy_2026.txt",
                file_type="text",
                uploaded_by=users[1].id,
                department="People Operations",
                summary="Details official company holidays, sick leave rules, and remote work guidelines for all full-time employees. Under Section 4, employees are granted 30 calendar days of annual paid leave."
            ),
            Document(
                title="HR General Handbook",
                file_path="file:///documents/hr_handbook.txt",
                file_type="text",
                uploaded_by=users[1].id,
                department="People Operations",
                summary="Core company regulations and standard operating procedures. Section 3.2 lists standard employee annual leave as 25 calendar days per year."
            ),
            Document(
                title="Logistics DB Migration Guide",
                file_path="file:///documents/logistics_db_migration.txt",
                file_type="text",
                uploaded_by=users[0].id,
                department="Engineering",
                summary="Technical blueprint for migrating core relational databases from MongoDB to PostgreSQL to achieve ACID compliance."
            )
        ]
        db.add_all(docs)
        db.commit()
        for d in docs:
            db.refresh(d)
        print(f"Created {len(docs)} documents.")

        # 4. Generate Document Chunks and Embeddings (using fake vectors for out-of-the-box seeding)
        import numpy as np
        for d in docs:
            text = d.summary
            np.random.seed(d.id)
            vector = np.random.randn(1536)
            vector = vector / np.linalg.norm(vector)
            chunk = DocumentChunk(
                document_id=d.id,
                content=text,
                chunk_index=0,
                embedding=vector.tolist()
            )
            db.add(chunk)
        db.commit()
        print("Generated document vector chunks.")

        # 5. Create Company Memory Timeline Events
        events = [
            CompanyMemoryEvent(
                event_type="Architecture Changed",
                title="Database Migrated to PostgreSQL",
                description="Migrated core Logistics state tracking database from MongoDB to PostgreSQL to avoid eventual consistency issues.",
                recorded_by=users[0].id,
                project_id=projects[0].id,
                event_date=datetime.now() - timedelta(days=20),
                metadata_json={"changed_by": "Alice Chen", "why": "Fix transactional race conditions in high-concurrency order creation."}
            ),
            CompanyMemoryEvent(
                event_type="Requirement Added",
                title="GraphQL Gateway Integrated",
                description="Introduced Apollo Router GraphQL gateway to consolidate frontend APIs.",
                recorded_by=users[0].id,
                project_id=projects[1].id,
                event_date=datetime.now() - timedelta(days=12),
                metadata_json={"changed_by": "David Miller", "why": "Improve client-side payload fetching times by 40%."}
            ),
            CompanyMemoryEvent(
                event_type="Deployment Done",
                title="Staging Environment Configured",
                description="Logistics & Dispatch pipeline staged to GCP Cloud Run for validation testing.",
                recorded_by=users[3].id,
                project_id=projects[0].id,
                event_date=datetime.now() - timedelta(days=5),
                metadata_json={"deployment_id": "run-402b", "status": "Success"}
            )
        ]
        db.add_all(events)
        db.commit()
        print("Created timeline events.")

        # 6. Create Decision Records
        decisions = [
            DecisionRecord(
                title="Migration from MongoDB to PostgreSQL",
                decision_date=datetime.now() - timedelta(days=20),
                discussion="Team raised concerns about order records losing sync during high-traffic promotional periods. MongoDB's standard configuration lacked absolute cross-document consistency guarantees.",
                reason="PostgreSQL offers strict ACID properties, relational checks, and advanced JSONB indices for semi-structured log archiving.",
                alternatives=["MySQL (lack of jsonb indexing performance)", "Cassandra (too complex for relational models)"],
                final_decision="Fully migrate operational databases to PostgreSQL.",
                recorded_by=users[0].id,
                project_id=projects[0].id
            )
        ]
        db.add_all(decisions)
        db.commit()
        print("Created decision records.")

        # 7. Create Knowledge Gaps
        gaps = [
            KnowledgeGap(
                query_cluster="Deployment Guide to Kubernetes",
                hit_count=18,
                documentation_missing=True,
                priority="High",
                suggested_documentation="Write a Kubernetes deploy guide covering Helm chart installation and ingress configurations.",
                notified_admin=True
            ),
            KnowledgeGap(
                query_cluster="Policy on Parental Leave",
                hit_count=9,
                documentation_missing=True,
                priority="Medium",
                suggested_documentation="Produce documentation explaining the paid parental leave allowance rules.",
                notified_admin=False
            )
        ]
        db.add_all(gaps)
        db.commit()
        print("Created knowledge gaps.")

        # 8. Create Policy Conflicts
        conflicts = [
            PolicyConflict(
                source_document_a_id=docs[0].id,
                source_document_b_id=docs[1].id,
                policy_name_a="Leave & Remote Policy 2026",
                policy_name_b="HR General Handbook",
                conflict_desc="Leave & Remote Policy 2026 allocates 30 days of annual paid leave, whereas the HR General Handbook lists 25 days.",
                conflict_percentage=85.0,
                affected_departments=["Engineering", "Sales", "HR"],
                suggested_correction="Amend Section 3.2 of the HR General Handbook to reflect the updated 30 days.",
                severity="High",
                resolved=False
            )
        ]
        db.add_all(conflicts)
        db.commit()
        print("Created policy conflicts.")

        # 9. Create Meetings
        meetings = [
            Meeting(
                title="Logistics DB Alignment",
                meeting_date=datetime.now() - timedelta(days=21),
                transcript="Alice: We need database consistency. David: PostgreSQL is solid. Sarah: Let's do it. Alice: OK, let's schedule the migration task by next week.",
                summary="Decision alignment meeting on DB choice for logistics system.",
                action_items=[
                    {"task": "Draft Postgres Schema", "assignee": "Alice Chen", "deadline": "2026-07-06"},
                    {"task": "Prepare Migration Script", "assignee": "David Miller", "deadline": "2026-07-08"}
                ],
                risks=["Downtime during order database cut-over."],
                future_tasks=["Archive MongoDB read-only tables."],
                recorded_by=users[0].id,
                project_id=projects[0].id
            )
        ]
        db.add_all(meetings)
        db.commit()
        print("Created meetings.")

        # 10. Create Onboarding Path for Employee
        onboard = OnboardingPath(
            user_id=users[4].id, # Emily Watson
            learning_path={
                "Week 1": ["HR Onboarding", "UI Design System Familiarization", "Review Figma components"],
                "Week 2": ["Setup Vite development environments", "First small CSS fixing ticket"],
                "Week 3": ["Build new React Flow node styling components"]
            },
            required_documents=[
                {"title": "Leave & Remote Policy 2026", "read": False},
                {"title": "HR General Handbook", "read": True}
            ],
            mentor_suggestions=["Alice Chen (Lead Designer/Eng)", "David Miller (Kubernetes expert)"],
            training_tasks=[
                {"task": "Complete mandatory compliance training", "priority": "High", "done": False},
                {"task": "Familiarize with Tailwind theme rules", "priority": "Medium", "done": True}
            ],
            daily_schedule={
                "09:00": "Team Welcome Sync",
                "10:00": "HR Portal Registration",
                "14:00": "Design System Walkthrough with Alice"
            },
            progress_percentage=45.0,
            skill_assessment={
                "Figma": "Advanced",
                "React": "Intermediate",
                "Tailwind CSS": "Intermediate"
            }
        )
        db.add(onboard)
        db.commit()
        print("Created onboarding paths.")

        # 11. Notifications for users
        notifications = [
            Notification(
                user_id=users[0].id,
                title="Critical Policy Conflict",
                message="Leave allowance discrepancy detected between Leave & Remote Policy and HR General Handbook. Priority High.",
                category="Policy Conflict",
                read=False
            ),
            Notification(
                user_id=users[0].id,
                title="Documentation Gap Alert",
                message="Deployment Guide to Kubernetes has been searched 18 times without hits. Suggested creation.",
                category="Missing Documentation",
                read=False
            )
        ]
        db.add_all(notifications)
        db.commit()
        print("Created initial notifications.")

        # 12. Create Chat Session
        session = ChatSession(
            user_id=users[0].id,
            title="Database Migration History"
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        
        chat_msgs = [
            ChatMessage(
                session_id=session.id,
                sender="user",
                content="Why did we migrate to PostgreSQL in the Logistics project?"
            ),
            ChatMessage(
                session_id=session.id,
                sender="assistant",
                content=(
                    "According to Company Memory, we migrated from MongoDB to PostgreSQL "
                    "for the Logistics & Dispatch project on 2026-06-13.\n\n"
                    "**Why:** To ensure strict transactions (ACID compliance) and resolve order duplication bugs "
                    "encountered during concurrent writing.\n\n"
                    "**Alternatives evaluated:** MySQL (discarded due to inferior JSONB performance) and Cassandra.\n\n"
                    "**Sources:**\n"
                    "- [Logistics DB Migration Guide](file:///documents/logistics_db_migration.txt)"
                ),
                citations=[{
                    "id": docs[2].id,
                    "title": docs[2].title,
                    "file_path": docs[2].file_path,
                    "score": 0.94
                }]
            )
        ]
        db.add_all(chat_msgs)
        db.commit()
        print("Created chat sessions & messages.")

        print("Database seeded successfully with premium contents!")
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
