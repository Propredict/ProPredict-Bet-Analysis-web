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
  match_date: string | null;
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

    // Get date range - last 3 days to catch any missed updates
    const today = new Date();
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const formatDate = (d: Date) => d.toISOString().split("T")[0];

    // Fetch pending predictions with valid match_date in the last 3 days
    const { data: pendingPredictions, error: fetchError } = await supabase
      .from("ai_predictions")
      .select("id, match_id, prediction, result_status, home_team, away_team, match_date")
      .eq("result_status", "pending")
      .not("match_date", "is", null)
      .gte("match_date", formatDate(threeDaysAgo))
      .lte("match_date", formatDate(today))
      .limit(50); // Process max 50 at a time to avoid timeout

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

    console.log(`Found ${pendingPredictions.length} pending predictions to check`);

    let updatedCount = 0;
    let skippedCount = 0;
    const results: { id: string; status: string; reason: string }[] = [];

    for (const prediction of pendingPredictions as AIPrediction[]) {
      try {
        // Fetch match result from API-Football
        const fixtureId = prediction.match_id;
        
        // Skip if match_id is not a valid number
        if (!fixtureId || isNaN(Number(fixtureId))) {
          console.log(`Skipping invalid match_id: ${fixtureId}`);
          skippedCount++;
          continue;
        }

        const apiUrl = `https://v3.football.api-sports.io/fixtures?id=${fixtureId}`;

        const apiResponse = await fetch(apiUrl, {
          headers: {
            "x-apisports-key": apiFootballKey,
          },
        });

        if (!apiResponse.ok) {
          console.error(`API error for fixture ${fixtureId}:`, apiResponse.status);
          skippedCount++;
          continue;
        }

        const apiData = await apiResponse.json();
        const fixture = apiData.response?.[0] as FixtureResponse | undefined;

        if (!fixture) {
          console.log(`No fixture data for ${fixtureId}`);
          skippedCount++;
          continue;
        }

        // Check if match is finished
        const finishedStatuses = ["FT", "AET", "PEN", "AWD", "WO"];
        if (!finishedStatuses.includes(fixture.fixture.status.short)) {
          console.log(`Match ${fixtureId} not finished yet (${fixture.fixture.status.short})`);
          skippedCount++;
          continue;
        }

        const homeGoals = fixture.goals.home;
        const awayGoals = fixture.goals.away;

        if (homeGoals === null || awayGoals === null) {
          console.log(`No goals data for fixture ${fixtureId}`);
          skippedCount++;
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
            `✓ ${prediction.home_team} vs ${prediction.away_team}: ${newStatus} (predicted ${prediction.prediction}, actual ${actualResult})`
          );

          // Resolve Arena predictions for this finished match
          try {
            const { error: arenaError } = await supabase.rpc("resolve_arena_match", {
              p_match_id: fixtureId,
            });
            if (arenaError) {
              console.error(`Arena resolve error for ${fixtureId}:`, arenaError.message);
            } else {
              console.log(`✓ Arena resolved for match ${fixtureId}`);
            }
          } catch (arenaErr) {
            console.error(`Arena resolve exception for ${fixtureId}:`, arenaErr);
          }
        }

        // Small delay to avoid API rate limiting (100ms)
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (err) {
        console.error(`Error processing prediction ${prediction.id}:`, err);
        results.push({ id: prediction.id, status: "error", reason: String(err) });
      }
    }

    console.log(`Completed: ${updatedCount} updated, ${skippedCount} skipped`);

    return new Response(
      JSON.stringify({
        message: "Prediction results updated",
        total_checked: pendingPredictions.length,
        updated: updatedCount,
        skipped: skippedCount,
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
