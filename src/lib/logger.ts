// CORE LOGIC - avoid editing unless assigned

type LogPayload = Record<string, unknown>;

export const logger = {
  info: (message: string, payload?: LogPayload) => {
    console.log(`[INFO] ${message}`, payload ?? {});
  },
  warn: (message: string, payload?: LogPayload) => {
    console.warn(`[WARN] ${message}`, payload ?? {});
  },
  error: (message: string, payload?: LogPayload) => {
    console.error(`[ERROR] ${message}`, payload ?? {});
  },
};
