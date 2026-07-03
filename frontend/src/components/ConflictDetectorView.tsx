import React, { useState, useEffect } from 'react';
import { AlertOctagon, RefreshCw, FileWarning, HelpCircle, Check } from 'lucide-react';

interface ConflictDetectorViewProps {
  limitGaps?: number;
  showGapsOnly?: boolean;
}

export default function ConflictDetectorView({ limitGaps, showGapsOnly = false }: ConflictDetectorViewProps) {
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [gaps, setGaps] = useState<any[]>([]);
  const [auditing, setAuditing] = useState<boolean>(false);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('pm_token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const gapRes = await fetch('http://localhost:8000/api/gaps', { headers });
      if (gapRes.ok) {
        const gapData = await gapRes.json();
        setGaps(limitGaps ? gapData.slice(0, limitGaps) : gapData);
      }

      if (!showGapsOnly) {
        const conflictRes = await fetch('http://localhost:8000/api/conflicts', { headers });
        if (conflictRes.ok) {
          setConflicts(await conflictRes.json());
        }
      }
    } catch (e) {
      // Offline fallback values
      const mockGaps = [
        { id: 1, query_cluster: "Deployment Guide to Kubernetes", hit_count: 18, priority: "High", suggested_documentation: "Write a step-by-step deploy manual explaining ingress routes and replica scaling parameters." },
        { id: 2, query_cluster: "Parental Leave Policy Guidelines", hit_count: 9, priority: "Medium", suggested_documentation: "Generate a policy document covering leave duration allowances and salary adjustments." }
      ];
      setGaps(limitGaps ? mockGaps.slice(0, limitGaps) : mockGaps);

      if (!showGapsOnly) {
        setConflicts([
          {
            id: 1,
            policy_name_a: "Leave & Remote Policy 2026",
            policy_name_b: "HR General Handbook",
            conflict_desc: "Leave & Remote Policy 2026 allocates 30 calendar days of annual paid leave, whereas Section 3.2 of the HR General Handbook lists 25 days.",
            conflict_percentage: 85.0,
            affected_departments: ["Engineering", "Finance", "HR"],
            suggested_correction: "Amend Section 3.2 of the general HR Handbook to match the updated 30 calendar days approved by the board.",
            severity: "High",
            resolved: false
          }
        ]);
      }
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const triggerConflictAudit = async () => {
    setAuditing(true);
    try {
      const token = localStorage.getItem('pm_token');
      await fetch('http://localhost:8000/api/documents/upload?title=AuditTrigger&department=Operations&file_type=text', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: 'Trigger compliance verification loop.'
      });
      fetchData();
    } catch (err) {
      setTimeout(() => {
        fetchData();
      }, 1000);
    } finally {
      setAuditing(false);
    }
  };

  if (showGapsOnly) {
    return (
      <div className="space-y-4">
        {gaps.map((g) => (
          <div key={g.id} className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 shrink-0">
              <HelpCircle size={15} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-white truncate">{g.query_cluster}</span>
                <span className="text-[10px] text-yellow-400 font-bold bg-yellow-950/20 px-2 py-0.5 rounded border border-yellow-500/20">
                  {g.hit_count} Hits
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">{g.suggested_documentation}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* AUDIT TRIGGER ACTIONS */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-950/20 p-4 rounded-2xl border border-white/5">
        <div>
          <span className="font-extrabold text-sm text-white block">Corporate Policy Mismatch Engine</span>
          <span className="text-xs text-slate-400">Scans legal handbook sections and highlights alignment discrepancies.</span>
        </div>
        <button 
          onClick={triggerConflictAudit}
          disabled={auditing}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
        >
          <RefreshCw size={14} className={auditing ? 'animate-spin' : ''} />
          {auditing ? 'Auditing Handbooks...' : 'Scan Policies for Conflicts'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* POLICY CONFLICTS LIST */}
        <div className="lg:col-span-2 space-y-6">
          <h4 className="font-extrabold text-base text-white border-b border-white/5 pb-2">Active Policy Mismatches</h4>
          {conflicts.length === 0 ? (
            <div className="p-8 rounded-2xl glass text-center text-slate-400 text-xs">
              No compliance policy conflicts identified. Keep uploading files to scan.
            </div>
          ) : (
            conflicts.map((c) => (
              <div key={c.id} className="p-6 rounded-2xl glass border-red-500/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-red-400">
                    <AlertOctagon size={16} />
                    <span>Contradiction Level: {c.conflict_percentage}%</span>
                  </div>
                  <span className="text-[10px] bg-red-950 text-red-400 px-2 py-0.5 rounded-full font-bold uppercase">
                    Severity: {c.severity}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Handbook A Policy</span>
                    <p className="text-xs font-semibold text-slate-200">{c.policy_name_a}</p>
                  </div>
                  <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Handbook B Policy</span>
                    <p className="text-xs font-semibold text-slate-200">{c.policy_name_b}</p>
                  </div>
                </div>

                <div className="space-y-1.5 p-3 bg-black/40 rounded-xl border border-white/5">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Conflict Summary</span>
                  <p className="text-xs text-slate-300 leading-relaxed">{c.conflict_desc}</p>
                </div>

                <div className="space-y-1.5 p-3 bg-primary-950/10 rounded-xl border border-primary-500/20">
                  <span className="text-[9px] text-primary-300 font-bold uppercase tracking-wider block">Suggested AI Resolution</span>
                  <p className="text-xs text-primary-200 leading-relaxed font-sans">{c.suggested_correction}</p>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <div className="flex gap-2">
                    {c.affected_departments.map((d: string, di: number) => (
                      <span key={di} className="text-[9px] bg-white/5 px-2 py-0.5 rounded text-slate-400 font-semibold">{d}</span>
                    ))}
                  </div>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-all shadow-md">
                    <Check size={12} />
                    Resolve Policy
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* KNOWLEDGE GAPS LIST */}
        <div className="lg:col-span-1 space-y-6">
          <h4 className="font-extrabold text-base text-white border-b border-white/5 pb-2">Documentation Gaps</h4>
          <div className="space-y-4">
            {gaps.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No gaps logged.</p>
            ) : (
              gaps.map((g) => (
                <div key={g.id} className="p-4 rounded-xl glass space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-white truncate max-w-[70%]">{g.query_cluster}</span>
                    <span className="text-[10px] text-primary-400 bg-primary-950 px-2 py-0.5 rounded font-bold border border-primary-500/25">
                      {g.hit_count} Searches
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed font-sans">
                    {g.suggested_documentation}
                  </p>
                  <button className="w-full py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-bold transition-all border border-white/5">
                    Generate Outline
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
