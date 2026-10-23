import { ISettings } from "./settings.interface";

// Simple in-memory cache for the singleton settings document.
// Single-instance only — swap for Redis (or a TTL) when running multiple
// server instances behind a load balancer.
let cachedSettings: ISettings | null = null;

export const settingsCache = {
    get: (): ISettings | null => cachedSettings,
    set: (data: ISettings): void => {
        cachedSettings = data;
    },
    invalidate: (): void => {
        cachedSettings = null;
    },
};
