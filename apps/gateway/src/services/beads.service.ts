import type {
  BrCloseOptions,
  BrCommandOptions,
  BrCreateInput,
  BrIssue,
  BrListOptions,
  BrReadyOptions,
  BrSyncOptions,
  BrSyncResult,
  BrSyncStatus,
  BrUpdateInput,
  BvGraphOptions,
  BvGraphResult,
  BvInsightsResult,
  BvPlanResult,
  BvTriageResult,
} from "@flywheel/flywheel-clients";
import {
  closeBrIssues,
  createBrIssue,
  getBrList,
  getBrReady,
  getBrShow,
  getBrSyncStatus,
  syncBr,
  updateBrIssues,
} from "./br.service";
import {
  getBvGraph,
  getBvInsights,
  getBvPlan,
  getBvTriage,
} from "./bv.service";

export interface BeadsService {
  // BV (triage/insights/plan/graph)
  getTriage: () => Promise<BvTriageResult>;
  getInsights: () => Promise<BvInsightsResult>;
  getPlan: () => Promise<BvPlanResult>;
  getGraph: (options?: BvGraphOptions) => Promise<BvGraphResult>;

  // BR CRUD operations
  ready: (options?: BrReadyOptions) => Promise<BrIssue[]>;
  list: (options?: BrListOptions) => Promise<BrIssue[]>;
  show: (
    ids: string | string[],
    options?: BrCommandOptions,
  ) => Promise<BrIssue[]>;
  create: (
    input: BrCreateInput,
    options?: BrCommandOptions,
  ) => Promise<BrIssue>;
  update: (
    ids: string | string[],
    input: BrUpdateInput,
    options?: BrCommandOptions,
  ) => Promise<BrIssue[]>;
  close: (
    ids: string | string[],
    options?: BrCloseOptions,
  ) => Promise<BrIssue[]>;

  // BR sync operations
  syncStatus: (options?: BrCommandOptions) => Promise<BrSyncStatus>;
  sync: (options?: BrSyncOptions) => Promise<BrSyncResult>;
}

export function createBeadsService(): BeadsService {
  return {
    // BV operations
    getTriage: () => getBvTriage(),
    getInsights: () => getBvInsights(),
    getPlan: () => getBvPlan(),
    getGraph: (options?: BvGraphOptions) => getBvGraph(options),

    // BR CRUD operations
    ready: (options?: BrReadyOptions) => getBrReady(options),
    list: (options?: BrListOptions) => getBrList(options),
    show: (ids, options) => getBrShow(ids, options),
    create: (input, options) => createBrIssue(input, options),
    update: (ids, input, options) => updateBrIssues(ids, input, options),
    close: (ids, options) => closeBrIssues(ids, options),

    // BR sync operations
    syncStatus: (options) => getBrSyncStatus(options),
    sync: (options) => syncBr(options),
  };
}
