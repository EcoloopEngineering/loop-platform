/**
 * Seed Task Templates — replicates all 11 Asana stage handlers
 * Run: npx ts-node prisma/seed-task-templates.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const templates = [
  // ============================================
  // PROGRESS_REVIEW — 3 main tasks + conditional
  // ============================================
  {
    stage: 'PROGRESS_REVIEW',
    title: 'Final Design & Production',
    description: 'Complete the final solar design and production documents.',
    defaultAssigneeEmail: 'henrique@ecoloop.us',
    subtasks: ['Final Design', 'Signed/Final Design image uploaded', 'Change order - if needed'],
    sortOrder: 1,
  },
  {
    stage: 'PROGRESS_REVIEW',
    title: 'Electrical Review',
    description: 'Review electrical panel and service for compatibility.',
    defaultAssigneeEmail: 'balbino@ecoloop.us',
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
      'Utility Bill (check open balance)',
    ],
    conditions: {
      stateSubtasks: {
        CT: ['HES Audit Scheduling', 'Check if offset is close or below 100%'],
        RI: ['Test project on RI spreadsheet'],
      },
    },
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
  // ENGINEERING — Engineering submission
  // ============================================
  {
    stage: 'ENGINEERING',
    title: 'Engineering / ICX Submission',
    description: 'Submit engineering documents for review.',
    defaultAssigneeEmail: 'jose.guilherme@ecoloop.us',
    sortOrder: 1,
  },

  // ============================================
  // PERMIT_AND_ICE — Permit + ICE submission
  // ============================================
  {
    stage: 'PERMIT_AND_ICE',
    title: 'Permit Submission',
    description: 'Submit permit application to local authority.',
    defaultAssigneeEmail: 'elaine@ecoloop.us',
    conditions: {
      stateOverride: {
        states: ['CT', 'RI'],
        assigneeRole: 'PM',
      },
    },
    sortOrder: 1,
  },
  {
    stage: 'PERMIT_AND_ICE',
    title: 'ICX Submission',
    description: 'Submit interconnection application to utility company.',
    defaultAssigneeEmail: 'danielle@ecoloop.us',
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
    sortOrder: 1,
  },
  {
    stage: 'FINAL_APPROVAL',
    title: 'Structural Upgrade Schedule',
    description: 'Schedule structural upgrade work.',
    defaultAssigneeEmail: 'joao@ecoloop.us',
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
    defaultAssigneeEmail: 'douglas@ecoloop.us',
    sortOrder: 1,
  },

  // ============================================
  // INSTALL — M1 packet (Cash deals only)
  // ============================================
  {
    stage: 'INSTALL',
    title: 'M1 Packet',
    description: 'Prepare M1 payment packet for cash deal.',
    defaultAssigneeEmail: 'isabelle@ecoloop.us',
    conditions: { financierIncludes: 'Cash Deal' },
    sortOrder: 1,
  },

  // ============================================
  // SITE_COMPLETE — Install submission
  // ============================================
  {
    stage: 'SITE_COMPLETE',
    title: 'Install Submission',
    description: 'Submit installation documentation and photos.',
    defaultAssigneeEmail: 'solano@ecoloop.us',
    sortOrder: 1,
  },

  // ============================================
  // INITIAL_SUBMISSION_AND_INSPECTION
  // ============================================
  {
    stage: 'INITIAL_SUBMISSION_AND_INSPECTION',
    title: 'Inspection',
    description: 'Schedule and complete post-install inspection.',
    defaultAssigneeEmail: 'netto@ecoloop.us',
    sortOrder: 1,
  },
  {
    stage: 'INITIAL_SUBMISSION_AND_INSPECTION',
    title: 'M2 Packet',
    description: 'Prepare M2 payment packet for cash deal.',
    defaultAssigneeEmail: 'isabelle@ecoloop.us',
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
    defaultAssigneeEmail: 'danielle@ecoloop.us',
    sortOrder: 1,
  },

  // ============================================
  // FINAL_SUBMISSION — Final docs
  // ============================================
  {
    stage: 'FINAL_SUBMISSION',
    title: 'Final Submission',
    description: 'Submit all final documentation to financier.',
    defaultAssigneeEmail: 'thiers@ecoloop.us',
    sortOrder: 1,
  },
  {
    stage: 'FINAL_SUBMISSION',
    title: 'M3 Packet',
    description: 'Prepare M3 payment packet for cash deal.',
    defaultAssigneeEmail: 'isabelle@ecoloop.us',
    conditions: { financierIncludes: 'Cash Deal' },
    sortOrder: 2,
  },
];

async function seed() {
  console.log('Seeding task templates...');

  for (const t of templates) {
    await prisma.taskTemplate.create({
      data: {
        stage: t.stage,
        title: t.title,
        description: t.description ?? undefined,
        defaultAssigneeRole: t.defaultAssigneeRole ?? undefined,
        defaultAssigneeEmail: t.defaultAssigneeEmail ?? undefined,
        subtasks: t.subtasks ?? undefined,
        conditions: t.conditions ?? undefined,
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
