import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  MemoryRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

/**
 * Mirrors NavigateWithSearch from src/App.tsx — preserves query params
 * when redirecting old deep-link URLs to the new canonical ones.
 */
function NavigateWithSearch({ to }: { to: string }) {
  const location = useLocation();
  return <Navigate to={to + location.search} replace />;
}

function LocationDisplay() {
  const location = useLocation();
  return (
    <div data-testid="location">
      {location.pathname}
      {location.search}
    </div>
  );
}

function Page({ name }: { name: string }) {
  return (
    <>
      <h1>{name}</h1>
      <LocationDisplay />
    </>
  );
}

/**
 * Test harness mirroring the ticket-related route table from src/App.tsx.
 * Keep in sync with App.tsx: any change to these paths must update both.
 */
function TestRouter({ initialPath }: { initialPath: string }) {
  return (
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        {/* Canonical (new) routes */}
        <Route path="/daily-predictions" element={<Page name="Daily Ticket" />} />
        <Route path="/pro-predictions" element={<Page name="Pro Ticket" />} />
        <Route path="/premium-predictions" element={<Page name="Premium Ticket" />} />
        <Route path="/multi-risk-matches" element={<Page name="Risk Ticket" />} />

        {/* Legacy aliases that must redirect to canonical, preserving ?query */}
        <Route
          path="/daily-tickets"
          element={<NavigateWithSearch to="/daily-predictions" />}
        />
        <Route
          path="/exclusive-tickets"
          element={<NavigateWithSearch to="/pro-predictions" />}
        />
        <Route
          path="/premium-tickets"
          element={<NavigateWithSearch to="/premium-predictions" />}
        />

        <Route path="*" element={<h1>Not Found</h1>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("Ticket deep-link routes", () => {
  describe("canonical (new) URLs render the right page", () => {
    it.each([
      ["/daily-predictions", "Daily Ticket"],
      ["/pro-predictions", "Pro Ticket"],
      ["/premium-predictions", "Premium Ticket"],
      ["/multi-risk-matches", "Risk Ticket"],
    ])("%s renders %s", (path, heading) => {
      render(<TestRouter initialPath={path} />);
      expect(
        screen.getByRole("heading", { level: 1, name: heading })
      ).toBeInTheDocument();
      expect(screen.getByTestId("location")).toHaveTextContent(path);
    });
  });

  describe("legacy URLs redirect to canonical and preserve query params", () => {
    it.each([
      ["/daily-tickets", "/daily-predictions", "Daily Ticket"],
      ["/exclusive-tickets", "/pro-predictions", "Pro Ticket"],
      ["/premium-tickets", "/premium-predictions", "Premium Ticket"],
    ])("%s -> %s", (legacy, canonical, heading) => {
      render(<TestRouter initialPath={legacy} />);
      expect(
        screen.getByRole("heading", { level: 1, name: heading })
      ).toBeInTheDocument();
      expect(screen.getByTestId("location")).toHaveTextContent(canonical);
    });

    it.each([
      ["/daily-tickets?utm_source=push", "/daily-predictions?utm_source=push"],
      [
        "/exclusive-tickets?ref=email&id=123",
        "/pro-predictions?ref=email&id=123",
      ],
      [
        "/premium-tickets?utm_campaign=launch",
        "/premium-predictions?utm_campaign=launch",
      ],
    ])("preserves query params: %s -> %s", (legacy, expected) => {
      render(<TestRouter initialPath={legacy} />);
      expect(screen.getByTestId("location")).toHaveTextContent(expected);
    });
  });

  it("unknown ticket URL falls through to NotFound", () => {
    render(<TestRouter initialPath="/some-old-removed-tickets-url" />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Not Found" })
    ).toBeInTheDocument();
  });
});

/**
 * Static guard: ensure the canonical paths above match what App.tsx defines.
 * Reads App.tsx and asserts each canonical Route path is present.
 */
describe("App.tsx route registration", () => {
  it("registers all canonical ticket routes", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const src = await fs.readFile(
      path.resolve(__dirname, "../App.tsx"),
      "utf8"
    );
    for (const p of [
      "/daily-predictions",
      "/pro-predictions",
      "/premium-predictions",
      "/multi-risk-matches",
    ]) {
      expect(src, `Route path ${p} missing from App.tsx`).toContain(
        `path="${p}"`
      );
    }
  });

  it("keeps legacy redirects wired via NavigateWithSearch", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const src = await fs.readFile(
      path.resolve(__dirname, "../App.tsx"),
      "utf8"
    );
    for (const legacy of [
      "/daily-tickets",
      "/exclusive-tickets",
      "/premium-tickets",
    ]) {
      expect(src).toContain(`path="${legacy}"`);
    }
    expect(src).toContain("NavigateWithSearch");
  });
});