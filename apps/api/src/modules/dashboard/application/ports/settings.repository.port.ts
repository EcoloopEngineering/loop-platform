export const SETTINGS_REPOSITORY = Symbol('SETTINGS_REPOSITORY');

export interface SettingsRepositoryPort {
  findAll(): Promise<{ key: string; value: unknown }[]>;
  findByKey(key: string): Promise<{ key: string; value: unknown } | null>;
  upsert(key: string, value: unknown, userId: string): Promise<{ key: string; value: unknown }>;
}
