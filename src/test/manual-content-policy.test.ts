import { describe, expect, it } from "vitest";
import { automaticTicketsEnabled, disabledGeneratorResponse } from "../../supabase/functions/_shared/manualContentPolicy";

describe("admin-only tips and tickets", () => {
  it("disables automatic ticket settlement", () => {
    expect(automaticTicketsEnabled()).toBe(false);
  });

  it("makes legacy generators skip without creating content", async () => {
    const response = disabledGeneratorResponse({ "Access-Control-Allow-Origin": "*" });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, skipped: true, reason: "manual_admin_only", created: 0 });
  });
});