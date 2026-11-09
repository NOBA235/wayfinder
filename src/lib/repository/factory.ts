/**
 * Wayfinder Repository Factory
 *
 * To swap implementation A (LocalStorage, default) for B (REST / Momen Adapter):
 * Change EXACTLY ONE IMPORT on line 10 below:
 *
 * From:
 *   export { localRepository as defaultRepository } from './localRepository';
 * To:
 *   export { restRepository as defaultRepository } from './restRepository';
 */

// Implementation A: LocalStorage + Static JSON (Default, used in demo)
export { localRepository as defaultRepository } from './localRepository';

// Implementation B: Momen / REST Adapter (Uncomment below to swap)
// export { restRepository as defaultRepository } from './restRepository';
