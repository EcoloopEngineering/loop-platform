export const APPOINTMENT_REPOSITORY = Symbol('APPOINTMENT_REPOSITORY');

export interface AppointmentRepositoryPort {
  update(id: string, data: Record<string, unknown>): Promise<any>;
}
