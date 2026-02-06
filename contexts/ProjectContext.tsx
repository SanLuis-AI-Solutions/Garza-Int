import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { DeveloperInputs, FlipperInputs, InvestmentStrategy, LandlordInputs, Project, StrategyInputs } from '../domain/strategies/types';
import { calculateProject } from '../domain/strategies';
import { createProject, deleteProject, listProjects, updateProject } from '../services/projectsService';
import { defaultDeveloperInputs, defaultFlipperInputs, defaultLandlordInputs } from '../domain/strategies/defaults';

type ProjectContextValue = {
  loading: boolean;
  error: string | null;
  projects: Project[];
  activeProject: Project | null;
  results: ReturnType<typeof calculateProject> | null;

  refresh: () => Promise<void>;
  setActiveProjectId: (id: string) => void;

  createNewProject: (args: { session: Session; name: string; strategy: InvestmentStrategy }) => Promise<Project>;
  renameProject: (id: string, name: string) => Promise<void>;
  removeProject: (id: string) => Promise<void>;

  updateInputs: (inputs: StrategyInputs) => void;
};

const STORAGE_KEY = 'garza_active_project_id_v1';

const ProjectContext = createContext<ProjectContextValue | null>(null);

const pickDefaults = (strategy: InvestmentStrategy): StrategyInputs => {
  switch (strategy) {
    case 'DEVELOPER':
      return defaultDeveloperInputs();
    case 'LANDLORD':
      return defaultLandlordInputs();
    case 'FLIPPER':
      return defaultFlipperInputs();
  }
};

const normalizeInputs = (strategy: InvestmentStrategy, inputs: StrategyInputs): StrategyInputs => {
  // Merge defaults into stored inputs so new fields can be introduced safely without breaking existing projects.
  switch (strategy) {
    case 'DEVELOPER': {
      const d = defaultDeveloperInputs();
      const s = inputs as any as Partial<DeveloperInputs>;
      return {
        ...d,
        ...s,
        custom: {
          ...d.custom,
          ...(s.custom ?? {}),
          acquisition_soft: s.custom?.acquisition_soft ?? d.custom?.acquisition_soft,
          hard_costs: s.custom?.hard_costs ?? d.custom?.hard_costs,
          financing: s.custom?.financing ?? d.custom?.financing,
          carrying: s.custom?.carrying ?? d.custom?.carrying,
          exit: s.custom?.exit ?? d.custom?.exit,
        },
      };
    }
    case 'LANDLORD': {
      const d = defaultLandlordInputs();
      const s = inputs as any as Partial<LandlordInputs>;
      return {
        ...d,
        ...s,
        custom: {
          ...d.custom,
          ...(s.custom ?? {}),
          acquisition: s.custom?.acquisition ?? d.custom?.acquisition,
          opex: s.custom?.opex ?? d.custom?.opex,
        },
      };
    }
    case 'FLIPPER': {
      const d = defaultFlipperInputs();
      const s = inputs as any as Partial<FlipperInputs>;
      return {
        ...d,
        ...s,
        custom: {
          ...d.custom,
          ...(s.custom ?? {}),
          acquisition: s.custom?.acquisition ?? d.custom?.acquisition,
          renovation: s.custom?.renovation ?? d.custom?.renovation,
          financing: s.custom?.financing ?? d.custom?.financing,
          carrying: s.custom?.carrying ?? d.custom?.carrying,
          exit: s.custom?.exit ?? d.custom?.exit,
        },
      };
    }
  }
};

export const ProjectProvider: React.FC<{ session: Session; children: React.ReactNode }> = ({
  session,
  children,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });

  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId) ?? projects[0] ?? null,
    [projects, activeProjectId]
  );

  // Simple debounce for updates to avoid spamming Supabase.
  const pendingUpdate = useRef<{ id: string; timeout: any } | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const items = await listProjects();
      const normalized = items.map((p) => ({ ...p, inputs: normalizeInputs(p.strategy, p.inputs as any) }));
      setProjects(normalized);

      // If current active is missing, fall back to first.
      const nextActive = items.find((p) => p.id === activeProjectId) ? activeProjectId : items[0]?.id ?? null;
      setActiveProjectIdState(nextActive);
      if (nextActive) {
        try {
          localStorage.setItem(STORAGE_KEY, nextActive);
        } catch {
          // ignore
        }
      }
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [activeProjectId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setActiveProjectId = useCallback((id: string) => {
    setActiveProjectIdState(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // ignore
    }
  }, []);

  const createNewProject = useCallback(
    async (args: { session: Session; name: string; strategy: InvestmentStrategy }) => {
      const inputs = pickDefaults(args.strategy);
      const p = await createProject({
        ownerId: args.session.user.id,
        name: args.name,
        strategy: args.strategy,
        inputs,
      });
      setProjects((prev) => [p, ...prev]);
      setActiveProjectId(p.id);
      return p;
    },
    [setActiveProjectId]
  );

  const renameProject = useCallback(async (id: string, name: string) => {
    const p = projects.find((x) => x.id === id);
    if (!p) return;
    const next = projects.map((x) => (x.id === id ? { ...x, name } : x));
    setProjects(next);
    await updateProject({
      id,
      patch: {
        name,
        data: { currency: p.currency, schemaVersion: p.schemaVersion, inputs: p.inputs as any },
      },
    });
  }, [projects]);

  const removeProject = useCallback(
    async (id: string) => {
      setProjects((prev) => prev.filter((p) => p.id !== id));
      if (activeProjectId === id) setActiveProjectIdState(null);
      await deleteProject(id);
    },
    [activeProjectId]
  );

  const updateInputs = useCallback(
    (inputs: StrategyInputs) => {
      if (!activeProject) return;
      const nextProject: Project = { ...activeProject, inputs };
      setProjects((prev) => prev.map((p) => (p.id === activeProject.id ? nextProject : p)));

      // Debounced server update.
      if (pendingUpdate.current?.timeout) clearTimeout(pendingUpdate.current.timeout);
      const timeout = setTimeout(async () => {
        try {
          await updateProject({
            id: activeProject.id,
            patch: {
              strategy: activeProject.strategy,
              data: { currency: activeProject.currency, schemaVersion: activeProject.schemaVersion, inputs },
            },
          });
        } catch (e) {
          // Swallow errors; UI remains responsive. Next refresh will show truth.
        }
      }, 600);
      pendingUpdate.current = { id: activeProject.id, timeout };
    },
    [activeProject]
  );

  const results = useMemo(() => {
    if (!activeProject) return null;
    return calculateProject(activeProject.strategy, activeProject.inputs);
  }, [activeProject]);

  const value: ProjectContextValue = {
    loading,
    error,
    projects,
    activeProject,
    results,
    refresh,
    setActiveProjectId,
    createNewProject,
    renameProject,
    removeProject,
    updateInputs,
  };

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};

export const useProjects = () => {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProjects must be used within ProjectProvider');
  return ctx;
};
