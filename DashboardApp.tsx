import React, { Suspense, useEffect, useRef, useState } from 'react';
import { ChevronDown, Download, FileText, LayoutDashboard, PenTool, Table, Image as ImageIcon, Globe, LogOut, UserCheck, FlaskConical } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { AppTab } from './types';
import AiNotConfigured from './components/AiNotConfigured';
import { supabase } from './services/supabaseClient';
import { hasGeminiKey } from './services/geminiKey';
import { downloadProjectReportCsv, printProjectReport } from './services/reportExport';
import { ProjectProvider, useProjects } from './contexts/ProjectContext';
import DashboardRouter from './components/dashboards/DashboardRouter';
import InputsRouter from './components/inputs/InputsRouter';
import ProjectSwitcher from './components/projects/ProjectSwitcher';
import NewProjectModal from './components/projects/NewProjectModal';
import ValidationBanner from './components/ValidationBanner';
import { appEnv, appVersion } from './services/appMeta';
import type { InvestmentStrategy } from './domain/strategies/types';

const Visualizer = React.lazy(() => import('./components/Visualizer'));
const MarketAnalysis = React.lazy(() => import('./components/MarketAnalysis'));
const AIChat = React.lazy(() => import('./components/AIChat'));
const AdminApprovals = React.lazy(() => import('./components/AdminApprovals'));
const DetailRouter = React.lazy(() => import('./components/details/DetailRouter'));
const CalculatorQA = React.lazy(() => import('./components/CalculatorQA'));

type DashboardAppProps = {
  session: Session;
  access: { allowedStrategies: InvestmentStrategy[]; trialEndsAt: string | null };
};

const ADMIN_EMAIL = 'contact@sanluisai.com';

