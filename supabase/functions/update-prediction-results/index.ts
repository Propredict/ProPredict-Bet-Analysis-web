import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AIPrediction {
  id: string;
  match_id: string;
  prediction: string; // "1", "X", "2"
  result_status: string;
  home_team: string;
  away_team: string;
}

interface FixtureResponse {
  fixture: {
    id: number;
    status: {
      short: string; // "FT", "AET", "PEN" = finished
    };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const apiFootballKey = Deno.env.get("API_FOOTBALL_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch pending predictions from yesterday and today
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const formatDate = (d: Date) => d.toISOString().split("T")[0];

    const { data: pendingPredictions, error: fetchError } = await supabase
      .from("ai_predictions")
      .select("id, match_id, prediction, result_status, home_team, away_team")
      .eq("result_status", "pending")
      .gte("match_date", formatDate(yesterday))
      .lte("match_date", formatDate(today));

    if (fetchError) {
      console.error("Error fetching predictions:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch predictions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!pendingPredictions || pendingPredictions.length === 0) {
      console.log("No pending predictions to update");
      return new Response(
        JSON.stringify({ message: "No pending predictions", updated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${pendingPredictions.length} pending predictions`);

    let updatedCount = 0;
    const results: { id: string; status: string; reason: string }[] = [];

    for (const prediction of pendingPredictions as AIPrediction[]) {
      try {
        // Fetch match result from API-Football
        const fixtureId = prediction.match_id;
        const apiUrl = `https://v3.football.api-sports.io/fixtures?id=${fixtureId}`;

        const apiResponse = await fetch(apiUrl, {
          headers: {
            "x-apisports-key": apiFootballKey,
          },
        });

        if (!apiResponse.ok) {
          console.error(`API error for fixture ${fixtureId}:`, apiResponse.status);
          continue;
        }

        const apiData = await apiResponse.json();
        const fixture = apiData.response?.[0] as FixtureResponse | undefined;

        if (!fixture) {
          console.log(`No fixture data for ${fixtureId}`);
          continue;
        }

        // Check if match is finished
        const finishedStatuses = ["FT", "AET", "PEN", "AWD", "WO"];
        if (!finishedStatuses.includes(fixture.fixture.status.short)) {
          console.log(`Match ${fixtureId} not finished yet (${fixture.fixture.status.short})`);
          continue;
        }

        const homeGoals = fixture.goals.home;
        const awayGoals = fixture.goals.away;

        if (homeGoals === null || awayGoals === null) {
          console.log(`No goals data for fixture ${fixtureId}`);
          continue;
        }

        // Determine actual result: "1" (home win), "X" (draw), "2" (away win)
        let actualResult: string;
        if (homeGoals > awayGoals) {
          actualResult = "1";
        } else if (homeGoals === awayGoals) {
          actualResult = "X";
        } else {
          actualResult = "2";
        }

        // Compare prediction with actual result
        const isWon = prediction.prediction === actualResult;
        const newStatus = isWon ? "won" : "lost";

        // Update the prediction
        const { error: updateError } = await supabase
          .from("ai_predictions")
          .update({ result_status: newStatus })
          .eq("id", prediction.id);

        if (updateError) {
          console.error(`Error updating prediction ${prediction.id}:`, updateError);
          results.push({ id: prediction.id, status: "error", reason: updateError.message });
        } else {
          updatedCount++;
          results.push({
            id: prediction.id,
            status: newStatus,
            reason: `Predicted: ${prediction.prediction}, Actual: ${actualResult} (${homeGoals}-${awayGoals})`,
          });
          console.log(
            `Updated ${prediction.home_team} vs ${prediction.away_team}: ${newStatus} (predicted ${prediction.prediction}, actual ${actualResult})`
          );
        }

        // Small delay to avoid API rate limiting
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (err) {
        console.error(`Error processing prediction ${prediction.id}:`, err);
        results.push({ id: prediction.id, status: "error", reason: String(err) });
      }
    }

    console.log(`Updated ${updatedCount} predictions`);

    return new Response(
      JSON.stringify({
        message: "Prediction results updated",
        total_pending: pendingPredictions.length,
        updated: updatedCount,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
