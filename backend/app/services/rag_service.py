import numpy as np
from typing import List, Dict, Any, Tuple
from app.core.config import settings
from sqlalchemy.orm import Session
from app.models.models import Document, DocumentChunk

# Fallback embedding dimension
DIMENSION = 1536

class RAGService:
    @staticmethod
    def get_embedding(text: str) -> List[float]:
        """Generate embedding vector using Gemini API or fallback mock vector."""
        if not settings.GEMINI_API_KEY:
            # Generate a pseudo-random deterministic vector based on text
            np.random.seed(sum(ord(c) for c in text) % 10000)
            vector = np.random.randn(DIMENSION)
            vector = vector / np.linalg.norm(vector)
            return vector.tolist()
        
        try:
            from google import genai
            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            response = client.models.embed_content(
                model='text-embedding-004',
                contents=text
            )
            # Handle list/single response formats
            embedding = response.embeddings[0].values
            return embedding
        except Exception as e:
            print(f"Error generating embedding via Gemini API: {e}. Falling back to mock vector.")
            # Fallback deterministic mock
            np.random.seed(sum(ord(c) for c in text) % 10000)
            vector = np.random.randn(DIMENSION)
            vector = vector / np.linalg.norm(vector)
            return vector.tolist()

    @staticmethod
    def query_llm(prompt: str, system_instruction: str = "") -> str:
        """Query Gemini LLM or fallback to structured mock responses."""
        if not settings.GEMINI_API_KEY:
            return RAGService._mock_llm_response(prompt)
        
        try:
            from google import genai
            from google.genai import types
            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            
            config = None
            if system_instruction:
                config = types.GenerateContentConfig(
                    system_instruction=system_instruction
                )
            
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
                config=config
            )
            return response.text
        except Exception as e:
            print(f"Gemini API generation failed: {e}. Using mock engine.")
            return RAGService._mock_llm_response(prompt)

    @staticmethod
    def _mock_llm_response(prompt: str) -> str:
        """Helper to generate high-fidelity mock responses based on queries for hackathon demos."""
        lower_prompt = prompt.lower()
        if "postgresql" in lower_prompt or "migrate" in lower_prompt:
            return (
                "Based on Company Memory from August 2025, we migrated from MongoDB to PostgreSQL "
                "for the Logistics & Dispatch project. The decision was driven by the need for strong ACID "
                "compliance and relational integrity during order state transitions.\n\n"
                "**Key Decision Details:**\n"
                "- **Date:** 2025-08-14\n"
                "- **Why:** Mongo's eventual consistency led to order duplication bugs during high-traffic spikes.\n"
                "- **Alternatives:** MySQL (rejected due to lack of native JSONB index performance) and Cassandra.\n"
                "- **Outcome:** 100% resolution of duplication bugs and 35% improvement in reporting query performance.\n\n"
                "**References:**\n"
                "- [Architecture Decision Record: PostgreSQL Migration](file:///documents/adr_04_db_migration.pdf)\n"
                "- [Logistics Q3 Post-Mortem](file:///meetings/logistics_q3_retrospective)"
            )
        elif "onboarding" in lower_prompt or "learning path" in lower_prompt:
            return (
                "Here is the personalized onboarding path for the new engineer:\n\n"
                "1. **Core Architecture Review**: Read the [PulseMind Technical Manual](file:///documents/pulsemind_tech_manual.pdf) (Est. 2 hours).\n"
                "2. **Local Environment Setup**: Clone the repo and configure Docker containers (Est. 3 hours).\n"
                "3. **Mentor Sync**: Meet with Alice Chen (Lead Architect) for a codebase overview."
            )
        elif "kubernetes" in lower_prompt or "who knows" in lower_prompt:
            return (
                "The primary experts in Kubernetes in our organization are:\n\n"
                "1. **David Miller** (Cloud Architect, DevOps Team)\n"
                "   - **Rating:** 5/5 (Expert)\n"
                "   - **Experience:** 6 years of production K8s deployment\n"
                "   - **Projects:** Core Infrastructure Migrations, Auto-scaling setups\n"
                "   - **Availability:** 80% (Currently wrapping up Q2 optimizations)\n\n"
                "2. **Sarah Connor** (Senior AI Engineer)\n"
                "   - **Rating:** 4/5 (Advanced)\n"
                "   - **Experience:** Created the microservices deployment charts for the ML Pipeline."
            )
        elif "conflict" in lower_prompt or "leave policy" in lower_prompt:
            return (
                "I detected a critical Policy Conflict between two files:\n\n"
                "- **File A:** [Leave & Remote Policy 2026](file:///documents/leave_policy_2026.pdf) (States employees get 30 days of annual leave).\n"
                "- **File B:** [HR General Handbook](file:///documents/hr_handbook.pdf) (States employees get 25 days of annual leave).\n\n"
                "**Conflict Score:** 85% contradiction.\n"
                "**Suggested Action:** Update Section 4.2 of the General HR Handbook to reflect the updated 30-day allowance approved in Q4 Board Meeting."
            )
        else:
            return (
                "PulseMind AI Orchestrator processed your query using the Company Memory RAG engine:\n\n"
                "Our documents suggest that current operations are aligned. Based on the Q2 Roadmap, "
                "we are focusing on microservice optimization and document consolidation. "
                "Let me know if you would like me to retrieve specific meeting notes or decision logs."
            )

    @staticmethod
    def search_vector_store(db: Session, query: str, top_k: int = 4) -> List[Tuple[DocumentChunk, float]]:
        """Perform semantic search using SQLite fallback or pgvector."""
        query_vector = RAGService.get_embedding(query)
        chunks = db.query(DocumentChunk).all()
        if not chunks:
            return []

        scored_chunks = []
        for chunk in chunks:
            chunk_vector = chunk.embedding
            if isinstance(chunk_vector, list):
                # SQLite stores as list/JSON
                chunk_vector = np.array(chunk_vector)
            elif isinstance(chunk_vector, str):
                import json
                chunk_vector = np.array(json.loads(chunk_vector))
            elif hasattr(chunk_vector, "tolist"):
                chunk_vector = np.array(chunk_vector.tolist())
            else:
                chunk_vector = np.array(chunk_vector)

            # Calculate cosine similarity
            if chunk_vector.size == 0:
                continue
            dot_product = np.dot(query_vector, chunk_vector)
            norm_q = np.linalg.norm(query_vector)
            norm_c = np.linalg.norm(chunk_vector)
            similarity = dot_product / (norm_q * norm_c) if (norm_q > 0 and norm_c > 0) else 0.0
            scored_chunks.append((chunk, float(similarity)))

        # Sort by similarity descending
        scored_chunks.sort(key=lambda x: x[1], reverse=True)
        return scored_chunks[:top_k]

    @staticmethod
    def run_rag(db: Session, query: str) -> Dict[str, Any]:
        """Perform full RAG lookup and respond with citations."""
        results = RAGService.search_vector_store(db, query, top_k=3)
        
        context_str = ""
        citations = []
        for i, (chunk, score) in enumerate(results):
            context_str += f"[Source {i+1}]: {chunk.document.title}\nContent: {chunk.content}\n\n"
            citations.append({
                "id": chunk.document.id,
                "title": chunk.document.title,
                "file_path": chunk.document.file_path,
                "score": score
            })

        system_instruction = (
            "You are PulseMind AI - The Living Company Brain. Answer the query based on the provided sources. "
            "Use clear citations in the format [Source X]. If the answer cannot be found in the sources, "
            "provide your best corporate context answer and note it is from the general organization memory."
        )

        prompt = f"Sources:\n{context_str}\nQuery: {query}"
        answer = RAGService.query_llm(prompt, system_instruction)
        
        return {
            "answer": answer,
            "citations": citations
        }
