import * as bufferMod from "buffer";

// Namespace import: works whether "buffer" resolves as ESM or raw CommonJS.
const mod = bufferMod as any;
const Buffer = mod.Buffer ?? mod.default?.Buffer ?? mod.default;

const g = globalThis as any;
if (typeof g.Buffer === "undefined" && Buffer) g.Buffer = Buffer;
if (typeof g.global === "undefined") g.global = globalThis;
if (typeof g.process === "undefined") g.process = { env: {} };

export {};
