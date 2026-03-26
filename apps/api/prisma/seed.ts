import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create Closer Pipeline
  const closerPipeline = await prisma.pipeline.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Closer Pipeline',
      type: 'CLOSER',
      isDefault: true,
      stages: {
        create: [
          { stage: 'NEW_LEAD', label: 'New Lead', displayOrder: 1, color: '#4CAF50' },
          { stage: 'ALREADY_CALLED', label: 'Already Called', displayOrder: 2, color: '#8BC34A' },
          { stage: 'CONNECTED', label: 'Connected', displayOrder: 3, color: '#2196F3' },
          { stage: 'REQUEST_DESIGN', label: 'Request Design', displayOrder: 4, color: '#03A9F4' },
          { stage: 'DESIGN_IN_PROGRESS', label: 'Design In Progress', displayOrder: 5, color: '#FF9800' },
          { stage: 'DESIGN_READY', label: 'Design Ready', displayOrder: 6, color: '#9C27B0' },
          { stage: 'WON', label: 'Won', displayOrder: 7, color: '#00897B' },
        ],
      },
    },
  });

  // Create Project Manager Pipeline
  const pmPipeline = await prisma.pipeline.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'Project Manager Pipeline',
      type: 'PROJECT_MANAGER',
      isDefault: false,
      stages: {
        create: [
          { stage: 'SITE_AUDIT', label: 'Site Audit', displayOrder: 1, color: '#FF5722' },
          { stage: 'PROGRESS_REVIEW', label: 'Progress Review', displayOrder: 2, color: '#E91E63' },
          { stage: 'NTP', label: 'NTP', displayOrder: 3, color: '#9C27B0' },
          { stage: 'ENGINEERING', label: 'Engineering', displayOrder: 4, color: '#3F51B5' },
          { stage: 'PERMIT_AND_ICE', label: 'Permit and ICE', displayOrder: 5, color: '#2196F3' },
          { stage: 'FINAL_APPROVAL', label: 'Final Approval', displayOrder: 6, color: '#00BCD4' },
          { stage: 'INSTALL_READY', label: 'Install Ready', displayOrder: 7, color: '#009688' },
          { stage: 'INSTALL', label: 'Install', displayOrder: 8, color: '#4CAF50' },
          { stage: 'COMMISSION', label: 'Commission', displayOrder: 9, color: '#8BC34A' },
          { stage: 'SITE_COMPLETE', label: 'Site Complete', displayOrder: 10, color: '#CDDC39' },
          { stage: 'INITIAL_SUBMISSION_AND_INSPECTION', label: 'Initial Submission & Inspection', displayOrder: 11, color: '#FFC107' },
          { stage: 'WAITING_FOR_PTO', label: 'Waiting for PTO', displayOrder: 12, color: '#FF9800' },
          { stage: 'FINAL_SUBMISSION', label: 'Final Submission', displayOrder: 13, color: '#FF5722' },
          { stage: 'CUSTOMER_SUCCESS', label: 'Customer Success', displayOrder: 14, color: '#4CAF50' },
        ],
      },
    },
  });

  // Create Finance Pipeline
  const financePipeline = await prisma.pipeline.upsert({
    where: { id: '00000000-0000-0000-0000-000000000003' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000003',
      name: 'Finance Pipeline',
      type: 'FINANCE',
      isDefault: false,
      stages: {
        create: [
          { stage: 'FIN_TICKETS_OPEN', label: 'Tickets Open', displayOrder: 1, color: '#2196F3' },
          { stage: 'FIN_IN_PROGRESS', label: 'In Progress', displayOrder: 2, color: '#FF9800' },
          { stage: 'FIN_POST_INITIAL_NURTURE', label: 'Post Initial Nurture', displayOrder: 3, color: '#9C27B0' },
          { stage: 'FIN_TICKETS_CLOSED', label: 'Tickets Closed', displayOrder: 4, color: '#4CAF50' },
        ],
      },
    },
  });

  // Create Maintenance Pipeline
  const maintenancePipeline = await prisma.pipeline.upsert({
    where: { id: '00000000-0000-0000-0000-000000000004' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000004',
      name: 'Maintenance Pipeline',
      type: 'MAINTENANCE',
      isDefault: false,
      stages: {
        create: [
          { stage: 'MAINT_TICKETS_OPEN', label: 'Tickets Open', displayOrder: 1, color: '#2196F3' },
          { stage: 'MAINT_IN_PROGRESS', label: 'In Progress', displayOrder: 2, color: '#FF9800' },
          { stage: 'MAINT_POST_INSTALL_NURTURE', label: 'Post Install Nurture', displayOrder: 3, color: '#9C27B0' },
          { stage: 'MAINT_TICKETS_CLOSED', label: 'Tickets Closed', displayOrder: 4, color: '#4CAF50' },
        ],
      },
    },
  });

  console.log(
    'Seeded pipelines:',
    closerPipeline.name,
    pmPipeline.name,
    financePipeline.name,
    maintenancePipeline.name,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
