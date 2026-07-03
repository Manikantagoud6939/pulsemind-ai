import React, { useState, useEffect } from 'react';
import { Search, Star, Briefcase, Calendar, Award } from 'lucide-react';

export default function ExpertiseFinderView() {
  const [skillQuery, setSkillQuery] = useState<string>('');
  const [experts, setExperts] = useState<any[]>([]);
  const [searching, setSearching] = useState<boolean>(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skillQuery.trim()) return;

    setSearching(true);
    try {
      const token = localStorage.getItem('pm_token');
      const res = await fetch(`http://localhost:8000/api/expertise/search?skill=${encodeURIComponent(skillQuery)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setExperts(await res.json());
      }
    } catch (err) {
      // Simulate expert search offline
      const query = skillQuery.toLowerCase();
      let mockResults = [];
      if (query.includes('react') || query.includes('typescript') || query.includes('frontend')) {
        mockResults = [
          { id: 1, full_name: "Alice Chen", role: "Super Admin", department: "Engineering", avatar_url: null, skills: ["React", "FastAPI", "PostgreSQL", "Docker", "Kubernetes"], rating: 5, availability: "Available", experience: "6+ Years", projects: ["NextGen Dashboard", "Logistics & Dispatch"] },
          { id: 5, full_name: "Emily Watson", role: "Employee", department: "Engineering", avatar_url: null, skills: ["React", "Tailwind CSS", "Framer Motion", "UI Design"], rating: 4, availability: "Focus Mode", experience: "3 Years", projects: ["NextGen Dashboard"] }
        ];
      } else if (query.includes('kubernetes') || query.includes('docker') || query.includes('devops') || query.includes('k8s')) {
        mockResults = [
          { id: 4, full_name: "David Miller", role: "Employee", department: "Engineering", avatar_url: null, skills: ["Kubernetes", "Docker", "Go", "Python", "gRPC"], rating: 5, availability: "Available", experience: "5+ Years", projects: ["Logistics & Dispatch"] },
          { id: 1, full_name: "Alice Chen", role: "Super Admin", department: "Engineering", avatar_url: null, skills: ["React", "FastAPI", "Docker", "Kubernetes"], rating: 4, availability: "Available", experience: "6+ Years", projects: ["NextGen Dashboard", "Logistics & Dispatch"] }
        ];
      } else {
        mockResults = [
          { id: 4, full_name: "David Miller", role: "Employee", department: "Engineering", avatar_url: null, skills: ["Kubernetes", "Docker", "Go", "Python", "gRPC"], rating: 4, availability: "Available", experience: "5+ Years", projects: ["Logistics & Dispatch"] }
        ];
      }
      setExperts(mockResults);
    } finally {
      setSearching(false);
    }
  };

  // Prepopulate standard search list
  useEffect(() => {
    setSkillQuery('React');
    const e = { preventDefault: () => {} } as any;
    handleSearch(e);
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* SEARCH CARD INPUT */}
      <div className="p-6 rounded-2xl glass space-y-4">
        <div>
          <span className="font-extrabold text-sm text-white block">Skills Expertise Finder</span>
          <span className="text-xs text-slate-400">Search organizational skills (e.g. "Kubernetes", "React") to find available staff.</span>
        </div>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input 
            type="text" 
            placeholder="Search skills e.g., React, Kubernetes, Project Management..."
            value={skillQuery}
            onChange={e => setSkillQuery(e.target.value)}
            className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 transition-all"
          />
          <button 
            type="submit"
            className="flex items-center gap-2 px-5 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg hover:shadow-primary-500/20"
          >
            <Search size={15} />
            Search
          </button>
        </form>
      </div>

      {/* RESULTS LIST */}
      <div className="space-y-4">
        <h4 className="font-extrabold text-base text-white border-b border-white/5 pb-2">Matching Experts</h4>
        
        {searching ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            Querying company brain registries...
          </div>
        ) : experts.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs glass rounded-2xl">
            No expert matching your skill query was found.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {experts.map((exp) => (
              <div key={exp.id} className="p-6 rounded-2xl glass border border-white/5 flex flex-col justify-between gap-6 hover:border-white/15 transition-all">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex gap-3">
                    <div className="w-11 h-11 rounded-full bg-primary-500/20 text-primary-400 border border-primary-500/20 flex items-center justify-center font-extrabold text-sm uppercase shrink-0">
                      {exp.full_name.split(' ').map((n:any)=>n[0]).join('')}
                    </div>
                    <div>
                      <h5 className="text-sm font-bold text-white leading-normal">{exp.full_name}</h5>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{exp.role} — {exp.department}</span>
                    </div>
                  </div>

                  {/* AVAILABILITY RATING */}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    exp.availability === 'Available' ? 'bg-emerald-950 text-emerald-400' : 'bg-yellow-950 text-yellow-400'
                  }`}>
                    {exp.availability}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4 border-y border-white/5 py-4">
                  <div className="text-center">
                    <span className="text-[9px] text-slate-500 block font-bold uppercase mb-0.5">Rating</span>
                    <div className="flex justify-center items-center gap-0.5 text-xs text-yellow-400 font-bold">
                      <Star size={11} fill="currentColor" />
                      {exp.rating}/5
                    </div>
                  </div>
                  <div className="text-center border-x border-white/5">
                    <span className="text-[9px] text-slate-500 block font-bold uppercase mb-0.5">Experience</span>
                    <span className="text-xs text-slate-300 font-semibold">{exp.experience}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-[9px] text-slate-500 block font-bold uppercase mb-0.5">Projects</span>
                    <span className="text-[10px] text-slate-300 font-semibold truncate block">{exp.projects.length} Active</span>
                  </div>
                </div>

                <div>
                  <span className="text-[9px] text-slate-500 block font-bold uppercase mb-2">Technical Skills</span>
                  <div className="flex flex-wrap gap-1.5">
                    {exp.skills.map((s: string, idx: number) => (
                      <span key={idx} className="text-[10px] bg-white/5 border border-white/5 px-2.5 py-1 rounded text-slate-300 font-medium">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <span className="text-[9px] text-slate-500 block font-bold uppercase mb-2">Assigned Projects</span>
                  <div className="flex gap-2">
                    {exp.projects.map((p: string, idx: number) => (
                      <span key={idx} className="text-[10px] bg-primary-950/25 border border-primary-500/20 px-2 py-0.5 rounded text-primary-300 font-semibold">
                        🚀 {p}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
