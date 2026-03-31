/**
 * Seed Task Templates — comprehensive pipeline automation templates
 * Run: pnpm --filter @loop/api db:seed:tasks
 *
 * Idempotent: deletes all existing templates then recreates.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TemplateSeed {
  stage: string;
  title: string;
  description?: string;
  defaultAssigneeRole?: string;
  defaultAssigneeEmail?: string;
  subtasks?: string[];
  conditions?: Record<string, unknown>;
  sortOrder: number;
}

const templates: TemplateSeed[] = [
  // ============================================
  // SITE_AUDIT — Assign PM
  // ============================================
  {
    stage: 'SITE_AUDIT',
    title: 'Assign PM',
    description: 'Assign a Project Manager to this lead.',
    defaultAssigneeRole: 'ADMIN',
    sortOrder: 1,
    conditions: { nextStage: 'PROGRESS_REVIEW' },
  },

  // ============================================
  // PROGRESS_REVIEW — Design, electrical, full review, conditional quotes
  // ============================================
  {
    stage: 'PROGRESS_REVIEW',
    title: 'Final Design & Production',
    description: 'Complete the final solar design and production documents.',
    defaultAssigneeRole: 'DESIGNER',
    subtasks: ['Final Design', 'Signed/Final Design image uploaded', 'Change order - if needed'],
    conditions: {
      stateSubtasks: {
        CT: ['HES Audit Scheduling', 'Check if offset close to 100%'],
        RI: ['Test project on RI spreadsheet'],
      },
    },
    sortOrder: 1,
  },
  {
    stage: 'PROGRESS_REVIEW',
    title: 'Electric Review',
    description: 'Review electrical panel and service for compatibility.',
    defaultAssigneeRole: 'ELECTRICIAN',
    sortOrder: 2,
  },
  {
    stage: 'PROGRESS_REVIEW',
    title: 'Full Project Review',
    description: 'Complete project review checklist with all items verified.',
    defaultAssigneeRole: 'PM',
    subtasks: [
      'NTP Completed',
      'Final Design Completed',
      'Electrical Review Completed',
      'Roof Review Completed',
      'Quotes Approved',
      'Adders Reviewed',
      'Project Information Updated',
      'Utility Bill Check',
    ],
    conditions: { nextStage: 'NTP' },
    sortOrder: 3,
  },
  {
    stage: 'PROGRESS_REVIEW',
    title: 'Structural Quote',
    description: 'Get structural quote for the property.',
    defaultAssigneeRole: 'PM',
    conditions: { upgradesIncludes: 'Structural' },
    sortOrder: 4,
  },
  {
    stage: 'PROGRESS_REVIEW',
    title: 'Roof Quote',
    description: 'Get roof quote for re-roofing work.',
    defaultAssigneeRole: 'PM',
    conditions: { upgradesIncludes: ['ROOFING', 'REROOF'] },
    sortOrder: 5,
  },

  // ============================================
  // NTP — no tasks, auto-advance
  // ============================================

  // ============================================
  // ENGINEERING — Engineering submission
  // ============================================
  {
    stage: 'ENGINEERING',
    title: 'Engineering/ICX Submission',
    description: 'Submit engineering documents for review.',
    defaultAssigneeRole: 'ENGINEER',
    conditions: { nextStage: 'PERMIT_AND_ICE' },
    sortOrder: 1,
  },

  // ============================================
  // PERMIT_AND_ICE — Permit + ICE submission
  // ============================================
  {
    stage: 'PERMIT_AND_ICE',
    title: 'Permit Submission',
    description: 'Submit permit application to local authority.',
    defaultAssigneeRole: 'PERMIT_SPECIALIST',
    conditions: { stateOverride: { CT: 'PM', RI: 'PM' } },
    sortOrder: 1,
  },
  {
    stage: 'PERMIT_AND_ICE',
    title: 'ICX Submission',
    description: 'Submit interconnection application to utility company.',
    defaultAssigneeRole: 'ICX_SPECIALIST',
    conditions: { nextStage: 'FINAL_APPROVAL' },
    sortOrder: 2,
  },

  // ============================================
  // FINAL_APPROVAL — Final review + conditionals
  // ============================================
  {
    stage: 'FINAL_APPROVAL',
    title: 'Final Project Review',
    description: 'Final review before installation approval.',
    defaultAssigneeRole: 'PM',
    subtasks: [
      'Financier Status',
      'Plan set x Signed Design',
      'Upgrades',
      'General Notes Review',
      'Project Information Review',
    ],
    conditions: { nextStage: 'INSTALL_READY' },
    sortOrder: 1,
  },
  {
    stage: 'FINAL_APPROVAL',
    title: 'Structural Upgrade Schedule',
    description: 'Schedule structural upgrade work.',
    defaultAssigneeRole: 'INSTALL_COORDINATOR',
    conditions: { upgradesIncludes: 'Structural' },
    sortOrder: 2,
  },

  // ============================================
  // INSTALL_READY — Schedule installation
  // ============================================
  {
    stage: 'INSTALL_READY',
    title: 'Install Scheduling',
    description: 'Schedule the solar installation with the customer and crew.',
    defaultAssigneeRole: 'INSTALL_COORDINATOR',
    conditions: { nextStage: 'INSTALL' },
    sortOrder: 1,
  },

  // ============================================
  // INSTALL — Install submission + M1 packet
  // ============================================
  {
    stage: 'INSTALL',
    title: 'Install Submission',
    description: 'Submit installation documentation and photos.',
    defaultAssigneeRole: 'INSTALL_SPECIALIST',
    conditions: { nextStage: 'COMMISSION' },
    sortOrder: 1,
  },
  {
    stage: 'INSTALL',
    title: 'Send M1 Packet to HO',
    description: 'Prepare M1 payment packet for cash deal homeowner.',
    defaultAssigneeRole: 'FINANCE_SPECIALIST',
    conditions: { financierIncludes: 'Cash Deal' },
    sortOrder: 2,
  },

  // ============================================
  // INITIAL_SUBMISSION_AND_INSPECTION
  // ============================================
  {
    stage: 'INITIAL_SUBMISSION_AND_INSPECTION',
    title: 'Inspection',
    description: 'Schedule and complete post-install inspection.',
    defaultAssigneeRole: 'INSPECTOR',
    conditions: { nextStage: 'WAITING_FOR_PTO' },
    sortOrder: 1,
  },
  {
    stage: 'INITIAL_SUBMISSION_AND_INSPECTION',
    title: 'Send M2 Packet to HO',
    description: 'Prepare M2 payment packet for cash deal homeowner.',
    defaultAssigneeRole: 'FINANCE_SPECIALIST',
    conditions: { financierIncludes: 'Cash Deal' },
    sortOrder: 2,
  },

  // ============================================
  // WAITING_FOR_PTO — PTO submission
  // ============================================
  {
    stage: 'WAITING_FOR_PTO',
    title: 'PTO Submission',
    description: 'Submit Permission to Operate application.',
    defaultAssigneeRole: 'PTO_SPECIALIST',
    conditions: { nextStage: 'FINAL_SUBMISSION' },
    sortOrder: 1,
  },

  // ============================================
  // FINAL_SUBMISSION — Final docs + System turn on + M3
  // ============================================
  {
    stage: 'FINAL_SUBMISSION',
    title: 'Final Submission',
    description: 'Submit all final documentation to financier.',
    defaultAssigneeRole: 'SUBMISSION_SPECIALIST',
    subtasks: ['PTO Letter check up', 'Monitoring check up', 'Full Project information review'],
    conditions: { nextStage: 'CUSTOMER_SUCCESS' },
    sortOrder: 1,
  },
  {
    stage: 'FINAL_SUBMISSION',
    title: 'System Turn ON',
    description: 'Turn on the solar system and verify operation.',
    defaultAssigneeRole: 'TECHNICIAN',
    sortOrder: 2,
  },
  {
    stage: 'FINAL_SUBMISSION',
    title: 'Send M3 Packet to HO',
    description: 'Prepare M3 payment packet for cash deal homeowner.',
    defaultAssigneeRole: 'FINANCE_SPECIALIST',
    conditions: { financierIncludes: 'Cash Deal' },
    sortOrder: 3,
  },
];

async function seed() {
  console.log('Seeding task templates (idempotent — deleting existing first)...\n');

  // Delete all existing templates for idempotency
  const { count: deleted } = await prisma.taskTemplate.deleteMany();
  if (deleted > 0) {
    console.log(`  Deleted ${deleted} existing template(s).\n`);
  }

  for (const t of templates) {
    await prisma.taskTemplate.create({
      data: {
        stage: t.stage,
        title: t.title,
        description: t.description ?? undefined,
        defaultAssigneeRole: t.defaultAssigneeRole ?? undefined,
        defaultAssigneeEmail: t.defaultAssigneeEmail ?? undefined,
        subtasks: t.subtasks ?? undefined,
        conditions: (t.conditions ?? undefined) as any,
        sortOrder: t.sortOrder,
        isActive: true,
      },
    });
    console.log(`  Created: [${t.stage}] ${t.title}`);
  }

  console.log(`\nSeeded ${templates.length} task templates.`);
  await prisma.$disconnect();
}

seed().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
