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
      isDefault: true,
      stages: {
        create: [
          { stage: 'NEW_LEAD', label: 'New Lead', displayOrder: 1, color: '#4CAF50' },
          { stage: 'REQUEST_DESIGN', label: 'Request Design', displayOrder: 2, color: '#2196F3' },
          { stage: 'DESIGN_IN_PROGRESS', label: 'Design In Progress', displayOrder: 3, color: '#FF9800' },
          { stage: 'DESIGN_READY', label: 'Design Ready', displayOrder: 4, color: '#9C27B0' },
          { stage: 'PENDING_SIGNATURE', label: 'Pending Signature', displayOrder: 5, color: '#795548' },
          { stage: 'SIT', label: 'Sit', displayOrder: 6, color: '#00BCD4' },
          { stage: 'WON', label: 'Won', displayOrder: 7, color: '#4CAF50' },
          { stage: 'LOST', label: 'Lost', displayOrder: 8, color: '#F44336' },
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
      isDefault: false,
      stages: {
        create: [
          { stage: 'SITE_AUDIT_PENDING', label: 'Site Audit', displayOrder: 1, color: '#FF5722' },
          { stage: 'ENGINEERING_DESIGN', label: 'Engineering Design', displayOrder: 2, color: '#3F51B5' },
          { stage: 'PROPOSAL_REVIEW', label: 'Proposal Review', displayOrder: 3, color: '#009688' },
          { stage: 'INSTALL_READY', label: 'Install Ready', displayOrder: 4, color: '#CDDC39' },
          { stage: 'INSTALL_SCHEDULED', label: 'Install Scheduled', displayOrder: 5, color: '#FFC107' },
          { stage: 'INSTALL_COMPLETE', label: 'Install Complete', displayOrder: 6, color: '#4CAF50' },
        ],
      },
    },
  });

  console.log('Seeded pipelines:', closerPipeline.name, pmPipeline.name);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
