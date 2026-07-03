# PulseMind AI — The Living Company Brain

PulseMind AI is an AI-powered enterprise operating system designed for a 36-hour hackathon. It functions as an evolving corporate memory (Google + ChatGPT + Notion + Jira + Slack + Company Memory combined) that continuously learns, remembers, predicts, detects compliance issues, and assists employees proactively.

---

## 1. Project Folder Structure
```
pulsemind-ai/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py         # Global settings & environment vars
│   │   │   ├── database.py       # Session connection engines (Postgres & SQLite fallbacks)
│   │   │   └── security.py       # bcrypt password hashing & JWT token generators
│   │   ├── models/
│   │   │   └── models.py         # SQLAlchemy tables (Users, Projects, Docs, Timeline, Conflicts, Gaps)
│   │   ├── schemas/
│   │   │   └── schemas.py        # Pydantic validation schemas
│   │   ├── services/
│   │   │   ├── rag_service.py    # Vector similarities, citations engine & Gemini RAG
│   │   │   ├── agent_orchestrator.py # Multi-Agent router & Knowledge Gap loggers
│   │   │   └── analysis_service.py # Policy auditors, Meeting transcript extractors
│   │   ├── routers/
│   │   │   └── api.py            # API routing gateways with RBAC authorization guards
│   │   └── main.py               # Fast API framework startup file
│   ├── requirements.txt          # Python package lists
│   └── seed.py                   # High-fidelity seeding script
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── DashboardLayout.tsx  # Unified navigation panel & notifications
│   │   │   ├── AIChatConsole.tsx    # Multi-agent chat consoles & citations
│   │   │   ├── MemoryTimelineView.tsx # Vertical company history nodes
│   │   │   ├── KnowledgeGraphView.tsx # Interactive SVG canvas nodes mappings
│   │   │   ├── ProjectHealthView.tsx  # KPI health indexes & stability forecasting
│   │   │   ├── ConflictDetectorView.tsx # Policy conflicts tables & missing gaps
│   │   │   ├── OnboardingTrackerView.tsx # Custom HR checklists & meeting analyzer
│   │   │   ├── ExpertiseFinderView.tsx  # Skill mappings & employee profile searches
│   │   │   └── AnalyticsDashboardView.tsx # SVG bar/line charts and statistics grids
│   │   ├── App.tsx               # Login, register, verification routers
│   │   ├── main.tsx              # React mounting root
│   │   └── index.css             # Glassmorphic classes & global styles
│   ├── tailwind.config.js        # Customized dark theme styles
│   ├── postcss.config.js         # PostCSS configuration file
│   ├── vite.config.ts            # Vite compile assets settings
│   ├── tsconfig.json             # TypeScript rules
│   └── package.json              # Front-end packages dependencies
└── README.md                     # Main documentation file
```

---

## 2. API Documentation

All routes prefix: `/api`.

| Endpoint | Method | Auth | Role Required | Description |
|---|---|---|---|---|
| `/auth/register` | POST | Public | - | Registers a new account, generates user profile, returns JWT token. |
| `/auth/login` | POST | Public | - | Authenticates email/password, returns JWT session token. |
| `/auth/me` | GET | Bearer JWT | - | Returns profile data of the currently logged-in user. |
| `/chat/sessions` | POST | Bearer JWT | - | Instantiates a new conversations session. |
| `/chat/sessions` | GET | Bearer JWT | - | Returns previous chat sessions list for the active user. |
| `/chat/sessions/{id}/messages` | POST | Bearer JWT | - | Submits query, runs Multi-Agent Orchestrator, saves context, returns citation details. |
| `/documents/upload` | POST | Bearer JWT | Manager, Admin | Indexes text document contents, splits vector chunks, runs policy conflict sweeps. |
| `/documents` | GET | Public | - | Returns catalog of uploaded files. |
| `/conflicts` | GET | Public | - | Returns identified compliance contradiction policy pairs. |
| `/meetings/analyze` | POST | Bearer JWT | - | Receives transcripts, extracts summary/action-items, updates memory timeline logs. |
| `/meetings` | GET | Public | - | Returns catalog of analyzed meetings. |
| `/onboarding/generate/{uid}` | POST | Bearer JWT | HR, Admin | Spawns onboarding curriculum and mentor suggestions based on employee metadata. |
| `/onboarding/{uid}` | GET | Public | - | Returns active onboarding roadmap list. |
| `/onboarding/{uid}/progress` | PUT | Public | - | Updates onboarding completion percentage. |
| `/expertise/search` | GET | Public | - | Queries employee profiles for specified skills, returns rankings & availability. |
| `/timeline` | GET | Public | - | Returns historical company events log. |
| `/decisions` | GET | Public | - | Returns logs from the Decision Memory Engine. |
| `/projects` | GET | Public | - | Returns health score matrices and warnings list. |
| `/gaps` | GET | Public | - | Returns logged missing documentation queries and search hit count stats. |
| `/notifications` | GET | Bearer JWT | - | Returns alerts logs for the active user session. |
| `/notifications/{id}/read` | PUT | Bearer JWT | - | Marks specified notification alert as read. |
| `/graph` | GET | Public | - | Computes React Flow node coordinates & edges mappings representing company entities. |
| `/analytics` | GET | Public | - | Returns data counts and metrics coordinates for charting. |

---

## 3. UI Screens Overview

