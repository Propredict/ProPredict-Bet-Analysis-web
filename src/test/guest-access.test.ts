import { describe, it, expect } from "vitest";
import { guestCanView } from "@/lib/guestAccess";

describe("guest access (signed-out visitors)", () => {
  it("web guests can see Free and Daily tips/tickets", () => {
    expect(guestCanView("free", false)).toBe(true);
    expect(guestCanView("daily", false)).toBe(true);
  });

  it("web guests cannot see Pro or Premium content", () => {
    expect(guestCanView("exclusive", false)).toBe(false);
    expect(guestCanView("premium", false)).toBe(false);
  });

  it("Android guests must still sign in", () => {
    expect(guestCanView("free", true)).toBe(false);
    expect(guestCanView("daily", true)).toBe(false);
  });
});
