import { LeadStage } from '../enums';

export interface PipelineStageDefinition {
  stage: LeadStage;
  label: string;
  color: string;
  order: number;
}

export const CLOSER_PIPELINE_STAGES: PipelineStageDefinition[] = [
  { stage: LeadStage.NEW_LEAD, label: 'New Lead', color: '#4CAF50', order: 1 },
  { stage: LeadStage.REQUEST_DESIGN, label: 'Request Design', color: '#2196F3', order: 2 },
  { stage: LeadStage.DESIGN_IN_PROGRESS, label: 'Design In Progress', color: '#FF9800', order: 3 },
  { stage: LeadStage.DESIGN_READY, label: 'Design Ready', color: '#9C27B0', order: 4 },
  { stage: LeadStage.PENDING_SIGNATURE, label: 'Pending Signature', color: '#795548', order: 5 },
  { stage: LeadStage.SIT, label: 'Sit', color: '#00BCD4', order: 6 },
  { stage: LeadStage.WON, label: 'Won', color: '#4CAF50', order: 7 },
  { stage: LeadStage.LOST, label: 'Lost', color: '#F44336', order: 8 },
];

export const PROJECT_MANAGER_PIPELINE_STAGES: PipelineStageDefinition[] = [
  { stage: LeadStage.SITE_AUDIT_PENDING, label: 'Site Audit', color: '#FF5722', order: 1 },
  { stage: LeadStage.ENGINEERING_DESIGN, label: 'Engineering Design', color: '#3F51B5', order: 2 },
  { stage: LeadStage.PROPOSAL_REVIEW, label: 'Proposal Review', color: '#009688', order: 3 },
  { stage: LeadStage.INSTALL_READY, label: 'Install Ready', color: '#CDDC39', order: 4 },
  { stage: LeadStage.INSTALL_SCHEDULED, label: 'Install Scheduled', color: '#FFC107', order: 5 },
  { stage: LeadStage.INSTALL_COMPLETE, label: 'Install Complete', color: '#4CAF50', order: 6 },
];
