const DB_LOG_PREFIX = '[db]';

export function logDbInfo(message: string): void {
  console.info(`${DB_LOG_PREFIX} ${message}`);
}

export function logDbWarn(message: string): void {
  console.warn(`${DB_LOG_PREFIX} ${message}`);
}

export function logDbError(message: string, error: unknown): void {
  console.error(`${DB_LOG_PREFIX} ${message}`, error);
}
