import React, { Suspense, useEffect, useState } from 'react';
import { LayoutDashboard, PenTool, Table, Image as ImageIcon, Globe, LogOut, UserCheck } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { AppTab } from './types';
import AiNotConfigured from './components/AiNotConfigured';
import { supabase } from './services/supabaseClient';
import { hasGeminiKey } from './services/geminiKey';
import { ProjectProvider, useProjects } from './contexts/ProjectContext';
import DashboardRouter from './components/dashboards/DashboardRouter';
import InputsRouter from './components/inputs/InputsRouter';
import ProjectSwitcher from './components/projects/ProjectSwitcher';
import NewProjectModal from './components/projects/NewProjectModal';

const Visualizer = React.lazy(() => import('./components/Visualizer'));
const MarketAnalysis = React.lazy(() => import('./components/MarketAnalysis'));
const AIChat = React.lazy(() => import('./components/AIChat'));
const AdminApprovals = React.lazy(() => import('./components/AdminApprovals'));
const DetailRouter = React.lazy(() => import('./components/details/DetailRouter'));

type DashboardAppProps = {
  session: Session;
};

const ADMIN_EMAIL = 'contact@sanluisai.com';

const DashboardShell: React.FC<DashboardAppProps> = ({ session }) => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.DASHBOARD);
  const [aiReady, setAiReady] = useState<boolean>(hasGeminiKey);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const isAdmin = (session.user.email ?? '').toLowerCase() === ADMIN_EMAIL.toLowerCase();
  const enableVisualizer = (import.meta as any).env?.VITE_ENABLE_VISUALIZER === 'true';

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
    ...(enableVisualizer ? [{ id: AppTab.VISUALIZER, label: 'Visualizer (AI)', icon: ImageIcon }] : []),
    { id: AppTab.MARKET, label: 'Market Data (AI)', icon: Globe },
    ...(isAdmin ? [{ id: AppTab.ADMIN, label: 'Approvals', icon: UserCheck }] : []),
  ];

  useEffect(() => {
    if (!enableVisualizer && activeTab === AppTab.VISUALIZER) setActiveTab(AppTab.DASHBOARD);
    if (!isAdmin && activeTab === AppTab.ADMIN) setActiveTab(AppTab.DASHBOARD);
  }, [enableVisualizer, isAdmin, activeTab]);

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-[280px] gi-sidebar text-white flex-shrink-0">
        <div className="p-6 border-b border-white/10">
          <img
            src="/garza-logo.png"
            alt="Garza International Properties"
            width={2500}
            height={1000}
            className="h-7 w-auto mb-3"
          />
          <h1 className="text-xl font-bold tracking-tight gi-serif">Garza International</h1>
          <p className="text-xs gi-muted mt-1">Real Estate Intelligence</p>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`gi-nav-item ${activeTab === item.id ? 'gi-nav-item--active' : ''}`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 mt-auto">
          <div className="text-[11px] gi-muted mb-2 truncate" title={session.user.email ?? undefined}>
            Signed in as <span className="text-white/90">{session.user.email}</span>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 gi-btn gi-btn-secondary text-xs py-2.5"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-y-auto">
        <header className="gi-topbar px-6 md:px-8 py-5 flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="hidden sm:inline-flex items-center justify-center rounded-xl bg-white/5 border border-white/10 px-3 py-2">
              <img
                src="/garza-logo.png"
                alt="Garza International Properties"
                width={2500}
                height={1000}
                className="h-5 w-auto"
              />
            </div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold gi-serif">{navItems.find((n) => n.id === activeTab)?.label}</h2>
              {activeProject && (
                <span className="gi-pill text-xs">
                  {activeProject.strategy === 'DEVELOPER'
                    ? 'Developer'
                    : activeProject.strategy === 'LANDLORD'
                    ? 'Landlord'
                    : 'Flipper'}
                </span>
              )}
            </div>
          </div>
          <ProjectSwitcher
            projects={projects}
            activeProject={activeProject}
            onSelect={setActiveProjectId}
            onNew={() => setNewProjectOpen(true)}
            onDelete={removeProject}
          />
        </header>

        <div className="p-6 md:p-8 pb-32">
          {loading && (
            <div className="gi-muted">Loading projects…</div>
          )}
          {!loading && error && (
            <div className="gi-card px-4 py-3 text-sm border border-red-500/30 text-red-100">
              {error}
            </div>
          )}

          {!loading && !activeProject && (
            <div className="max-w-2xl gi-card p-8">
              <h3 className="text-xl font-bold gi-serif">Create Your First Project</h3>
              <p className="mt-2 text-sm gi-muted">
                Choose a strategy to unlock the correct inputs, math, and dashboard.
              </p>
              <button
                type="button"
                onClick={() => setNewProjectOpen(true)}
                className="mt-6 gi-btn gi-btn-primary px-4 py-2.5 text-sm font-semibold"
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
              {activeTab === AppTab.SPREADSHEET && (
                <Suspense fallback={<div className="gi-muted">Loading detail…</div>}>
                  <DetailRouter results={results} />
                </Suspense>
              )}
            </>
          )}

          {enableVisualizer &&
            activeTab === AppTab.VISUALIZER &&
            (aiReady ? (
              <Suspense fallback={<div className="gi-muted">Loading visualizer…</div>}>
                <Visualizer />
              </Suspense>
            ) : (
              <AiNotConfigured
                title="AI Visualizer not configured"
                onConfigured={handleAiConfigured}
                description="To use the AI Visualizer, the admin must set GEMINI_API_KEY in Vercel and redeploy. If you're running inside AI Studio, you can select a paid project key."
              />
            ))}
          {activeTab === AppTab.MARKET &&
            (aiReady ? (
              <Suspense fallback={<div className="gi-muted">Loading market tools…</div>}>
                <MarketAnalysis />
              </Suspense>
            ) : (
              <AiNotConfigured
                title="Market Intelligence not configured"
                onConfigured={handleAiConfigured}
                description="To use Market Intelligence (web search / maps / trends), the admin must set GEMINI_API_KEY in Vercel and redeploy. If you're running inside AI Studio, you can select a paid project key."
              />
            ))}
          {activeTab === AppTab.ADMIN && isAdmin && (
            <Suspense fallback={<div className="gi-muted">Loading approvals…</div>}>
              <AdminApprovals adminEmail={ADMIN_EMAIL} />
            </Suspense>
          )}
        </div>
      </main>

      <Suspense fallback={null}>
        <AIChat />
      </Suspense>

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
