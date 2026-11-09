import { Buffer } from "buffer";

const g = globalThis as any;
if (typeof g.Buffer === "undefined") g.Buffer = Buffer;
if (typeof g.global === "undefined") g.global = globalThis;
if (typeof g.process === "undefined") g.process = { env: {} };

export {};
