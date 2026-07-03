import React, { useState, useEffect } from 'react';
import { 
  Users, BookOpen, Clock, Heart, Award, CheckSquare, 
  Play, Video, FileText, Plus, Check, Trash2, Calendar 
} from 'lucide-react';

interface OnboardingTrackerViewProps {
  currentUser: any;
  activeMode?: 'onboarding' | 'meetings';
}

export default function OnboardingTrackerView({ currentUser, activeMode = 'onboarding' }: OnboardingTrackerViewProps) {
  const [mode, setMode] = useState<'onboarding' | 'meetings'>(activeMode);
  
  // Onboarding States
  const [onboardPath, setOnboardPath] = useState<any | null>(null);
  const [progress, setProgress] = useState<number>(0);
  
  // Meeting Analyzer States
  const [meetings, setMeetings] = useState<any[]>([]);
  const [activeMeeting, setActiveMeeting] = useState<any | null>(null);
  const [meetingTitle, setMeetingTitle] = useState<string>('');
  const [meetingTranscript, setMeetingTranscript] = useState<string>('');
  const [analyzing, setAnalyzing] = useState<boolean>(false);

  const fetchOnboardingData = async () => {
    try {
      const token = localStorage.getItem('pm_token');
      const res = await fetch(`http://localhost:8000/api/onboarding/${currentUser.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOnboardPath(data);
        setProgress(data.progress_percentage || 0);
      }
    } catch (e) {
      // Offline fallback values
      setOnboardPath({
        learning_path: {
          "Week 1": ["Corporate Intro & Compliance Setup", "Architecture Document Study", "Figma Design System Overview"],
          "Week 2": ["Vite Node Setup Sync", "First styling adjustment ticket"],
          "Week 3": ["Build reusable graph node modules"]
        },
        required_documents: [
          { title: "Leave & Remote Policy 2026", read: false },
          { title: "HR General Handbook", read: true }
        ],
        mentor_suggestions: ["Alice Chen (Lead Designer)", "David Miller (Cloud Architect)"],
        training_tasks: [
          { task: "Setup Git SSH Keys and repositories access", priority: "High", done: false },
          { task: "Complete compliance training session", priority: "High", done: false },
          { task: "Familiarize with Tailwind components", priority: "Medium", done: true }
        ],
        daily_schedule: {
          "09:00": "HR Portal Onboarding Sync",
          "10:00": "Design System Walkthrough with Alice",
          "14:00": "Git repo code review"
        },
        skill_assessment: {
          "Figma UI": "Advanced",
          "React Core": "Intermediate",
          "Tailwind CSS": "Intermediate"
        }
      });
      setProgress(45.0);
    }
  };

  const fetchMeetings = async () => {
    try {
      const token = localStorage.getItem('pm_token');
      const res = await fetch('http://localhost:8000/api/meetings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMeetings(data);
        if (data.length > 0) setActiveMeeting(data[0]);
      }
    } catch (e) {
      const mockMeetings = [
        {
          id: 1,
          title: "Logistics postgres migration",
          meeting_date: "2026-06-13",
          summary: "Reviewed high-frequency write race conditions. Decided to transition storage layers to PostgreSQL for transactional isolation.",
          action_items: [
            { task: "Draft DB schema updates", assignee: "Alice Chen", deadline: "2026-07-06" },
            { task: "Prepare migration scripts", assignee: "David Miller", deadline: "2026-07-08" }
          ],
          risks: ["Write locks during migration cut-over window."],
          future_tasks: ["Archive MongoDB historical indexes."]
        }
      ];
      setMeetings(mockMeetings);
      setActiveMeeting(mockMeetings[0]);
    }
  };

  useEffect(() => {
    fetchOnboardingData();
    fetchMeetings();
  }, []);

  const toggleTask = async (idx: number) => {
    if (!onboardPath) return;
    const updatedTasks = [...onboardPath.training_tasks];
    updatedTasks[idx].done = !updatedTasks[idx].done;
    
    // Compute new progress %
    const doneCount = updatedTasks.filter(t => t.done).length;
    const nextProgress = Math.round((doneCount / updatedTasks.length) * 100);
    setProgress(nextProgress);
    
    setOnboardPath({ ...onboardPath, training_tasks: updatedTasks });

    try {
      const token = localStorage.getItem('pm_token');
      await fetch(`http://localhost:8000/api/onboarding/${currentUser.id}/progress?progress=${nextProgress}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (err) {
      console.warn("Offline: progress updated locally.");
    }
  };

  const handleAnalyzeMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingTitle.trim() || !meetingTranscript.trim()) return;

    setAnalyzing(true);
    try {
      const token = localStorage.getItem('pm_token');
      const res = await fetch(`http://localhost:8000/api/meetings/analyze?title=${encodeURIComponent(meetingTitle)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(meetingTranscript)
      });
      if (res.ok) {
        const data = await res.json();
        setMeetings(prev => [data, ...prev]);
        setActiveMeeting(data);
        setMeetingTitle('');
        setMeetingTranscript('');
      }
    } catch (e) {
      // Simulate meeting output
      setTimeout(() => {
        const mockMeeting = {
          id: Date.now(),
          title: meetingTitle,
          meeting_date: new Date().toISOString().split('T')[0],
          summary: "AI parsed meeting concluding team roles and task assignments.",
          action_items: [
            { task: "Setup initial project endpoints", assignee: "David Miller", deadline: "2026-07-15" }
          ],
          risks: ["API deployment latency."],
          future_tasks: ["Configure telemetry monitoring dashboards."]
        };
        setMeetings(prev => [mockMeeting, ...prev]);
        setActiveMeeting(mockMeeting);
        setMeetingTitle('');
        setMeetingTranscript('');
      }, 1000);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* MODE TABS SWITCH */}
      <div className="flex gap-2 border-b border-white/5 pb-2">
        <button 
          onClick={() => setMode('onboarding')}
          className={`px-4 py-2 text-xs font-bold transition-all rounded-lg ${
            mode === 'onboarding' ? 'bg-primary-600/20 text-primary-300 border border-primary-500/25' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Smart Onboarding Path
        </button>
        <button 
          onClick={() => setMode('meetings')}
          className={`px-4 py-2 text-xs font-bold transition-all rounded-lg ${
            mode === 'meetings' ? 'bg-primary-600/20 text-primary-300 border border-primary-500/25' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Meeting Analyzer Room
        </button>
      </div>

      {/* 1. ONBOARDING MODE */}
      {mode === 'onboarding' && onboardPath && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT: PROGRESS & TASKS */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* WELCOME METER */}
            <div className="p-6 rounded-2xl glass flex flex-col md:flex-row justify-between items-center gap-6">
              <div>
                <h3 className="text-xl font-extrabold text-white">Emily's Learning Roadmap</h3>
                <p className="text-xs text-slate-400 mt-1">HR generator onboarding trail for Emily Watson (Employee - Engineering).</p>
              </div>
              <div className="w-full md:w-48 shrink-0">
                <div className="flex justify-between items-center mb-1 text-xs">
                  <span className="text-slate-300 font-medium">Roadmap Progress</span>
                  <span className="font-bold text-white">{progress}%</span>
                </div>
                <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden border border-white/5 p-[1px]">
                  <div 
                    className="h-full bg-primary-500 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>

            {/* CHECKLIST */}
            <div className="p-6 rounded-2xl glass space-y-4">
              <span className="font-extrabold text-sm text-white block border-b border-white/5 pb-2">Training Checklists</span>
              <div className="space-y-3">
                {onboardPath.training_tasks.map((t: any, idx: number) => (
                  <div 
                    key={idx} 
                    onClick={() => toggleTask(idx)}
                    className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 hover:border-white/15 cursor-pointer transition-all"
                  >
                    <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-all ${
                      t.done 
                        ? 'bg-emerald-600 border-emerald-500 text-white' 
                        : 'bg-slate-950 border-white/10'
                    }`}>
                      {t.done && <Check size={12} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold ${t.done ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                        {t.task}
                      </p>
                    </div>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      t.priority === 'High' ? 'bg-red-950 text-red-400' : 'bg-slate-900 text-slate-400'
                    }`}>
                      {t.priority}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ROADMAP PHASES */}
            <div className="p-6 rounded-2xl glass space-y-4">
              <span className="font-extrabold text-sm text-white block border-b border-white/5 pb-2">Weekly Curriculum</span>
              <div className="space-y-4">
                {Object.entries(onboardPath.learning_path).map(([week, items]: any, idx) => (
                  <div key={idx} className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-2">
                    <span className="text-xs font-extrabold text-primary-400 block">{week}</span>
                    <ul className="list-disc pl-4 space-y-1 text-xs text-slate-300">
                      {items.map((item: string, ii: number) => (
                        <li key={ii}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* RIGHT: MENTORS, DOCUMENTS & SCHEDULE */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* SUGGESTED MENTORS */}
            <div className="p-6 rounded-2xl glass space-y-3">
              <span className="font-extrabold text-sm text-white block border-b border-white/5 pb-2">Recommended Mentors</span>
              <div className="space-y-2">
                {onboardPath.mentor_suggestions.map((m: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                    <div className="w-6 h-6 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center font-bold text-[10px]">
                      {m.split(' ').map(n=>n[0]).join('')}
                    </div>
                    {m}
                  </div>
                ))}
              </div>
            </div>

            {/* REQUIRED READING */}
            <div className="p-6 rounded-2xl glass space-y-3">
              <span className="font-extrabold text-sm text-white block border-b border-white/5 pb-2">Required Reading Documents</span>
              <div className="space-y-2">
                {onboardPath.required_documents.map((d: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center text-xs p-2 bg-white/5 rounded-lg border border-white/5">
                    <span className="text-slate-300 truncate max-w-[70%]">{d.title}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                      d.read ? 'bg-emerald-950 text-emerald-400' : 'bg-yellow-950 text-yellow-400'
                    }`}>
                      {d.read ? 'Completed' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* DAILY EVENTS */}
            <div className="p-6 rounded-2xl glass space-y-3">
              <span className="font-extrabold text-sm text-white block border-b border-white/5 pb-2">Onboarding Daily Schedule</span>
              <div className="space-y-3">
                {Object.entries(onboardPath.daily_schedule).map(([time, desc]: any, idx) => (
                  <div key={idx} className="flex gap-3 text-xs leading-normal">
                    <span className="font-mono text-primary-400 font-bold shrink-0">{time}</span>
                    <span className="text-slate-300">{desc}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* 2. MEETINGS MODE */}
      {mode === 'meetings' && (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          
          {/* UPLOAD & MEETINGS LIST */}
          <div className="xl:col-span-1 flex flex-col gap-6">
            
            {/* UPLOAD FORM */}
            <div className="p-4 rounded-2xl glass shrink-0">
              <span className="font-bold text-sm text-white block border-b border-white/5 pb-3 mb-4">Analyze New Meeting</span>
              <form onSubmit={handleAnalyzeMeeting} className="space-y-3">
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Meeting Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Q3 Roadmap Review"
                    value={meetingTitle}
                    onChange={e => setMeetingTitle(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-primary-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Meeting Transcript</label>
                  <textarea 
                    rows={4}
                    placeholder="Paste transcripts, notes or chat logs..."
                    value={meetingTranscript}
                    onChange={e => setMeetingTranscript(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-primary-500 transition-all resize-none"
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={analyzing}
                  className="w-full py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                >
                  {analyzing ? 'AI Transcribing...' : 'Analyze & Post to Memory'}
                </button>
              </form>
            </div>

            {/* PREVIOUS MEETINGS */}
            <div className="p-4 rounded-2xl glass flex-1 overflow-y-auto space-y-2">
              <span className="font-bold text-sm text-white block border-b border-white/5 pb-3 mb-2">Previous Meetings</span>
              {meetings.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setActiveMeeting(m)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    activeMeeting?.id === m.id 
                      ? 'bg-primary-600/25 border-primary-500/25 text-white' 
                      : 'bg-white/5 border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/10'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1 text-xs font-bold">
                    <span className="truncate">{m.title}</span>
                  </div>
                  <span className="text-[9px] text-slate-500 block">{m.meeting_date}</span>
                </button>
              ))}
            </div>

          </div>

          {/* ANALYSIS BOARD */}
          <div className="xl:col-span-3">
            {activeMeeting ? (
              <div className="space-y-6">
                
                {/* SUMMARY HEADER */}
                <div className="p-6 rounded-2xl glass border border-white/5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Meeting Summary</span>
                  <h4 className="text-xl font-bold text-white mb-3">{activeMeeting.title}</h4>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">{activeMeeting.summary}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* ACTION ITEMS */}
                  <div className="p-6 rounded-2xl glass space-y-4">
                    <span className="font-extrabold text-sm text-white block border-b border-white/5 pb-2">Assigned Action Items</span>
                    <div className="space-y-2">
                      {activeMeeting.action_items.map((ai: any, idx: number) => (
                        <div key={idx} className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-1.5">
                          <p className="text-xs font-semibold text-slate-200">🎯 {ai.task}</p>
                          <div className="flex justify-between text-[10px] text-slate-400">
                            <span>Assignee: {ai.assignee}</span>
                            <span>Deadline: {ai.deadline}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* RISKS & ROADMAP */}
                  <div className="p-6 rounded-2xl glass space-y-4">
                    
                    {/* RISKS */}
                    <div className="space-y-2">
                      <span className="font-extrabold text-xs text-red-400 block border-b border-white/5 pb-2">Flagged Project Risks</span>
                      {activeMeeting.risks.map((r: string, idx: number) => (
                        <p key={idx} className="text-xs text-slate-300 bg-red-950/10 border border-red-500/10 p-2.5 rounded-lg leading-normal">
                          ⚠️ {r}
                        </p>
                      ))}
                    </div>

                    {/* FUTURE TASKS */}
                    <div className="space-y-2 pt-2">
                      <span className="font-extrabold text-xs text-primary-300 block border-b border-white/5 pb-2">Future Tasks & Roadmap</span>
                      {activeMeeting.future_tasks.map((ft: string, idx: number) => (
                        <p key={idx} className="text-xs text-slate-300 bg-white/5 border border-white/5 p-2.5 rounded-lg leading-normal">
                          🔧 {ft}
                        </p>
                      ))}
                    </div>

                  </div>

                </div>

              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 text-xs py-24 glass rounded-2xl">
                Select a meeting from the list to view extraction summaries.
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
