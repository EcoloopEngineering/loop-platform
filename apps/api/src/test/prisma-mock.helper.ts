type MockModel = {
  findUnique: jest.Mock;
  findFirst: jest.Mock;
  findMany: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  count: jest.Mock;
  updateMany: jest.Mock;
  upsert: jest.Mock;
};

function createMockModel(): MockModel {
  return {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    updateMany: jest.fn(),
    upsert: jest.fn(),
  };
}

export type MockPrismaService = {
  user: MockModel;
  lead: MockModel;
  customer: MockModel;
  property: MockModel;
  pipeline: MockModel;
  leadScore: MockModel;
  leadAssignment: MockModel;
  leadActivity: MockModel;
  designRequest: MockModel;
  document: MockModel;
  commission: MockModel;
  notification: MockModel;
  userDevice: MockModel;
  appointment: MockModel;
  referral: MockModel;
  team: MockModel;
  $connect: jest.Mock;
  $disconnect: jest.Mock;
  $transaction: jest.Mock;
};

export function createMockPrismaService(): MockPrismaService {
  return {
    user: createMockModel(),
    lead: createMockModel(),
    customer: createMockModel(),
    property: createMockModel(),
    pipeline: createMockModel(),
    leadScore: createMockModel(),
    leadAssignment: createMockModel(),
    leadActivity: createMockModel(),
    designRequest: createMockModel(),
    document: createMockModel(),
    commission: createMockModel(),
    notification: createMockModel(),
    userDevice: createMockModel(),
    appointment: createMockModel(),
    referral: createMockModel(),
    team: createMockModel(),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $transaction: jest.fn(),
  };
}
