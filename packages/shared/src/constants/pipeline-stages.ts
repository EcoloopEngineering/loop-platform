import { LeadStage, PipelineType } from '../enums';

export interface PipelineStageDefinition {
  stage: LeadStage;
  label: string;
  color: string;
  order: number;
}

// ── Closer Pipeline (Sales Team) ──────────────────────────────────
export const CLOSER_PIPELINE_STAGES: PipelineStageDefinition[] = [
  { stage: LeadStage.NEW_LEAD, label: 'New Lead', color: '#4CAF50', order: 1 },
  { stage: LeadStage.ALREADY_CALLED, label: 'Already Called', color: '#8BC34A', order: 2 },
  { stage: LeadStage.CONNECTED, label: 'Connected', color: '#2196F3', order: 3 },
  { stage: LeadStage.REQUEST_DESIGN, label: 'Request Design', color: '#03A9F4', order: 4 },
  { stage: LeadStage.DESIGN_IN_PROGRESS, label: 'Design In Progress', color: '#FF9800', order: 5 },
  { stage: LeadStage.DESIGN_READY, label: 'Design Ready', color: '#9C27B0', order: 6 },
  { stage: LeadStage.WON, label: 'Won', color: '#00897B', order: 7 },
];

// ── Project Manager Pipeline (Ops Team) ───────────────────────────
export const PM_PIPELINE_STAGES: PipelineStageDefinition[] = [
  { stage: LeadStage.SITE_AUDIT, label: 'Site Audit', color: '#FF5722', order: 1 },
  { stage: LeadStage.PROGRESS_REVIEW, label: 'Progress Review', color: '#E91E63', order: 2 },
  { stage: LeadStage.NTP, label: 'NTP', color: '#9C27B0', order: 3 },
  { stage: LeadStage.ENGINEERING, label: 'Engineering', color: '#3F51B5', order: 4 },
  { stage: LeadStage.PERMIT_AND_ICE, label: 'Permit and ICE', color: '#2196F3', order: 5 },
  { stage: LeadStage.FINAL_APPROVAL, label: 'Final Approval', color: '#00BCD4', order: 6 },
  { stage: LeadStage.INSTALL_READY, label: 'Install Ready', color: '#009688', order: 7 },
  { stage: LeadStage.INSTALL, label: 'Install', color: '#4CAF50', order: 8 },
  { stage: LeadStage.COMMISSION, label: 'Commission', color: '#8BC34A', order: 9 },
  { stage: LeadStage.SITE_COMPLETE, label: 'Site Complete', color: '#CDDC39', order: 10 },
  { stage: LeadStage.INITIAL_SUBMISSION_AND_INSPECTION, label: 'Initial Submission & Inspection', color: '#FFC107', order: 11 },
  { stage: LeadStage.WAITING_FOR_PTO, label: 'Waiting for PTO', color: '#FF9800', order: 12 },
  { stage: LeadStage.FINAL_SUBMISSION, label: 'Final Submission', color: '#FF5722', order: 13 },
  { stage: LeadStage.CUSTOMER_SUCCESS, label: 'Customer Success', color: '#4CAF50', order: 14 },
];

// ── Finance Pipeline (Finance Team) ───────────────────────────────
export const FINANCE_PIPELINE_STAGES: PipelineStageDefinition[] = [
  { stage: LeadStage.FIN_TICKETS_OPEN, label: 'Tickets Open', color: '#2196F3', order: 1 },
  { stage: LeadStage.FIN_IN_PROGRESS, label: 'In Progress', color: '#FF9800', order: 2 },
  { stage: LeadStage.FIN_POST_INITIAL_NURTURE, label: 'Post Initial Nurture', color: '#9C27B0', order: 3 },
  { stage: LeadStage.FIN_TICKETS_CLOSED, label: 'Tickets Closed', color: '#4CAF50', order: 4 },
];

// ── Maintenance Pipeline (Maintenance Team — on demand) ───────────
export const MAINTENANCE_PIPELINE_STAGES: PipelineStageDefinition[] = [
  { stage: LeadStage.MAINT_TICKETS_OPEN, label: 'Tickets Open', color: '#2196F3', order: 1 },
  { stage: LeadStage.MAINT_IN_PROGRESS, label: 'In Progress', color: '#FF9800', order: 2 },
  { stage: LeadStage.MAINT_POST_INSTALL_NURTURE, label: 'Post Install Nurture', color: '#9C27B0', order: 3 },
  { stage: LeadStage.MAINT_TICKETS_CLOSED, label: 'Tickets Closed', color: '#4CAF50', order: 4 },
];

// ── All pipelines map ─────────────────────────────────────────────
export const PIPELINE_STAGES: Record<PipelineType, PipelineStageDefinition[]> = {
  [PipelineType.CLOSER]: CLOSER_PIPELINE_STAGES,
  [PipelineType.PROJECT_MANAGER]: PM_PIPELINE_STAGES,
  [PipelineType.FINANCE]: FINANCE_PIPELINE_STAGES,
  [PipelineType.MAINTENANCE]: MAINTENANCE_PIPELINE_STAGES,
};

// ── Stage → Pipeline mapping ──────────────────────────────────────
export const STAGE_TO_PIPELINE: Record<LeadStage, PipelineType> = Object.entries(
  PIPELINE_STAGES,
).reduce(
  (acc, [pipelineType, stages]) => {
    for (const s of stages) {
      acc[s.stage] = pipelineType as PipelineType;
    }
    return acc;
  },
  {} as Record<LeadStage, PipelineType>,
);

// ── Auto-transitions between pipelines ────────────────────────────
export const PIPELINE_TRANSITIONS: Partial<
  Record<LeadStage, { nextStage: LeadStage; nextPipelineId: string }>
> = {
  [LeadStage.WON]: {
    nextStage: LeadStage.SITE_AUDIT,
    nextPipelineId: '00000000-0000-0000-0000-000000000002', // PM Pipeline
  },
  [LeadStage.CUSTOMER_SUCCESS]: {
    nextStage: LeadStage.FIN_TICKETS_OPEN,
    nextPipelineId: '00000000-0000-0000-0000-000000000003', // Finance Pipeline
  },
};

// ── Stage color lookup (flat) ─────────────────────────────────────
export const STAGE_COLORS: Record<string, string> = Object.values(PIPELINE_STAGES)
  .flat()
  .reduce(
    (acc, s) => {
      acc[s.stage] = s.color;
      return acc;
    },
    {} as Record<string, string>,
  );

// ── Stage label lookup (flat) ─────────────────────────────────────
export const STAGE_LABELS: Record<string, string> = Object.values(PIPELINE_STAGES)
  .flat()
  .reduce(
    (acc, s) => {
      acc[s.stage] = s.label;
      return acc;
    },
    {} as Record<string, string>,
  );
