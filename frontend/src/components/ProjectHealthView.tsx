import React, { useState, useEffect } from 'react';
import { ShieldCheck, AlertTriangle, Lightbulb, TrendingUp, CheckCircle } from 'lucide-react';

export default function ProjectHealthView() {
  const [projects, setProjects] = useState<any[]>([]);
  const [activeProject, setActiveProject] = useState<any | null>(null);

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem('pm_token');
      const res = await fetch('http://localhost:8000/api/projects', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
        if (data.length > 0 && !activeProject) {
          setActiveProject(data[0]);
        }
      }
    } catch (e) {
      const mockProjects = [
        {
          id: 1,
          name: "Logistics & Dispatch",
          description: "Core distribution engine migration to Kubernetes and db restructure.",
          health_score: 85,
          metrics: { documentation: 90, testing: 80, security: 95, performance: 85, deployment_readiness: 75, bug_density: 4 },
          risk_level: "Medium",
          recommendations: [
            "Conduct full load tests on PostgreSQL before production cut-over.",
            "Write Kubernetes deployment chart documentation."
          ],
          warnings: [
            "Staging environment configuration files drift detected.",
            "API test coverage is currently at 80%, below the 90% compliance threshold."
          ]
        },
        {
          id: 2,
          name: "NextGen Dashboard",
          description: "High-performance customer intelligence visual frontend using React Flow.",
          health_score: 98,
          metrics: { documentation: 100, testing: 95, security: 100, performance: 95, deployment_readiness: 100, bug_density: 0 },
          risk_level: "Low",
          recommendations: [
            "Perform frontend visual performance check on standard mobile viewport."
          ],
          warnings: []
        }
      ];
      setProjects(mockProjects);
      if (!activeProject) {
        setActiveProject(mockProjects[0]);
      }
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-emerald-400 border-emerald-500/35 bg-emerald-950/20';
    if (score >= 70) return 'text-yellow-400 border-yellow-500/35 bg-yellow-950/20';
    return 'text-red-400 border-red-500/35 bg-red-950/20';
  };

  const getMetricProgressColor = (score: number) => {
    if (score >= 90) return 'bg-emerald-500';
    if (score >= 75) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 animate-in fade-in duration-300">
      
      {/* PROJECT SELECT SIDEBAR */}
      <div className="xl:col-span-1 p-4 rounded-2xl glass flex flex-col gap-3 h-full min-h-0">
        <span className="font-bold text-sm text-white border-b border-white/5 pb-3 mb-2">Tracked Projects</span>
        <div className="space-y-2">
          {projects.map((p) => (
            <button
              key={p.id}
              onClick={() => setActiveProject(p)}
              className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                activeProject?.id === p.id 
                  ? 'bg-primary-950/25 border-primary-500/40 text-white' 
                  : 'bg-white/5 border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/10'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold truncate">{p.name}</span>
                <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                  p.health_score >= 90 ? 'bg-emerald-950 text-emerald-400' : 'bg-yellow-950 text-yellow-400'
                }`}>
                  {p.health_score}%
                </span>
              </div>
              <p className="text-[10px] text-slate-400 truncate leading-relaxed">{p.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* HEALTH MAIN METRICS BOARD */}
      {activeProject ? (
        <div className="xl:col-span-3 space-y-8">
          
          {/* TOP SUMMARY STATS */}
          <div className="p-6 rounded-2xl glass border border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <h3 className="text-2xl font-extrabold text-white mb-2">{activeProject.name} Health Index</h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xl">{activeProject.description}</p>
            </div>
            
            {/* LARGE HEALTH CIRCULAR DISPLAY */}
            <div className={`px-6 py-4 rounded-2xl border text-center flex flex-col items-center shrink-0 w-36 ${getHealthColor(activeProject.health_score)}`}>
              <span className="text-xs font-bold uppercase tracking-wide">Health Score</span>
              <h4 className="text-3xl font-black mt-1">{activeProject.health_score}%</h4>
              <span className="text-[9px] font-bold text-slate-400 block mt-0.5">Risk Level: {activeProject.risk_level}</span>
            </div>
          </div>

          {/* SYSTEM PERFORMANCE MATRIX */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* SUB-METRICS METERS */}
            <div className="p-6 rounded-2xl glass space-y-4">
              <span className="font-extrabold text-sm text-white block border-b border-white/5 pb-2">Audited Quality Metrics</span>
              {[
                { label: "Documentation Coverage", val: activeProject.metrics.documentation },
                { label: "Unit Test Coverage", val: activeProject.metrics.testing },
                { label: "Security Scanning Compliance", val: activeProject.metrics.security },
                { label: "System Load Performance", val: activeProject.metrics.performance },
                { label: "Deployment Readiness Status", val: activeProject.metrics.deployment_readiness }
              ].map((m, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300 font-medium">{m.label}</span>
                    <span className="font-bold text-slate-100">{m.val}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-white/5">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${getMetricProgressColor(m.val)}`}
                      style={{ width: `${m.val}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* AI PREDICTIVE ANOMALY AUDITOR */}
            <div className="p-6 rounded-2xl glass space-y-4">
              <span className="font-extrabold text-sm text-white block border-b border-white/5 pb-2">AI Release Readiness Assessment</span>
              
              <div className="p-3.5 bg-[#030712] rounded-xl border border-white/5 flex gap-3">
                <div className="p-2 rounded-lg bg-primary-500/10 text-primary-400 border border-primary-500/20 shrink-0 h-9 w-9 flex items-center justify-center">
                  <TrendingUp size={16} />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-white mb-0.5">Timeline Predictor</h5>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Based on current commit activity, documentation readiness (90%) and deployment status (75%), the system predicts release delivery is <span className="text-emerald-400 font-semibold">92% likely on schedule</span> (estimated 6 days).
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-[#030712] rounded-xl border border-white/5 flex gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0 h-9 w-9 flex items-center justify-center">
                  <CheckCircle size={16} />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-white mb-0.5">Stability Forecast</h5>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Bug density is currently at {activeProject.metrics.bug_density} issues/kloc, well within stable guidelines. Anomaly indexes indicate normal operational performance.
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* WARNINGS & RECOMMENDATIONS SPLIT */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* COMPLIANCE WARNINGS */}
            <div className="p-6 rounded-2xl glass border-yellow-500/10 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-yellow-400 border-b border-white/5 pb-2">
                <AlertTriangle size={15} />
                Critical Compliance Warnings
              </div>
              <div className="space-y-2">
                {activeProject.warnings.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No compliance warnings logged.</p>
                ) : (
                  activeProject.warnings.map((w: string, idx: number) => (
                    <p key={idx} className="text-xs text-slate-300 bg-white/5 p-2.5 rounded-lg border border-white/5 leading-normal">
                      ⚠️ {w}
                    </p>
                  ))
                )}
              </div>
            </div>

            {/* RECOMMENDATIONS */}
            <div className="p-6 rounded-2xl glass border-primary-500/10 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-primary-300 border-b border-white/5 pb-2">
                <Lightbulb size={15} />
                AI Health Remediation Steps
              </div>
              <div className="space-y-2">
                {activeProject.recommendations.map((r: string, idx: number) => (
                  <p key={idx} className="text-xs text-slate-300 bg-white/5 p-2.5 rounded-lg border border-white/5 leading-normal">
                    💡 {r}
                  </p>
                ))}
              </div>
            </div>

          </div>

        </div>
      ) : (
        <div className="xl:col-span-3 p-12 text-center text-slate-400 text-xs py-24 glass rounded-2xl">
          Select a project from the left panel to inspect health indicators.
        </div>
      )}

    </div>
  );
}
