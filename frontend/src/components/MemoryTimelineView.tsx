import React, { useState, useEffect } from 'react';
import { Calendar, User, Code, FileText, ArrowRight, Server, Wrench, ShieldAlert } from 'lucide-react';

interface MemoryTimelineViewProps {
  limit?: number;
  compactMode?: boolean;
}

export default function MemoryTimelineView({ limit, compactMode = false }: MemoryTimelineViewProps) {
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  const fetchTimeline = async () => {
    try {
      const token = localStorage.getItem('pm_token');
      const res = await fetch('http://localhost:8000/api/timeline', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEvents(limit ? data.slice(0, limit) : data);
        if (data.length > 0 && !compactMode) {
          setSelectedEvent(data[0]);
        }
      }
    } catch (e) {
      // Seed fallback offline events
      const mockEvents = [
        {
          id: 1,
          event_type: "Architecture Changed",
          title: "Database Migrated to PostgreSQL",
          description: "Migrated Logistics operational system from MongoDB to PostgreSQL for strict ACID consistency compliance.",
          event_date: "2026-06-13T10:00:00Z",
          metadata_json: {
            changed_by: "Alice Chen",
            why: "Eventual consistency in MongoDB caused duplication logs during promotion load testing.",
            alternatives: "MySQL, Cassandra",
            decision_ref: "/decisions/postgres_migration"
          }
        },
        {
          id: 2,
          event_type: "Requirement Added",
          title: "GraphQL Gateway Integrated",
          description: "Apollo GraphQL Gateway proxy configured between dashboard clients and backend controllers.",
          event_date: "2026-06-21T14:30:00Z",
          metadata_json: {
            changed_by: "David Miller",
            why: "Optimize client query latency and avoid REST payload overfetching.",
            performance_impact: "40% payload overhead reduction"
          }
        },
        {
          id: 3,
          event_type: "Deployment Done",
          title: "Kubernetes Production Staging",
          description: "Successfully configured K8s Helm charts and staged Logistics API services to production nodes.",
          event_date: "2026-06-28T09:15:00Z",
          metadata_json: {
            changed_by: "Sarah Connor",
            why: "Facilitate auto-scaling policies to handle Q3 traffic spikes.",
            deployment_id: "staging-logistics-v2"
          }
        }
      ];
      setEvents(limit ? mockEvents.slice(0, limit) : mockEvents);
      if (mockEvents.length > 0 && !compactMode) {
        setSelectedEvent(mockEvents[0]);
      }
    }
  };

  useEffect(() => {
    fetchTimeline();
  }, []);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'Architecture Changed':
        return <Server size={14} className="text-purple-400" />;
      case 'Requirement Added':
        return <Code size={14} className="text-blue-400" />;
      case 'Deployment Done':
        return <Wrench size={14} className="text-emerald-400" />;
      default:
        return <FileText size={14} className="text-slate-400" />;
    }
  };

  if (compactMode) {
    return (
      <div className="space-y-4">
        {events.map((e) => (
          <div key={e.id} className="flex gap-3 text-left">
            <div className="flex flex-col items-center">
              <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                {getEventIcon(e.event_type)}
              </div>
              <div className="w-[1px] flex-1 bg-white/10 my-1" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[9px] text-slate-400 font-semibold block">{new Date(e.event_date).toLocaleDateString()}</span>
              <h5 className="text-xs font-bold text-slate-200 truncate">{e.title}</h5>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">{e.description}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
      
      {/* TIMELINE LIST CONTAINER */}
      <div className="lg:col-span-2 p-6 rounded-2xl glass flex flex-col">
        <h3 className="font-extrabold text-base text-white mb-6 border-b border-white/5 pb-3">Company Memory Timeline</h3>
        <div className="relative border-l border-white/10 pl-6 ml-3 space-y-8">
          {events.map((e) => (
            <div 
              key={e.id} 
              onClick={() => setSelectedEvent(e)}
              className={`relative cursor-pointer group transition-all ${selectedEvent?.id === e.id ? 'scale-[1.01]' : ''}`}
            >
              {/* Timeline marker icon */}
              <div className={`absolute -left-[37px] top-0.5 w-7 h-7 rounded-full flex items-center justify-center border transition-all ${
                selectedEvent?.id === e.id 
                  ? 'bg-primary-950 border-primary-500 scale-110 shadow-lg glow-purple' 
                  : 'bg-slate-950 border-white/10 group-hover:border-white/20'
              }`}>
                {getEventIcon(e.event_type)}
              </div>

              <div className={`p-4 rounded-xl border transition-all ${
                selectedEvent?.id === e.id 
                  ? 'bg-primary-950/20 border-primary-500/35' 
                  : 'bg-white/5 border-white/5 hover:border-white/15'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{e.event_type}</span>
                  <span className="text-[10px] text-slate-400 font-bold bg-white/5 px-2 py-0.5 rounded">
                    {new Date(e.event_date).toLocaleDateString()}
                  </span>
                </div>
                <h4 className="font-bold text-sm text-white group-hover:text-primary-300 transition-colors">{e.title}</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{e.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* METADATA EXPANDED PANEL */}
      <div className="lg:col-span-1">
        {selectedEvent ? (
          <div className="p-6 rounded-2xl glass border-primary-500/10 shadow-2xl space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center gap-2 pb-3 border-b border-white/5">
              <span className="p-1.5 rounded-lg bg-primary-500/10 text-primary-400 border border-primary-500/20">
                <ShieldAlert size={16} />
              </span>
              <span className="font-extrabold text-sm text-white">Event Detail Inspector</span>
            </div>

            <div className="space-y-4">
              <div>
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Headline</span>
                <p className="text-xs font-semibold text-slate-200">{selectedEvent.title}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Logged By</span>
                  <p className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <User size={12} className="text-primary-400" />
                    {selectedEvent.metadata_json.changed_by || 'System'}
                  </p>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Event Date</span>
                  <p className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <Calendar size={12} className="text-primary-400" />
                    {new Date(selectedEvent.event_date).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-1.5">
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Business Rationale ("Why")</span>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  {selectedEvent.metadata_json.why || 'No architectural rationale specified.'}
                </p>
              </div>

              {selectedEvent.metadata_json.decision_ref && (
                <div className="pt-3 border-t border-white/5">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Linked Decisions</span>
                  <button className="flex items-center gap-2 px-3 py-2 bg-primary-600/10 hover:bg-primary-600/20 border border-primary-500/20 text-primary-300 rounded-lg text-xs font-bold w-full transition-all">
                    <span>View Architecture Record</span>
                    <ArrowRight size={12} className="ml-auto" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-2xl glass text-center py-12 text-slate-400 text-xs">
            Select a timeline event to view details.
          </div>
        )}
      </div>

    </div>
  );
}
