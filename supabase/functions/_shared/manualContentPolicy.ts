// Admin-created tips and tickets must never be generated or settled by jobs.
export function automaticTicketsEnabled(): boolean {
  return false;
}

export function disabledGeneratorResponse(headers: Record<string, string>): Response {
  return new Response(JSON.stringify({
    success: true,
    skipped: true,
    reason: "manual_admin_only",
    created: 0,
  }), { headers: { ...headers, "Content-Type": "application/json" } });
}