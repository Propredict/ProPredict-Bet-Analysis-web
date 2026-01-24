import { useState, useEffect, useRef } from "react";

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

export function useAIPrediction(fixtureId: string | number | null) {
  const [data, setData] = useState<AIPredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!fixtureId) {
      setData(null);
      setLoading(false);
      setError(null);
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

    // Abort any previous request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const fetchPrediction = async () => {
      setLoading(true);
      setError(null);
      setData(null);

      try {
        const res = await fetch(EDGE_FUNCTION_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ fixtureId: String(fixtureId) }),
          signal: controller.signal,
        });

        // Silently handle auth / forbidden errors
        if (res.status === 401 || res.status === 403) {
          setError(null);
          return;
        }

        if (!res.ok) {
          setError(null); // Silent fallback
          return;
        }

        const json = await res.json().catch(() => null);

        if (!json) {
          setError(null);
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

        predictionCache.set(cacheKey, result);
        setData(result);
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        // Silent fallback - no crash
        setError(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPrediction();

    return () => {
      controller.abort();
    };
  }, [fixtureId]);

  return { data, loading, error };
}

function normalizeRisk(value: string | undefined): "Low" | "Medium" | "High" {
  if (!value) return "Medium";
  const lower = value.toLowerCase();
  if (lower.includes("low")) return "Low";
  if (lower.includes("high")) return "High";
  return "Medium";
}
