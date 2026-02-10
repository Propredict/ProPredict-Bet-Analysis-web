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

          // --- Arena: insert FT notifications + resolve predictions ---
          try {
            // Get all users who have arena predictions on this match
            const { data: arenaPreds } = await supabase
              .from("arena_predictions")
              .select("id, user_id, prediction, status, season_id")
              .eq("match_id", fixtureId)
              .eq("status", "pending");

            if (arenaPreds && arenaPreds.length > 0) {
              const matchLabel = `${prediction.home_team} vs ${prediction.away_team}`;

              // Insert FT notifications
              const ftNotifications = arenaPreds.map((ap: any) => ({
                user_id: ap.user_id,
                type: "ft",
                title: "Match finished",
                message: `Match finished: ${matchLabel}. Your prediction is being evaluated.`,
                match_id: fixtureId,
              }));

              await supabase.from("arena_notifications").insert(ftNotifications);
              console.log(`✓ Inserted ${ftNotifications.length} FT notifications for match ${fixtureId}`);

              // Resolve each arena prediction
              for (const ap of arenaPreds) {
                let arenaWon = false;
                const pick = ap.prediction;

                // Match Result picks
                if (["Home", "1"].includes(pick)) arenaWon = homeGoals > awayGoals;
                else if (["Draw", "X"].includes(pick)) arenaWon = homeGoals === awayGoals;
                else if (["Away", "2"].includes(pick)) arenaWon = homeGoals < awayGoals;
                // BTTS picks
                else if (pick === "GG (Yes)") arenaWon = homeGoals > 0 && awayGoals > 0;
                else if (pick === "NG (No)") arenaWon = homeGoals === 0 || awayGoals === 0;
                // Goals picks
                else if (pick === "Over 2.5") arenaWon = (homeGoals + awayGoals) > 2;
                else if (pick === "Under 2.5") arenaWon = (homeGoals + awayGoals) < 3;
                else if (pick === "Over 1.5") arenaWon = (homeGoals + awayGoals) > 1;
                else if (pick === "Under 3.5") arenaWon = (homeGoals + awayGoals) < 4;

                const arenaStatus = arenaWon ? "won" : "lost";

                // Update arena prediction status
                const { error: arenaUpdateErr } = await supabase
                  .from("arena_predictions")
                  .update({ status: arenaStatus })
                  .eq("id", ap.id);

                if (arenaUpdateErr) {
                  console.error(`❌ Arena update FAILED for ${ap.id}:`, arenaUpdateErr);
                }

                // Insert WIN/LOSS notification
                if (arenaWon) {
                  await supabase.from("arena_notifications").insert({
                    user_id: ap.user_id,
                    type: "win",
                    title: "You won! 🎉",
                    message: `Your prediction ${pick} was correct. +1 point added to your Arena score.`,
                    match_id: fixtureId,
                  });
                } else {
                  await supabase.from("arena_notifications").insert({
                    user_id: ap.user_id,
                    type: "loss",
                    title: "Prediction lost ❌",
                    message: `Your prediction ${pick} was not correct. Better luck next match!`,
                    match_id: fixtureId,
                  });
                }

                // Update arena user stats + check for 100-point reward
                const apSeasonId = (ap as any).season_id;
                if (arenaWon) {
                  const { data: stats } = await supabase
                    .from("arena_user_stats")
                    .select("id, points, wins, reward_granted")
                    .eq("user_id", ap.user_id)
                    .eq("season_id", apSeasonId)
                    .maybeSingle();

                  if (stats) {
                    const newPoints = stats.points + 1;
                    await supabase
                      .from("arena_user_stats")
                      .update({ points: newPoints, wins: stats.wins + 1 })
                      .eq("id", stats.id);

                    // Auto-grant free Pro month at 100 points (once per season)
                    if (newPoints >= 100 && !stats.reward_granted) {
                      // Mark reward as granted + log in arena_rewards
                      await supabase
                        .from("arena_user_stats")
                        .update({ reward_granted: true })
                        .eq("id", stats.id);

                      // Insert arena_rewards record
                      const { data: seasonData } = await supabase
                        .from("arena_user_stats")
                        .select("season_id")
                        .eq("id", stats.id)
                        .single();

                      if (seasonData) {
                        await supabase.from("arena_rewards").insert({
                          user_id: ap.user_id,
                          season_id: seasonData.season_id,
                          reward_type: "free_pro_month",
                        });
                      }

                      // Extend or create Pro subscription for 30 days
                      const expiresAt = new Date();
                      expiresAt.setDate(expiresAt.getDate() + 30);

                      const { data: existingSub } = await supabase
                        .from("user_subscriptions")
                        .select("id, plan, expires_at, status")
                        .eq("user_id", ap.user_id)
                        .maybeSingle();

                      if (existingSub) {
                        // Extend current plan by 30 days (never downgrade)
                        const currentPlan = (existingSub.plan === "free" || existingSub.status !== "active") ? "basic" : existingSub.plan;
                        const baseDate = existingSub.expires_at && new Date(existingSub.expires_at) > new Date() ? new Date(existingSub.expires_at) : new Date();
                        baseDate.setDate(baseDate.getDate() + 30);

                        await supabase
                          .from("user_subscriptions")
                          .update({
                            plan: currentPlan,
                            status: "active",
                            expires_at: baseDate.toISOString(),
                            source: "arena_reward",
                          })
                          .eq("id", existingSub.id);
                        console.log(`🎉 Arena reward: extended ${currentPlan} by 30 days for ${ap.user_id}`);
                      } else {
                        // No subscription row — create one
                        await supabase
                          .from("user_subscriptions")
                          .insert({
                            user_id: ap.user_id,
                            plan: "basic",
                            status: "active",
                            expires_at: expiresAt.toISOString(),
                          });
                        console.log(`🎉 Arena reward: created free Pro month for ${ap.user_id}`);
                      }

                      // Send reward notification
                      await supabase.from("arena_notifications").insert({
                        user_id: ap.user_id,
                        type: "win",
                        title: "🎉 Free Pro Month Unlocked!",
                        message: "Congratulations! You reached 100 Arena points and earned a free Pro month. Enjoy Pro access for 30 days!",
                        match_id: fixtureId,
                      });
                    }
                  }
                } else {
                  const { data: stats } = await supabase
                    .from("arena_user_stats")
                    .select("id, losses")
                    .eq("user_id", ap.user_id)
                    .eq("season_id", apSeasonId)
                    .maybeSingle();

                  if (stats) {
                    await supabase
                      .from("arena_user_stats")
                      .update({ losses: stats.losses + 1 })
                      .eq("id", stats.id);
                  }
                }

                console.log(`✓ Arena ${ap.user_id}: ${pick} → ${arenaStatus}`);
              }
            }
          } catch (arenaErr) {
            console.error(`Arena resolve/notify error for ${fixtureId}:`, arenaErr);
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

    // ── SECOND PASS: resolve ALL pending arena predictions directly via API ──
    // No longer depends on ai_predictions being resolved first
    let arenaOrphanResolved = 0;
    try {
      const { data: orphanedArena } = await supabase
        .from("arena_predictions")
        .select("id, user_id, match_id, prediction, status, season_id")
        .eq("status", "pending")
        .limit(100);

      if (orphanedArena && orphanedArena.length > 0) {
        // Get team names from ai_predictions for notifications (best effort)
        const orphanMatchIds = [...new Set(orphanedArena.map((a: any) => a.match_id))];
        const { data: matchInfoData } = await supabase
          .from("ai_predictions")
          .select("match_id, home_team, away_team")
          .in("match_id", orphanMatchIds);

        const matchInfoMap = new Map((matchInfoData || []).map((a: any) => [a.match_id, a]));

        for (const ap of orphanedArena) {
          try {
            const fixtureId = ap.match_id;
            if (!fixtureId || isNaN(Number(fixtureId))) continue;

            const apiUrl = `https://v3.football.api-sports.io/fixtures?id=${fixtureId}`;
            const apiResp = await fetch(apiUrl, {
              headers: { "x-apisports-key": apiFootballKey },
            });

            if (!apiResp.ok) continue;
            const apiJson = await apiResp.json();
            const fix = apiJson.response?.[0] as FixtureResponse | undefined;
            if (!fix) continue;

            const finStatuses = ["FT", "AET", "PEN", "AWD", "WO"];
            if (!finStatuses.includes(fix.fixture.status.short)) continue;

            const hg = fix.goals.home;
            const ag = fix.goals.away;
            if (hg === null || ag === null) continue;

            // Evaluate pick
            const pick = ap.prediction;
            let arenaWon = false;
            if (["Home", "1"].includes(pick)) arenaWon = hg > ag;
            else if (["Draw", "X"].includes(pick)) arenaWon = hg === ag;
            else if (["Away", "2"].includes(pick)) arenaWon = hg < ag;
            else if (pick === "GG (Yes)") arenaWon = hg > 0 && ag > 0;
            else if (pick === "NG (No)") arenaWon = hg === 0 || ag === 0;
            else if (pick === "Over 2.5") arenaWon = (hg + ag) > 2;
            else if (pick === "Under 2.5") arenaWon = (hg + ag) < 3;

            const arenaStatus = arenaWon ? "won" : "lost";

            const { error: orphanUpdateErr, count: orphanUpdateCount } = await supabase
              .from("arena_predictions")
              .update({ status: arenaStatus })
              .eq("id", ap.id)
              .select("id");

            if (orphanUpdateErr) {
              console.error(`❌ Orphan arena update FAILED for ${ap.id}:`, orphanUpdateErr);
            } else {
              console.log(`✓ Orphan arena update OK for ${ap.id}: ${arenaStatus}`);

              // Notifications
              const matchInfo = matchInfoMap.get(ap.match_id);
              const matchLabel = matchInfo ? `${matchInfo.home_team} vs ${matchInfo.away_team}` : `Fixture ${ap.match_id}`;

              await supabase.from("arena_notifications").insert([
                {
                  user_id: ap.user_id,
                  type: "ft",
                  title: "Match finished",
                  message: `Match finished: ${matchLabel} (${hg}-${ag}). Your prediction has been evaluated.`,
                  match_id: fixtureId,
                },
                {
                  user_id: ap.user_id,
                  type: arenaWon ? "win" : "loss",
                  title: arenaWon ? "You won! 🎉" : "Prediction lost ❌",
                  message: arenaWon
                    ? `Your prediction ${pick} was correct. +1 point added to your Arena score.`
                    : `Your prediction ${pick} was not correct. Better luck next match!`,
                  match_id: fixtureId,
                },
              ]);

              // Update arena_user_stats (filter by season_id to avoid maybeSingle conflicts)
              const seasonId = (ap as any).season_id;
              if (arenaWon) {
                const { data: stats } = await supabase
                  .from("arena_user_stats")
                  .select("id, points, wins")
                  .eq("user_id", ap.user_id)
                  .eq("season_id", seasonId)
                  .maybeSingle();
                if (stats) {
                  await supabase
                    .from("arena_user_stats")
                    .update({ points: stats.points + 1, wins: stats.wins + 1 })
                    .eq("id", stats.id);
                }
              } else {
                const { data: stats } = await supabase
                  .from("arena_user_stats")
                  .select("id, losses")
                  .eq("user_id", ap.user_id)
                  .eq("season_id", seasonId)
                  .maybeSingle();
                if (stats) {
                  await supabase
                    .from("arena_user_stats")
                    .update({ losses: stats.losses + 1 })
                    .eq("id", stats.id);
                }
              }

              arenaOrphanResolved++;
              console.log(`✓ Orphan arena ${ap.user_id}: ${pick} → ${arenaStatus} (${matchLabel}, ${hg}-${ag})`);
            }
            await new Promise((resolve) => setTimeout(resolve, 100));
          } catch (orphanErr) {
            console.error(`Orphan arena error for ${ap.id}:`, orphanErr);
          }
        }
      }
    } catch (orphanPassErr) {
      console.error("Orphan arena pass error:", orphanPassErr);
    }

    if (arenaOrphanResolved > 0) {
      console.log(`Orphan arena pass: ${arenaOrphanResolved} resolved`);
    }

    return new Response(
      JSON.stringify({
        message: "Prediction results updated",
        total_checked: pendingPredictions.length,
        updated: updatedCount,
        skipped: skippedCount,
        arena_orphans_resolved: arenaOrphanResolved,
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
