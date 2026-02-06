import React, { useEffect, useState } from 'react';
import { LayoutDashboard, PenTool, Table, Image as ImageIcon, Globe, LogOut, UserCheck } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { AppTab } from './types';
import Visualizer from './components/Visualizer';
import MarketAnalysis from './components/MarketAnalysis';
import AIChat from './components/AIChat';
import AdminApprovals from './components/AdminApprovals';
import AiNotConfigured from './components/AiNotConfigured';
import { supabase } from './services/supabaseClient';
import { hasGeminiKey } from './services/geminiService';
import { ProjectProvider, useProjects } from './contexts/ProjectContext';
import DashboardRouter from './components/dashboards/DashboardRouter';
import InputsRouter from './components/inputs/InputsRouter';
import DetailRouter from './components/details/DetailRouter';
import ProjectSwitcher from './components/projects/ProjectSwitcher';
import NewProjectModal from './components/projects/NewProjectModal';

type DashboardAppProps = {
  session: Session;
};

const ADMIN_EMAIL = 'contact@sanluisai.com';

const DashboardShell: React.FC<DashboardAppProps> = ({ session }) => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.DASHBOARD);
  const [aiReady, setAiReady] = useState<boolean>(hasGeminiKey);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const isAdmin = (session.user.email ?? '').toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const { loading, error, projects, activeProject, results, setActiveProjectId, createNewProject, removeProject, updateInputs } =
    useProjects();

  // Check API Key Selection for Paid Features (Veo/High-Quality Image)
  useEffect(() => {
    const checkKey = async () => {
      if (hasGeminiKey) {
        setAiReady(true);
        return;
      }
      const aistudio = (window as any).aistudio;
      if (aistudio) {
        const hasKey = await aistudio.hasSelectedApiKey();
        setAiReady(Boolean(hasKey));
      }
    };
    checkKey();
  }, []);

  const handleAiConfigured = () => setAiReady(true);

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  const navItems = [
    { id: AppTab.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
    { id: AppTab.INPUTS, label: 'Edit Inputs', icon: PenTool },
    { id: AppTab.SPREADSHEET, label: 'Detail', icon: Table },
    { id: AppTab.VISUALIZER, label: 'Visualizer (AI)', icon: ImageIcon },
    { id: AppTab.MARKET, label: 'Market Data (AI)', icon: Globe },
    ...(isAdmin ? [{ id: AppTab.ADMIN, label: 'Approvals', icon: UserCheck }] : []),
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex-shrink-0">
        <div className="p-6 border-b border-slate-800">
          <img src="/garza-logo.png" alt="Garza International Properties" className="h-7 w-auto mb-3" />
          <h1 className="text-xl font-bold tracking-tight">Garza International</h1>
          <p className="text-xs text-slate-400 mt-1">Real Estate Intelligence</p>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === item.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 mt-auto">
          <div className="text-[11px] text-slate-400 mb-2 truncate" title={session.user.email ?? undefined}>
            Signed in as <span className="text-slate-200">{session.user.email}</span>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-xs py-2 rounded text-white border border-slate-700"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-y-auto">
        <header className="bg-white border-b border-slate-200 px-8 py-5 flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="hidden sm:inline-flex items-center justify-center rounded-lg bg-slate-900 px-3 py-2">
              <img src="/garza-logo.png" alt="Garza International Properties" className="h-5 w-auto" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">{navItems.find((n) => n.id === activeTab)?.label}</h2>
          </div>
          <ProjectSwitcher
            projects={projects}
            activeProject={activeProject}
            onSelect={setActiveProjectId}
            onNew={() => setNewProjectOpen(true)}
            onDelete={removeProject}
          />
        </header>

        <div className="p-8 pb-32">
          {loading && (
            <div className="text-slate-600">Loading projects…</div>
          )}
          {!loading && error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {!loading && !activeProject && (
            <div className="max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
              <h3 className="text-xl font-bold text-slate-900">Create Your First Project</h3>
              <p className="mt-2 text-sm text-slate-600">
                Choose a strategy to unlock the correct inputs, math, and dashboard.
              </p>
              <button
                type="button"
                onClick={() => setNewProjectOpen(true)}
                className="mt-6 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 text-sm"
              >
                New Project
              </button>
            </div>
          )}

          {!loading && activeProject && results && (
            <>
              {activeTab === AppTab.DASHBOARD && <DashboardRouter results={results} />}
              {activeTab === AppTab.INPUTS && (
                <InputsRouter
                  strategy={activeProject.strategy}
                  inputs={activeProject.inputs}
                  onChange={(next) => updateInputs(next)}
                />
              )}
              {activeTab === AppTab.SPREADSHEET && <DetailRouter results={results} />}
            </>
          )}

          {activeTab === AppTab.VISUALIZER &&
            (aiReady ? (
              <Visualizer />
            ) : (
              <AiNotConfigured
                title="AI Visualizer not configured"
                onConfigured={handleAiConfigured}
                description="To use the AI Visualizer, the admin must set GEMINI_API_KEY in Vercel and redeploy. If you're running inside AI Studio, you can select a paid project key."
              />
            ))}
          {activeTab === AppTab.MARKET &&
            (aiReady ? (
              <MarketAnalysis />
            ) : (
              <AiNotConfigured
                title="Market Intelligence not configured"
                onConfigured={handleAiConfigured}
                description="To use Market Intelligence (web search / maps / trends), the admin must set GEMINI_API_KEY in Vercel and redeploy. If you're running inside AI Studio, you can select a paid project key."
              />
            ))}
          {activeTab === AppTab.ADMIN && isAdmin && <AdminApprovals adminEmail={ADMIN_EMAIL} />}
        </div>
      </main>

      <AIChat />

      <NewProjectModal
        open={newProjectOpen}
        onClose={() => setNewProjectOpen(false)}
        onCreate={async ({ name, strategy }) => {
          await createNewProject({ session, name, strategy });
          setActiveTab(AppTab.INPUTS);
        }}
      />
    </div>
  );
};

const DashboardApp: React.FC<DashboardAppProps> = ({ session }) => {
  return (
    <ProjectProvider session={session}>
      <DashboardShell session={session} />
    </ProjectProvider>
  );
};

export default DashboardApp;
