import { useState, useEffect, useRef, useCallback } from "react";

const EDGE_FUNCTION_URL =
  "https://tczettddxmlcmhdhgebw.supabase.co/functions/v1/generate-ai-predictions";

export interface AIPredictionResult {
  prediction: string; // e.g. "Home Win", "Draw", "Away Win"
  confidence: number; // 0-100
  predictedScore: string; // e.g. "2-1"
  riskLevel: "Low" | "Medium" | "High";
  analysis?: string;
}

// Simple in-memory cache to avoid refetch spam
const predictionCache = new Map<string, AIPredictionResult>();

interface UseAIPredictionOptions {
  enabled?: boolean; // Only fetch when enabled (e.g., when tab is active)
}

export function useAIPrediction(
  fixtureId: string | number | null,
  options: UseAIPredictionOptions = {}
) {
  const { enabled = true } = options;
  const [data, setData] = useState<AIPredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const hasFetchedRef = useRef(false);

  const fetchPrediction = useCallback(async (id: string, controller: AbortController) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(EDGE_FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fixtureId: id }),
        signal: controller.signal,
      });

      // Silently handle auth / forbidden errors
      if (res.status === 401 || res.status === 403) {
        setError("AI prediction not available");
        return;
      }

      if (!res.ok) {
        setError("AI prediction not available");
        return;
      }

      const json = await res.json().catch(() => null);

      if (!json) {
        setError("AI prediction not available");
        return;
      }

      // Normalize response - edge function may return various shapes
      const result: AIPredictionResult = {
        prediction: json.prediction || json.predicted_winner || "Unknown",
        confidence: json.confidence ?? json.confidence_percent ?? 0,
        predictedScore: json.predicted_score || json.predictedScore || "-",
        riskLevel: normalizeRisk(json.risk_level || json.riskLevel),
        analysis: json.analysis || json.reasoning || undefined,
      };

      predictionCache.set(id, result);
      setData(result);
      setError(null);
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      // Silent fallback - no crash
      setError("AI prediction not available");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Reset state when fixtureId changes
    if (!fixtureId) {
      setData(null);
      setLoading(false);
      setError(null);
      hasFetchedRef.current = false;
      return;
    }

    const cacheKey = String(fixtureId);

    // Return cached result immediately
    if (predictionCache.has(cacheKey)) {
      setData(predictionCache.get(cacheKey)!);
      setLoading(false);
      setError(null);
      return;
    }

    // Only fetch when enabled and hasn't already fetched for this ID
    if (!enabled) {
      return;
    }

    // Abort any previous request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    hasFetchedRef.current = true;
    fetchPrediction(cacheKey, controller);

    return () => {
      controller.abort();
    };
  }, [fixtureId, enabled, fetchPrediction]);

  return { data, loading, error };
}

function normalizeRisk(value: string | undefined): "Low" | "Medium" | "High" {
  if (!value) return "Medium";
  const lower = value.toLowerCase();
  if (lower.includes("low")) return "Low";
  if (lower.includes("high")) return "High";
  return "Medium";
}

// Export cache clearing function
export function clearAIPredictionCache() {
  predictionCache.clear();
}
