from datetime import datetime
from typing import List, Dict, Any
from app.services.rag_service import RAGService
from sqlalchemy.orm import Session
from app.models.models import DecisionRecord, Project, Meeting, User, KnowledgeGap

class AgentOrchestrator:
    @staticmethod
    def process_query(db: Session, query: str, user_id: int) -> Dict[str, Any]:
        """Routes the query through multiple specialized agents and returns a consolidated response."""
        lower_query = query.lower()
        
        # Decide which agents should collaborate
        active_agents = []
        findings = {}
        
        # 1. Route to Decision Agent / Search Agent
        if "migrate" in lower_query or "decision" in lower_query or "why did we" in lower_query:
            active_agents.append("Decision Agent")
            active_agents.append("Search Agent")
            decisions = db.query(DecisionRecord).all()
            findings["decisions"] = [
                {
                    "title": d.title,
                    "date": d.decision_date.strftime("%Y-%m-%d"),
                    "reason": d.reason,
                    "final": d.final_decision
                } for d in decisions
            ]
            
        # 2. Route to HR Agent / Expertise Finder Agent
        if "who knows" in lower_query or "expert" in lower_query or "onboarding" in lower_query or "skills" in lower_query or "developer" in lower_query:
            active_agents.append("HR Agent")
            active_agents.append("Search Agent")
            users = db.query(User).all()
            findings["expertise"] = [
                {
                    "name": u.full_name,
                    "department": u.department,
                    "skills": u.skills,
                    "availability": u.availability_status
                } for u in users
            ]
            
        # 3. Route to Project Agent / Risk Agent
        if "project" in lower_query or "health" in lower_query or "status" in lower_query or "risk" in lower_query:
            active_agents.append("Project Agent")
            active_agents.append("Risk Agent")
            projects = db.query(Project).all()
            findings["projects"] = [
                {
                    "name": p.name,
                    "health": p.health_score,
                    "risk": p.risk_level,
                    "warnings": p.warnings
                } for p in projects
            ]

        # 4. Route to Meeting Agent
        if "meeting" in lower_query or "transcribe" in lower_query or "action items" in lower_query:
            active_agents.append("Meeting Agent")
            meetings = db.query(Meeting).all()
            findings["meetings"] = [
                {
                    "title": m.title,
                    "date": m.meeting_date.strftime("%Y-%m-%d"),
                    "summary": m.summary,
                    "actions": m.action_items
                } for m in meetings
            ]

        # Default to Knowledge Agent and Search Agent
        if not active_agents:
            active_agents.append("Knowledge Agent")
            active_agents.append("Search Agent")
            active_agents.append("Planning Agent")

        # Log query to Gap Detector asynchronously
        AgentOrchestrator._track_knowledge_gap(db, query)

        # Call RAG to get primary semantic details
        rag_result = RAGService.run_rag(db, query)

        # Synthesize final answer combining findings and RAG
        agents_collab_log = f"Orchestrator parsed query and activated: {', '.join(active_agents)}."
        
        return {
            "answer": rag_result["answer"],
            "citations": rag_result["citations"],
            "agents_involved": active_agents,
            "collab_log": agents_collab_log,
            "findings": findings
        }

    @staticmethod
    def _track_knowledge_gap(db: Session, query: str):
        """Monitors user queries to detect missing documentation and log knowledge gaps."""
        # Simple heuristic to identify documentation-seeking queries
        query = query.strip()
        if len(query) < 5:
            return
            
        lower_q = query.lower()
        # Look for keywords that suggest they want instructions/guides
        indicators = ["how to", "guide", "manual", "setup", "deploy", "configure", "documentation", "policy on"]
        if not any(ind in lower_q for ind in indicators):
            return

        # Simple clustering - matching by key noun tokens
        words = [w for w in lower_q.split() if len(w) > 4]
        if not words:
            words = [lower_q]
            
        match_found = False
        gaps = db.query(KnowledgeGap).all()
        for gap in gaps:
            # If search contains same main word, increment hit count
            if any(w in gap.query_cluster.lower() for w in words):
                gap.hit_count += 1
                gap.updated_at = datetime.utcnow()
                if gap.hit_count >= 15:
                    gap.priority = "High"
                elif gap.hit_count >= 5:
                    gap.priority = "Medium"
                db.commit()
                match_found = True
                break

        if not match_found:
            # Create a new knowledge gap
            cluster_name = " ".join(words[:3]).title() + " Guide"
            new_gap = KnowledgeGap(
                query_cluster=cluster_name,
                hit_count=1,
                documentation_missing=True,
                priority="Low",
                suggested_documentation=f"Create a guide/manual detailing: {query}",
                notified_admin=False
            )
            db.add(new_gap)
            db.commit()
            db.refresh(new_gap)