const DashboardShell: React.FC<DashboardAppProps> = ({ session, access }) => {
  const [aiReady, setAiReady] = useState<boolean>(hasGeminiKey);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState<number | null>(null);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);
  const isAdmin = (session.user.email ?? '').toLowerCase() === ADMIN_EMAIL.toLowerCase();
  const enableVisualizer = (import.meta as any).env?.VITE_ENABLE_VISUALIZER === 'true';
  const versionLabel = `v${appVersion()}`;
  const envLabel = appEnv();

  const { loading, error, projects, activeProject, results, setActiveProjectId, createNewProject, removeProject, updateInputs } =
    useProjects();

  const isValidTab = (tab: string): tab is AppTab =>
    tab === AppTab.DASHBOARD ||
    tab === AppTab.INPUTS ||
    tab === AppTab.SPREADSHEET ||
    tab === AppTab.MARKET ||
    tab === AppTab.VISUALIZER ||
    tab === AppTab.ADMIN ||
    tab === AppTab.QA;

  const initialTab = (() => {
    try {
      const t = new URLSearchParams(window.location.search).get('tab');
      if (!t || !isValidTab(t)) return AppTab.DASHBOARD;
      if (t === AppTab.VISUALIZER && !enableVisualizer) return AppTab.DASHBOARD;
      if (t === AppTab.ADMIN && !isAdmin) return AppTab.DASHBOARD;
      if (t === AppTab.QA && !isAdmin) return AppTab.DASHBOARD;
      return t;
    } catch {
      return AppTab.DASHBOARD;
    }
  })();

  const [activeTab, setActiveTab] = useState<AppTab>(initialTab);

  const syncUrl = (args: { tab?: AppTab; projectId?: string | null }, mode: 'replace' | 'push' = 'replace') => {
    try {
      const url = new URL(window.location.href);
      const tab = args.tab ?? activeTab;
      const pid = args.projectId !== undefined ? args.projectId : activeProject?.id ?? null;
      url.searchParams.set('tab', tab);
      if (pid) url.searchParams.set('project', pid);
      else url.searchParams.delete('project');
      const next = url.pathname + url.search + url.hash;
      if (mode === 'push') window.history.pushState({}, '', next);
      else window.history.replaceState({}, '', next);
    } catch {
      // ignore
    }
  };

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

  // Admin-only: show pending approval count as a quick operational cue.
  useEffect(() => {
    if (!supabase) return;
    if (!isAdmin) return;
    let mounted = true;

    const refresh = async () => {
      try {
        const { count, error } = await supabase
          .from('approved_emails')
          .select('email', { count: 'exact', head: true })
          .eq('approved', false);
        if (error) throw error;
        if (!mounted) return;
        setPendingApprovals(typeof count === 'number' ? count : 0);
      } catch {
        if (!mounted) return;
        setPendingApprovals(null);
      }
    };

    refresh();
    const t = setInterval(refresh, 45_000);
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      mounted = false;
      clearInterval(t);
      window.removeEventListener('focus', onFocus);
    };
  }, [isAdmin]);

  const navItems = [
    { id: AppTab.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
    { id: AppTab.INPUTS, label: 'Edit Inputs', icon: PenTool },
    { id: AppTab.SPREADSHEET, label: 'Detail', icon: Table },
    ...(enableVisualizer ? [{ id: AppTab.VISUALIZER, label: 'Visualizer (AI)', icon: ImageIcon }] : []),
    { id: AppTab.MARKET, label: 'Market Data (AI)', icon: Globe },
    ...(isAdmin
      ? [
          { id: AppTab.QA, label: 'Calculator QA', icon: FlaskConical },
          {
            id: AppTab.ADMIN,
            label: pendingApprovals === null ? 'Approvals' : pendingApprovals > 0 ? `Approvals (${pendingApprovals})` : 'Approvals',
            icon: UserCheck,
          },
        ]
      : []),
  ];

  useEffect(() => {
    if (!enableVisualizer && activeTab === AppTab.VISUALIZER) setActiveTab(AppTab.DASHBOARD);
    if (!isAdmin && activeTab === AppTab.ADMIN) setActiveTab(AppTab.DASHBOARD);
    if (!isAdmin && activeTab === AppTab.QA) setActiveTab(AppTab.DASHBOARD);
  }, [enableVisualizer, isAdmin, activeTab]);

  useEffect(() => {
    if (!exportMenuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!exportMenuRef.current || !target) return;
      if (!exportMenuRef.current.contains(target)) setExportMenuOpen(false);
    };

    window.addEventListener('mousedown', onPointerDown);
    return () => window.removeEventListener('mousedown', onPointerDown);
  }, [exportMenuOpen]);

  // Back/forward navigation should restore tab + project selection.
  useEffect(() => {
    const onPop = () => {
      try {
        const sp = new URLSearchParams(window.location.search);
        const t = sp.get('tab');
        const pid = sp.get('project');

        if (t && isValidTab(t)) {
          if (t === AppTab.VISUALIZER && !enableVisualizer) setActiveTab(AppTab.DASHBOARD);
          else if (t === AppTab.ADMIN && !isAdmin) setActiveTab(AppTab.DASHBOARD);
          else if (t === AppTab.QA && !isAdmin) setActiveTab(AppTab.DASHBOARD);
          else setActiveTab(t);
        }
        if (pid) setActiveProjectId(pid);
      } catch {
        // ignore
      }
    };

    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [enableVisualizer, isAdmin, setActiveProjectId]);

  // Keep URL in sync (bookmark/share) without spamming history.
  useEffect(() => {
    syncUrl({ tab: activeTab, projectId: activeProject?.id ?? null }, 'replace');
  }, [activeTab, activeProject?.id]);

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-[280px] gi-sidebar text-white flex-shrink-0 gi-print-hide">
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
              onClick={() => {
                setActiveTab(item.id);
                syncUrl({ tab: item.id }, 'push');
              }}
              className={`gi-nav-item ${activeTab === item.id ? 'gi-nav-item--active' : ''}`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 mt-auto">
          <div className="text-[11px] gi-muted mb-2 flex items-center justify-between gap-2">
            <span className="truncate" title={`Environment: ${envLabel}`}>Env: <span className="font-mono text-white/80">{envLabel}</span></span>
            <span className="font-mono text-white/80" title="App version">{versionLabel}</span>
          </div>
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
        <header className="gi-topbar px-6 md:px-8 py-5 flex justify-between items-center sticky top-0 z-10 gi-print-hide">
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
          <div className="flex items-center gap-3">
            <ProjectSwitcher
              projects={projects}
              activeProject={activeProject}
              onSelect={(id) => {
                setActiveProjectId(id);
                syncUrl({ projectId: id }, 'push');
              }}
              onNew={() => setNewProjectOpen(true)}
              onDelete={removeProject}
            />
            <div className="hidden md:flex items-center gap-2">
              <div className="relative" ref={exportMenuRef}>
                <button
                  type="button"
                  disabled={!activeProject || !results || exporting}
                  onClick={() => setExportMenuOpen((v) => !v)}
                  className="gi-btn gi-btn-secondary px-3 py-2 text-sm font-semibold disabled:opacity-60 inline-flex items-center gap-2"
                  title="Export report as CSV or PDF"
                >
                  <Download size={16} />
                  {exporting ? 'Exporting…' : 'Export Report'}
                  <ChevronDown size={14} className="opacity-75" />
                </button>

                {exportMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 gi-popover overflow-hidden z-30">
                    <button
                      type="button"
                      disabled={!activeProject || !results || exporting}
                      onClick={() => {
                        if (!activeProject || !results || exporting) return;
                        setExportMenuOpen(false);
                        setExporting(true);
                        try {
                          downloadProjectReportCsv({ project: activeProject, results });
                        } finally {
                          setExporting(false);
                        }
                      }}
                      className="w-full text-left px-3 py-2.5 text-sm hover:bg-white/10 disabled:opacity-60"
                    >
                      Download CSV
                    </button>
                    <button
                      type="button"
                      disabled={!activeProject || !results}
                      onClick={() => {
                        if (!activeProject || !results) return;
                        setExportMenuOpen(false);
                        printProjectReport({ project: activeProject, results });
                      }}
                      className="w-full text-left px-3 py-2.5 text-sm hover:bg-white/10 disabled:opacity-60 border-t border-white/10"
                    >
                      Download PDF (Print)
                    </button>
                  </div>
                )}
              </div>
              <button
                type="button"
                disabled={!activeProject || !results}
                onClick={() => {
                  if (!activeProject || !results) return;
                  printProjectReport({ project: activeProject, results });
                }}
                className="gi-btn gi-btn-ghost px-3 py-2 text-sm font-semibold disabled:opacity-60"
                title="Print current view (or Save as PDF)"
              >
                <span className="inline-flex items-center gap-2">
                  <FileText size={16} />
                  Print
                </span>
              </button>
            </div>
          </div>
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
              <ValidationBanner project={activeProject} results={results} />
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

          {activeTab === AppTab.QA && isAdmin && (
            <Suspense fallback={<div className="gi-muted">Loading QA…</div>}>
              <CalculatorQA />
            </Suspense>
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
        allowedStrategies={access.allowedStrategies}
        onCreate={async ({ name, strategy }) => {
          await createNewProject({ session, name, strategy });
          setActiveTab(AppTab.INPUTS);
        }}
      />
    </div>
  );
};

const DashboardApp: React.FC<DashboardAppProps> = ({ session, access }) => {
  return (
    <ProjectProvider session={session}>
      <DashboardShell session={session} access={access} />
    </ProjectProvider>
  );
};

export default DashboardApp;
