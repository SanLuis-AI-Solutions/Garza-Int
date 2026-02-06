import { supabase } from './supabaseClient';
import type {
  InvestmentStrategy,
  Project,
  ProjectDataPayload,
  StrategyInputs,
} from '../domain/strategies/types';

type ProjectRow = {
  id: string;
  owner_id: string;
  name: string;
  strategy: InvestmentStrategy;
  data: ProjectDataPayload;
  schema_version: number;
  created_at: string;
  updated_at: string;
};

const nowIso = () => new Date().toISOString();

const rowToProject = (row: ProjectRow): Project => {
  const payload = row.data;
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    strategy: row.strategy,
    currency: payload.currency,
    schemaVersion: payload.schemaVersion ?? row.schema_version ?? 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    inputs: payload.inputs,
  };
};

export const listProjects = async (): Promise<Project[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('projects')
    .select('id,owner_id,name,strategy,data,schema_version,created_at,updated_at')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as ProjectRow[]).map(rowToProject);
};

export const createProject = async (args: {
  ownerId: string;
  name: string;
  strategy: InvestmentStrategy;
  inputs: StrategyInputs;
}): Promise<Project> => {
  if (!supabase) throw new Error('Supabase not configured');

  const payload: ProjectDataPayload = {
    currency: 'USD',
    schemaVersion: 1,
    inputs: args.inputs,
  };

  const { data, error } = await supabase
    .from('projects')
    .insert({
      owner_id: args.ownerId,
      name: args.name,
      strategy: args.strategy,
      data: payload,
      schema_version: 1,
      updated_at: nowIso(),
    })
    .select('id,owner_id,name,strategy,data,schema_version,created_at,updated_at')
    .single();

  if (error) throw error;
  return rowToProject(data as ProjectRow);
};

export const updateProject = async (args: {
  id: string;
  patch: Partial<{ name: string; data: ProjectDataPayload; strategy: InvestmentStrategy }>;
}): Promise<void> => {
  if (!supabase) throw new Error('Supabase not configured');

  const update: any = { ...args.patch, updated_at: nowIso() };
  const { error } = await supabase.from('projects').update(update).eq('id', args.id);
  if (error) throw error;
};

export const deleteProject = async (id: string): Promise<void> => {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw error;
};

