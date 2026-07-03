import React, { useState, useEffect, useRef } from 'react';
import { Send, FileText, Bot, User as UserIcon, Plus, ChevronDown, ChevronUp, Link as LinkIcon, Sparkles } from 'lucide-react';

interface AIChatConsoleProps {
  currentUser: any;
}

export default function AIChatConsole({ currentUser }: AIChatConsoleProps) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [activeSession, setActiveSession] = useState<any | null>(null);
  const [inputMsg, setInputMsg] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const [messages, setMessages] = useState<any[]>([]);
  
  // Document Upload States
  const [docTitle, setDocTitle] = useState<string>('');
  const [docDept, setDocDept] = useState<string>('Engineering');
  const [docContent, setDocContent] = useState<string>('');
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadMsg, setUploadMsg] = useState<string>('');

  const [collabLog, setCollabLog] = useState<string>('');
  const [activeAgents, setActiveAgents] = useState<string[]>([]);
  const [showCollabPane, setShowCollabPane] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchSessions = async () => {
    try {
      const token = localStorage.getItem('pm_token');
      const res = await fetch('http://localhost:8000/api/chat/sessions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
        if (data.length > 0 && !activeSession) {
          setActiveSession(data[0]);
          setMessages(data[0].messages || []);
        }
      }
    } catch (e) {
      // Offline fallback sessions
      const mockSessions = [
        {
          id: 1,
          title: "Logistics postgres migration",
          messages: [
            { id: 101, sender: "user", content: "Why did we migrate to PostgreSQL in the Logistics project?" },
            { 
              id: 102, 
              sender: "assistant", 
              content: "We migrated to PostgreSQL on 2026-06-13. The main reason was the requirement for strict transactions (ACID compliance) and resolving order replication issues during high-frequency writes. PostgreSQL's JSONB indices were chosen over Cassandra and MySQL.",
              citations: [{ title: "Logistics DB Migration Guide", file_path: "file:///documents/logistics_db_migration.txt", score: 0.95 }]
            }
          ]
        }
      ];
      setSessions(mockSessions);
      if (!activeSession) {
        setActiveSession(mockSessions[0]);
        setMessages(mockSessions[0].messages);
      }
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectSession = (session: any) => {
    setActiveSession(session);
    setMessages(session.messages || []);
    setCollabLog('');
    setActiveAgents([]);
  };

  const createSession = async () => {
    try {
      const token = localStorage.getItem('pm_token');
      const res = await fetch('http://localhost:8000/api/chat/sessions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(prev => [data, ...prev]);
        setActiveSession(data);
        setMessages([]);
      }
    } catch (e) {
      const nextId = sessions.length + 1;
      const newSess = { id: nextId, title: "New Conversation", messages: [] };
      setSessions(prev => [newSess, ...prev]);
      setActiveSession(newSess);
      setMessages([]);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim() || !activeSession) return;

    const userText = inputMsg;
    setInputMsg('');
    setSending(true);

    const tempUserMsg = { id: Date.now(), sender: 'user', content: userText };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const token = localStorage.getItem('pm_token');
      const res = await fetch(`http://localhost:8000/api/chat/sessions/${activeSession.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: userText })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, data.assistant_message]);
        setCollabLog(data.collab_log);
        setActiveAgents(data.agents_involved);
        setShowCollabPane(true);
        fetchSessions();
      }
    } catch (err) {
      // Mock AI response locally on error (offline mode)
      setTimeout(() => {
        let aiAnswer = "I'm operating in offline mode. Let me know if you would like me to trigger search heuristics.";
        let citations: any[] = [];
        let agents = ["Knowledge Agent", "Search Agent"];
        let log = "Orchestrator loaded mock indexing offline. Active agents: Knowledge Agent, Search Agent.";

        const query = userText.toLowerCase();
        if (query.includes('postgres') || query.includes('migrate')) {
          aiAnswer = "We migrated to PostgreSQL on 2026-06-13. The main reason was the requirement for strict transactions (ACID compliance) and resolving order replication issues during high-frequency writes. PostgreSQL's JSONB indices were chosen over Cassandra and MySQL.";
          citations = [{ title: "Logistics DB Migration Guide", file_path: "file:///documents/logistics_db_migration.txt", score: 0.95 }];
          agents = ["Decision Agent", "Search Agent", "Planning Agent"];
          log = "Orchestrator detected architectural query. Triggered Decision Agent, Search Agent. Synthesized response using Planning Agent.";
        } else if (query.includes('kubernetes') || query.includes('who knows')) {
          aiAnswer = "David Miller is our primary Kubernetes expert, rated 5/5. Sarah Connor is rated 4/5. David is 80% available for projects.";
          citations = [{ title: "Dev Team Skill Assessments", file_path: "file:///documents/skill_assessments.txt", score: 0.92 }];
          agents = ["HR Agent", "Search Agent"];
          log = "Orchestrator detected human expertise query. Triggered HR Agent to query skills database. Search Agent pulled project allocations.";
        }

        const assistantMsg = {
          id: Date.now() + 1,
          sender: 'assistant',
          content: aiAnswer,
          citations: citations
        };

        setMessages(prev => [...prev, assistantMsg]);
        setCollabLog(log);
        setActiveAgents(agents);
        setShowCollabPane(true);
      }, 800);
    } finally {
      setSending(false);
    }
  };

  const handleDocUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim() || !docContent.trim()) return;

    setUploading(true);
    setUploadMsg('');

    try {
      const token = localStorage.getItem('pm_token');
      const res = await fetch(`http://localhost:8000/api/documents/upload?title=${encodeURIComponent(docTitle)}&department=${encodeURIComponent(docDept)}&file_type=text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: docContent
      });

      if (res.ok) {
        setUploadMsg('Document uploaded and policy contradictions parsed successfully!');
        setDocTitle('');
        setDocContent('');
      } else {
        setUploadMsg('Failed to index document.');
      }
    } catch (err) {
      // Simulate upload successfully offline
      setTimeout(() => {
        setUploadMsg('Offline Demo: Document uploaded and policy contradictions parsed successfully!');
        setDocTitle('');
        setDocContent('');
      }, 1000);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 h-[calc(100vh-120px)] animate-in fade-in duration-300">
      
      {/* SIDEBAR - CONVERSATIONS & UPLOADS */}
      <div className="xl:col-span-1 flex flex-col gap-6 h-full min-h-0">
        
        {/* CHAT SESSION LIST */}
        <div className="p-4 rounded-2xl glass flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
            <span className="font-bold text-sm text-white">Conversations</span>
            <button 
              onClick={createSession}
              className="p-1 text-primary-400 hover:text-primary-300 hover:bg-white/5 rounded-lg border border-primary-500/20 transition-all"
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => selectSession(s)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold truncate transition-all ${
                  activeSession?.id === s.id 
                    ? 'bg-primary-600/25 text-primary-300 border border-primary-500/25' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                }`}
              >
                💬 {s.title}
              </button>
            ))}
          </div>
        </div>

        {/* FEED COMPANY MEMORY FORM */}
        <div className="p-4 rounded-2xl glass shrink-0">
          <span className="font-bold text-sm text-white block border-b border-white/5 pb-3 mb-4">Feed Company Memory</span>
          <form onSubmit={handleDocUpload} className="space-y-3">
            <div>
              <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Document Title</label>
              <input 
                type="text" 
                placeholder="e.g. Leave & Holiday Rules"
                value={docTitle}
                onChange={e => setDocTitle(e.target.value)}
                required
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-primary-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Department Context</label>
              <select 
                value={docDept} 
                onChange={e => setDocDept(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary-500 transition-all"
              >
                <option value="Engineering">Engineering</option>
                <option value="People Operations">People Operations</option>
                <option value="Finance">Finance</option>
                <option value="Logistics & Dispatch">Logistics & Dispatch</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Text Contents</label>
              <textarea 
                rows={3}
                placeholder="Paste manuals, policies or post-mortems..."
                value={docContent}
                onChange={e => setDocContent(e.target.value)}
                required
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-primary-500 transition-all resize-none"
              />
            </div>
            <button 
              type="submit" 
              disabled={uploading}
              className="w-full py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
            >
              {uploading ? 'Processing & Auditing...' : 'Upload & Analyze Policy'}
            </button>
            {uploadMsg && <p className="text-[10px] text-emerald-400 font-semibold text-center mt-2">{uploadMsg}</p>}
          </form>
        </div>

      </div>

      {/* CHAT DISPLAY PANELS */}
      <div className="xl:col-span-3 flex flex-col gap-6 h-full min-h-0">
        
        {/* CHAT WINDOW */}
        <div className="flex-1 rounded-2xl glass flex flex-col min-h-0 relative">
          
          {/* HEADER CHAT */}
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-slate-950/20">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-primary-400" />
              <span className="font-extrabold text-sm text-white">RAG Company Memory Console</span>
            </div>
            {activeAgents.length > 0 && (
              <div className="flex items-center gap-1">
                {activeAgents.map((ag, i) => (
                  <span key={i} className="text-[9px] bg-primary-950 text-primary-300 border border-primary-500/20 px-2 py-0.5 rounded-full font-bold">
                    🤖 {ag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* MESSAGES SCROLLER */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto space-y-3">
                <div className="w-12 h-12 bg-primary-500/10 text-primary-400 rounded-full border border-primary-500/20 flex items-center justify-center glow-purple">
                  <Bot size={22} />
                </div>
                <h4 className="font-bold text-white text-sm">Ask the Company Brain</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Inquire about decisions, code expertise, meeting retro summaries, policy details or project risks. e.g., <span className="text-primary-300 font-semibold italic">"Why did we migrate to PostgreSQL?"</span>
                </p>
              </div>
            ) : (
              messages.map((m) => {
                const isUser = m.sender === 'user';
                return (
                  <div key={m.id} className={`flex gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
                    {!isUser && (
                      <div className="w-8 h-8 rounded-full bg-primary-950 border border-primary-500/30 flex items-center justify-center text-primary-300 shrink-0 font-extrabold text-xs">
                        PM
                      </div>
                    )}
                    <div className={`max-w-[80%] p-4 rounded-2xl text-xs leading-relaxed ${
                      isUser 
                        ? 'bg-primary-600 text-white rounded-tr-none' 
                        : 'bg-white/5 border border-white/5 text-slate-100 rounded-tl-none'
                    }`}>
                      <p className="whitespace-pre-line">{m.content}</p>
                      
                      {/* CITATION PANEL */}
                      {!isUser && m.citations && m.citations.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-white/5 space-y-1.5">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Citations & Sources</span>
                          {m.citations.map((c: any, ci: number) => (
                            <a 
                              key={ci} 
                              href={c.file_path}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/5 text-[10px] font-bold text-primary-300 transition-all mr-2"
                            >
                              <LinkIcon size={10} />
                              {c.title}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                    {isUser && (
                      <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 shrink-0 font-extrabold text-xs uppercase">
                        {currentUser.full_name[0]}
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* CHAT INPUT FORM */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5 bg-slate-950/20 flex gap-2">
            <input 
              type="text" 
              placeholder="Ask anything about decisions, timelines, expertise..."
              value={inputMsg}
              onChange={e => setInputMsg(e.target.value)}
              disabled={sending}
              className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 transition-all"
            />
            <button 
              type="submit" 
              disabled={sending}
              className="p-3 bg-primary-600 hover:bg-primary-500 text-white rounded-xl transition-all shadow-lg hover:shadow-primary-500/20 disabled:opacity-50"
            >
              <Send size={15} />
            </button>
          </form>

        </div>

        {/* MULTI-AGENT COLLABORATION LOG PANE */}
        {showCollabPane && collabLog && (
          <div className="p-4 rounded-2xl glass border-primary-500/25 bg-primary-950/10">
            <button 
              onClick={() => setShowCollabPane(!showCollabPane)}
              className="w-full flex items-center justify-between text-xs font-bold text-primary-300"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
                Multi-Agent Collaboration Trace
              </div>
              <ChevronUp size={14} />
            </button>
            <div className="mt-3 p-3 bg-black/40 rounded-xl border border-white/5 text-[11px] font-mono text-slate-300 leading-relaxed whitespace-pre-wrap">
              {collabLog}
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
