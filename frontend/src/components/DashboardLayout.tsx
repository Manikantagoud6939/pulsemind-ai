import React, { useState, useEffect } from 'react';
import { 
  Brain, LayoutDashboard, MessageSquare, Network, Hourglass, 
  AlertTriangle, FileVideo, ShieldAlert, Users, BarChart3, 
  Bell, LogOut, Moon, Sun, User, RefreshCw
} from 'lucide-react';
import AIChatConsole from './AIChatConsole';
import MemoryTimelineView from './MemoryTimelineView';
import KnowledgeGraphView from './KnowledgeGraphView';
import ProjectHealthView from './ProjectHealthView';
import ConflictDetectorView from './ConflictDetectorView';
import OnboardingTrackerView from './OnboardingTrackerView';
import ExpertiseFinderView from './ExpertiseFinderView';
import AnalyticsDashboardView from './AnalyticsDashboardView';

interface DashboardLayoutProps {
  onLogout: () => void;
  currentUser: {
    id: number;
    email: string;
    full_name: string;
    role: string;
    department: string;
    skills: string[];
  };
}

export default function DashboardLayout({ onLogout, currentUser }: DashboardLayoutProps) {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState<boolean>(false);
  const [pulseMetrics, setPulseMetrics] = useState<any>({
    users: 0, projects: 0, documents: 0, conflicts: 0, gaps: 0, meetings: 0
  });

  // Load summary metrics and notifications
  const fetchPulseStats = async () => {
    try {
      const token = localStorage.getItem('pm_token');
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const statsRes = await fetch('http://localhost:8000/api/analytics', { headers });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setPulseMetrics(statsData.summary);
      }

      const notifRes = await fetch('http://localhost:8000/api/notifications', { headers });
      if (notifRes.ok) {
        const notifData = await notifRes.json();
        setNotifications(notifData);
      }
    } catch (err) {
      console.warn("Failed to connect to API server. Operating in offline demo mode.");
      // Seed fallback metrics for hackathon visual representation
      setPulseMetrics({
        users: 5, projects: 2, documents: 3, conflicts: 1, gaps: 2, meetings: 1
      });
      setNotifications([
        { id: 1, title: "Policy Conflict Detected", message: "Discrepancy found between Leave & Remote Policy and HR General Handbook.", category: "Policy Conflict", read: false },
        { id: 2, title: "Missing Documentation Gap", message: "'Deployment Guide to Kubernetes' was searched 18 times without matches.", category: "Missing Documentation", read: false }
      ]);
    }
  };

  useEffect(() => {
    fetchPulseStats();
    const interval = setInterval(fetchPulseStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const markNotificationRead = async (id: number) => {
    try {
      const token = localStorage.getItem('pm_token');
      await fetch(`http://localhost:8000/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (e) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'chat', label: 'AI Memory Chat', icon: MessageSquare },
    { id: 'graph', label: 'Knowledge Graph', icon: Network },
    { id: 'timeline', label: 'Company Timeline', icon: Hourglass },
    { id: 'onboarding', label: 'Employee Onboarding', icon: Users },
    { id: 'conflicts', label: 'Conflicts & Gaps', icon: AlertTriangle },
    { id: 'meetings', label: 'Meeting Analyzer', icon: FileVideo },
    { id: 'projects', label: 'Project Health', icon: ShieldAlert },
    { id: 'directory', label: 'Expertise Finder', icon: Users },
    { id: 'analytics', label: 'Analytics Hub', icon: BarChart3 },
  ];

  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  return (
    <div className="flex h-screen bg-[#030712] text-slate-100 overflow-hidden font-sans">
      
      {/* SIDEBAR */}
      <aside className="w-64 glass border-r border-white/5 flex flex-col justify-between z-20">
        <div>
          {/* LOGO */}
          <div className="h-16 flex items-center px-6 border-b border-white/5 gap-3 bg-gradient-to-r from-primary-900/10 to-transparent">
            <div className="p-2 rounded-lg bg-primary-500/20 text-primary-400 border border-primary-500/30">
              <Brain size={20} className="animate-pulse" />
            </div>
            <div>
              <span className="font-extrabold text-lg bg-gradient-to-r from-white via-slate-100 to-primary-400 bg-clip-text text-transparent tracking-tight">PulseMind AI</span>
              <span className="block text-[10px] text-slate-400 font-medium tracking-wide uppercase">The Living Brain</span>
            </div>
          </div>

          {/* NAV LIST */}
          <nav className="p-4 space-y-1.5 overflow-y-auto max-h-[calc(100vh-180px)]">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id); setShowNotifications(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive 
                      ? 'bg-primary-600/20 text-primary-300 border-l-2 border-primary-500 shadow-[inset_4px_0_12px_rgba(139,92,246,0.1)]' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <Icon size={18} className={isActive ? 'text-primary-400' : 'text-slate-400'} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* PROFILE BAR */}
        <div className="p-4 border-t border-white/5 bg-slate-950/40">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-primary-500/20 border border-primary-500/30 flex items-center justify-center text-primary-300 font-bold uppercase text-sm">
              {currentUser.full_name.split(' ').map(n=>n[0]).join('')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">{currentUser.full_name}</p>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary-950 text-primary-300 border border-primary-500/20 font-semibold inline-block truncate">
                {currentUser.role}
              </span>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-red-400 bg-red-950/10 border border-red-500/10 hover:bg-red-950/20 rounded-lg hover:border-red-500/30 transition-all duration-200"
          >
            <LogOut size={13} />
            Log Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* HEADER BAR */}
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-8 z-10 glass">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white capitalize">{activeTab.replace('-', ' ')}</h1>
            <p className="text-xs text-slate-400">Company OS Memory Engine active.</p>
          </div>

          <div className="flex items-center gap-4">
            
            {/* Sync trigger */}
            <button 
              onClick={fetchPulseStats}
              title="Refresh Core Data"
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-white/5 rounded-lg border border-white/5 transition-all"
            >
              <RefreshCw size={16} />
            </button>

            {/* NOTIFICATIONS CONTAINER */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-slate-400 hover:text-slate-200 hover:bg-white/5 rounded-lg border border-white/5 relative transition-all"
              >
                <Bell size={17} />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary-500 text-[9px] font-bold text-white rounded-full flex items-center justify-center animate-bounce">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 glass rounded-xl border border-white/10 shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between pb-3 border-b border-white/5">
                    <span className="font-bold text-sm text-white">Live System Alerts</span>
                    <span className="text-[10px] text-slate-400 bg-white/5 px-2 py-0.5 rounded-full font-semibold">
                      {notifications.length} Total
                    </span>
                  </div>
                  <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4">No active system alerts.</p>
                    ) : (
                      notifications.map((n) => (
                        <div 
                          key={n.id} 
                          onClick={() => markNotificationRead(n.id)}
                          className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                            n.read 
                              ? 'bg-white/5 border-white/5 opacity-55' 
                              : 'bg-primary-950/15 border-primary-500/20 hover:border-primary-500/40'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-white truncate">{n.title}</span>
                            <span className="text-[9px] text-primary-400 uppercase font-semibold">{n.category}</span>
                          </div>
                          <p className="text-[11px] text-slate-300 leading-normal">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* TAB WORKSPACES */}
        <div className="flex-1 overflow-y-auto p-8 relative min-h-0 bg-gradient-to-b from-[#030712] via-[#090d16] to-[#030712]">
          
          {/* Floating background blur nodes */}
          <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-primary-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none -z-10" />

          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              
              {/* WELCOME GLOW CARD */}
              <div className="p-6 rounded-2xl glass border-primary-500/10 glow-purple relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="z-10 flex-1 text-center md:text-left">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary-500/15 text-primary-300 border border-primary-500/20 text-xs font-bold mb-3">
                    <span className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-ping" />
                    Living Operating System Online
                  </div>
                  <h2 className="text-3xl font-extrabold text-white tracking-tight mb-2">
                    Welcome back, <span className="bg-gradient-to-r from-primary-400 to-indigo-300 bg-clip-text text-transparent">{currentUser.full_name}</span>.
                  </h2>
                  <p className="text-slate-300 text-sm max-w-xl leading-relaxed">
                    PulseMind is active. Company Memory is auditing 3 active files and 2 active project teams. 1 major policy contradiction is currently flagged.
                  </p>
                </div>
                <div className="flex gap-3 shrink-0">
                  <button 
                    onClick={() => setActiveTab('chat')} 
                    className="px-4 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg hover:shadow-primary-500/20"
                  >
                    Launch Agent Chat
                  </button>
                  <button 
                    onClick={() => setActiveTab('conflicts')}
                    className="px-4 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-all"
                  >
                    View Policy Mismatches
                  </button>
                </div>
              </div>

              {/* PULSE METRIC GRID */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { label: "Active Employees", value: pulseMetrics.users, icon: Users, color: "text-blue-400" },
                  { label: "Tracked Projects", value: pulseMetrics.projects, icon: ShieldAlert, color: "text-emerald-400" },
                  { label: "Archived Files", value: pulseMetrics.documents, icon: Brain, color: "text-purple-400" },
                  { label: "Policy Conflicts", value: pulseMetrics.conflicts, icon: AlertTriangle, color: "text-red-400" },
                  { label: "Knowledge Gaps", value: pulseMetrics.gaps, icon: Hourglass, color: "text-yellow-400" },
                  { label: "Meetings Logged", value: pulseMetrics.meetings, icon: FileVideo, color: "text-indigo-400" },
                ].map((stat, i) => {
                  const Icon = stat.icon;
                  return (
                    <div key={i} className="p-4 rounded-xl glass hover:border-white/15 transition-all text-center">
                      <div className={`p-2 rounded-lg bg-white/5 inline-block mb-3 ${stat.color}`}>
                        <Icon size={18} />
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{stat.label}</p>
                      <h4 className="text-2xl font-extrabold text-white mt-1">{stat.value}</h4>
                    </div>
                  );
                })}
              </div>

              {/* MAIN CONTENT SPLIT GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* TIMELINE PREVIEW */}
                <div className="p-6 rounded-2xl glass flex flex-col justify-between h-[360px]">
                  <div className="flex items-center justify-between pb-3 border-b border-white/5">
                    <div>
                      <h3 className="font-bold text-base text-white">Timeline Feed</h3>
                      <p className="text-[11px] text-slate-400">Latest structural events in memory.</p>
                    </div>
                    <button onClick={() => setActiveTab('timeline')} className="text-xs font-bold text-primary-400 hover:text-primary-300">View Timeline</button>
                  </div>
                  <div className="flex-1 overflow-hidden mt-4 relative pr-2">
                    <MemoryTimelineView limit={2} compactMode={true} />
                  </div>
                </div>

                {/* ACTIVE KNOWLEDGE GAPS */}
                <div className="p-6 rounded-2xl glass flex flex-col h-[360px]">
                  <div className="flex items-center justify-between pb-3 border-b border-white/5">
                    <div>
                      <h3 className="font-bold text-base text-white">Identified Knowledge Gaps</h3>
                      <p className="text-[11px] text-slate-400">Searched guides currently missing in documents.</p>
                    </div>
                    <button onClick={() => setActiveTab('conflicts')} className="text-xs font-bold text-primary-400 hover:text-primary-300">View Audits</button>
                  </div>
                  <div className="flex-1 overflow-y-auto mt-4 space-y-3 pr-2">
                    <ConflictDetectorView limitGaps={2} showGapsOnly={true} />
                  </div>
                </div>
              </div>

            </div>
          )}

          {activeTab === 'chat' && <AIChatConsole currentUser={currentUser} />}
          {activeTab === 'graph' && <KnowledgeGraphView />}
          {activeTab === 'timeline' && <MemoryTimelineView />}
          {activeTab === 'onboarding' && <OnboardingTrackerView currentUser={currentUser} />}
          {activeTab === 'conflicts' && <ConflictDetectorView />}
          {activeTab === 'meetings' && <OnboardingTrackerView currentUser={currentUser} activeMode="meetings" />}
          {activeTab === 'projects' && <ProjectHealthView />}
          {activeTab === 'directory' && <ExpertiseFinderView />}
          {activeTab === 'analytics' && <AnalyticsDashboardView />}
        </div>
      </main>
    </div>
  );
}
