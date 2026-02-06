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
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-2 px-3 py-2 gi-btn gi-btn-secondary text-sm"
      >
        <span className="max-w-[220px] truncate">
          Project: <span className="font-semibold text-white/95">{activeLabel}</span>
        </span>
        <ChevronDown className="w-4 h-4 text-white/70" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[360px] gi-popover overflow-hidden z-20">
          <div className="p-3 border-b border-white/10 flex items-center justify-between">
            <div className="text-xs font-semibold gi-muted uppercase tracking-wide">Projects</div>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onNew();
              }}
              className="inline-flex items-center gap-2 text-xs font-semibold gi-btn gi-btn-primary px-2.5 py-1.5"
            >
              <Plus className="w-4 h-4" />
              New
            </button>
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {projects.length === 0 ? (
              <div className="p-4 text-sm gi-muted">No projects yet.</div>
            ) : (
              projects.map((p) => (
                <div
                  key={p.id}
                  className={`flex items-center justify-between px-3 py-2 border-b border-white/5 ${
                    p.id === activeProject?.id ? 'bg-white/5' : 'hover:bg-white/5'
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
                    <div className="text-sm font-semibold text-white/95 truncate">{p.name}</div>
                    <div className="text-[11px] gi-muted2">
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
                    className="p-2 rounded-md text-white/60 hover:text-red-200 hover:bg-red-500/10"
                    title="Delete project"
                    aria-label={`Delete project ${p.name}`}
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