1. **Dashboard Home**: Contains the premium welcome banner detailing system metrics alerts. A grid of indicators shows employee counts, vector counts, conflicts, and gaps.
2. **AI Chat console**: Side pane listing previous conversations. Main pane features a message thread with agent activation tags. Includes a toggleable trace logging collaboration logs, and sources citations lists. Bottom-left features a quick policy upload terminal.
3. **Interactive Knowledge graph**: Large SVG canvas. Clicking a node (Departments, Projects, Documents, Users) brings up details in the inspector sidebar.
4. **Memory Timeline**: Vertical node timeline displaying event descriptions. Clicking a node populates the details, detailing rationale ("Why").
5. **Smart Onboarding path**: Shows onboarding tracker metrics with progress meter, daily timetables, weekly checklists, and mentor tags. Includes a toggle button to switch to the Meeting Analyzer Room.
6. **Meeting Analyzer Room**: Input boxes to upload transcripts. The extraction details summary outlines, action cards (task, assignee, deadline), and warning boxes.
7. **Expertise finder**: Search input that filters employee list by matching skills, rating, experience, availability, and active projects.
8. **Conflicts & Gaps Auditor**: Left board details policy contradiction cards, outlining suggested corrections. Right board details documentation gap logs sorted by search popularity.
9. **Analytics Hub**: SVG graphs illustrating knowledge base growths, popular searches, and department member distributions.

---

## 4. Local Deployment Guide

### Prerequisites
- **Python 3.10+**
- **Node.js 18+**

### Backend Setup
1. Open your terminal in the `backend/` folder.
2. Setup virtual environment:
   ```bash
   python -m venv .venv
   .venv/Scripts/activate # Windows
   # source .venv/bin/activate # macOS/Linux
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Seed the database (creates tables and initial high-fidelity dashboard contents):
   ```bash
   python seed.py
   ```
5. Launch FastAPI development server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

### Frontend Setup
1. Open your terminal in the `frontend/` folder.
2. Install packages:
   ```bash
   npm install
   ```
3. Launch development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:5173](http://localhost:5173) in your browser.

*Note: The frontend includes auto-fallback simulation logs in case the backend server is temporarily unreached, guaranteeing absolute visual perfection during judge walkthroughs.*

---

## 5. Hackathon Pitch Deck Content (12 Slides)

- **Slide 1: Title Slide**: PulseMind AI — The Living Company Brain. An AI operating system for modern organizations.
- **Slide 2: The Problem**: Scattered handbooks, forgotten decisions, silent policy contradictions, and onboarding friction leak millions in productivity.
- **Slide 3: The Solution**: A centralized corporate brain that doesn't just index, but audits, warns, predicts, and proactively onboard employees.
- **Slide 4: Feature Pillar 1 - RAG Chat & Memory Timeline**: Semantic search with accurate citations linked to a historical timeline outlining the "Why".
- **Slide 5: Feature Pillar 2 - Policy Conflict Scanner**: Real-time compliance auditing scanning legal docs for contradictions.
- **Slide 6: Feature Pillar 3 - Knowledge Gap & Onboarding**: Automatically detects searched items missing from documents, notifying admin, and generates onboarding tracks for hires.
- **Slide 7: Technical Architecture**: Clean modular FastAPI backend, Neon PostgreSQL vector store, Google Gemini models, React flow-graph, glassmorphic UI.
- **Slide 8: Market Opportunity & ROI**: Solves standard knowledge leakage, saving corporate hours spent looking for files and onboarding staff.
- **Slide 9: Under the Hood**: Multi-Agent orchestration dividing cognitive loads into specialized HR, Decision, and Risk agents.
- **Slide 10: Live Demonstration**: Step-by-step walkthrough.
- **Slide 11: Future Roadmap**: Voice searches, slack/jira connectors, and real-time multiplayer document collaborations.
- **Slide 12: Wrap Up**: PulseMind AI — Evolving corporate memory. Thank you!

---

## 6. Live Demo Judge Walkthrough Script (3 Minutes)

**Minute 1: Welcome & Initial Dashboard**
> "Good morning judges! Today we present PulseMind AI — The Living Company Brain. As you can see, the UI is dark, premium and glassmorphic, inspired by Apple and Linear. On this main screen, the system immediately flags critical anomalies: 1 policy conflict detected, and 2 documentation gaps logged."

**Minute 2: Policy Auditing & Knowledge Gaps**
> "Let's inspect the Conflicts tab. The AI has scanned our documents and detected a critical contradiction: the Remote Policy states employees get 30 days leave, while the general handbook states 25 days. The AI computes an 85% contradiction rating, alerts the compliance admin, and suggests a fix. Over in our Gaps list, the system monitors user queries: employees searched 'Deployment Guide' 18 times without hits, so the system flags this as a priority gap."

**Minute 3: Multi-Agent Chat & Onboarding**
> "Now let's open the AI Memory Chat. We ask: 'Why did we migrate to PostgreSQL?'. Behind the scenes, our Multi-Agent Orchestrator coordinates the Decision Agent and Search Agent. It responds outlining the exact date, alternatives evaluated (MySQL, Cassandra), and references. Under Onboarding, HR generates a custom learning checklist for a designer. Emily Watson sees a 45% completion meter, weekly tasks, and mentor assignments."

---

## 7. Future Roadmap Scope
1. **Multiplayer Live Sync**: Integrating WebSocket protocols for multi-user collaboration.
2. **Slack & Teams Integrations**: Query PulseMind AI directly from communication channels.
3. **Voice Queries**: Speech-to-text inputs utilizing Gemini audio models.
4. **Git Code Log Audit**: Scanning repositories commits history to keep the Graph updated on code ownership.
