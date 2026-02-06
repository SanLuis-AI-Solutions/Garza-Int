import React, { useMemo, useState } from 'react';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import type { Project } from '../../domain/strategies/types';

const ProjectSwitcher: React.FC<{
  projects: Project[];
  activeProject: Project | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => Promise<void>;
}> = ({ projects, activeProject, onSelect, onNew, onDelete }) => {
  const [open, setOpen] = useState(false);
  const activeLabel = useMemo(() => activeProject?.name ?? 'No project', [activeProject]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-sm"
      >
        <span className="max-w-[220px] truncate">
          Project: <span className="font-semibold text-slate-900">{activeLabel}</span>
        </span>
        <ChevronDown className="w-4 h-4 text-slate-500" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[360px] bg-white border border-slate-200 shadow-xl rounded-xl overflow-hidden z-20">
          <div className="p-3 border-b border-slate-100 flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Projects</div>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onNew();
              }}
              className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-md border border-indigo-200"
            >
              <Plus className="w-4 h-4" />
              New
            </button>
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {projects.length === 0 ? (
              <div className="p-4 text-sm text-slate-600">No projects yet.</div>
            ) : (
              projects.map((p) => (
                <div
                  key={p.id}
                  className={`flex items-center justify-between px-3 py-2 border-b border-slate-50 hover:bg-slate-50 ${
                    p.id === activeProject?.id ? 'bg-indigo-50/60' : ''
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(p.id);
                      setOpen(false);
                    }}
                    className="text-left flex-1 pr-3"
                  >
                    <div className="text-sm font-semibold text-slate-900 truncate">{p.name}</div>
                    <div className="text-[11px] text-slate-500">
                      {p.strategy === 'DEVELOPER'
                        ? 'Ground-Up Development'
                        : p.strategy === 'LANDLORD'
                        ? 'Buy & Hold'
                        : 'Fix & Flip'}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirm(`Delete project "${p.name}"?`)) return;
                      await onDelete(p.id);
                    }}
                    className="p-2 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50"
                    title="Delete project"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectSwitcher;

