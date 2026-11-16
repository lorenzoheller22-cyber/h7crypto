import { describe, it, expect } from "vitest";
import { alertState } from "./positions";
describe("alertState", () => {
  it("fires take-profit at or above target", () => { expect(alertState(50, { tp: 50 })).toBe("tp"); expect(alertState(49, { tp: 50 })).toBe(null); });
  it("fires stop-loss at or below negative stop", () => { expect(alertState(-20, { sl: 20 })).toBe("sl"); expect(alertState(-19, { sl: 20 })).toBe(null); });
});
