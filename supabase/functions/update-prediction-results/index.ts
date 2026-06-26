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
  predicted_score?: string | null;
  analysis?: string | null;
  result_status: string;
  home_team: string;
  away_team: string;
  match_date: string | null;
  league?: string | null;
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
      .select("id, match_id, prediction, predicted_score, analysis, result_status, home_team, away_team, match_date, league")
      .eq("result_status", "pending")
      .not("match_date", "is", null)
      .gte("match_date", formatDate(threeDaysAgo))
      .lte("match_date", formatDate(today))
      .order("match_date", { ascending: false })
      .limit(200); // Process enough rows so WC finished picks are not hidden behind old skipped rows

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

        // Universal market evaluator (Over/Under, BTTS, 1X2, Double Chance, combos)
        const evalLegAI = (leg: string, h: number, a: number): boolean | null => {
          const t = h + a;
          const btts = h > 0 && a > 0;
          const s = leg.trim();
          let m: RegExpMatchArray | null;
          if ((m = s.match(/^Over\s+(\d+(?:\.\d+)?)/i))) return t > parseFloat(m[1]);
          if ((m = s.match(/^Under\s+(\d+(?:\.\d+)?)/i))) return t < parseFloat(m[1]);
          if (/^BTTS\s*No/i.test(s) || /^GG\s*No/i.test(s) || /^NG/i.test(s)) return !btts;
          if (/^BTTS/i.test(s) || /^GG/i.test(s)) return btts;
          if (/^1X/i.test(s)) return h >= a;
          if (/^X2/i.test(s)) return a >= h;
          if (/^12/i.test(s)) return h !== a;
          if (/^Home/i.test(s) || /^\s*1\s*$/.test(s)) return h > a;
          if (/^Away/i.test(s) || /^\s*2\s*$/.test(s)) return a > h;
          if (/^Draw/i.test(s) || /^\s*X\s*$/.test(s)) return h === a;
          return null;
        };
        const evalComboAI = (label: string, h: number, a: number): boolean | null => {
          const legs = label.split(/\s*&\s*/);
          let allWon = true;
          for (const l of legs) {
            const r = evalLegAI(l, h, a);
            if (r === null) return null;
            if (!r) allWon = false;
          }
          return allWon;
        };
        const isWorldCup = /world\s*cup/i.test(String(prediction.league ?? ""));
        let evalResult = evalComboAI(String(prediction.prediction ?? ""), homeGoals, awayGoals);

        // World Cup finished rule: moving Live → Finished must only evaluate
        // the frozen displayed markets (Over/Under or BTTS). Correct 1X2/DC
        // alone must never create a WIN, and no prediction fields are changed.
        if (isWorldCup) {
          const text = `${prediction.prediction || ""} ${prediction.analysis || ""}`.toLowerCase();
          const goals = text.match(/(over|under)\s*(1\.?5|2\.?5|3\.?5)/);
          const bttsYes = /btts[^.]*\byes\b|\byes\s+btts\b|both teams to score[^.]*yes|\bgg\b/.test(text);
          const bttsNo = /btts[^.]*\bno\b|\bno\s+btts\b|both teams to score[^.]*no|\bng\b/.test(text);
          const marketHits: boolean[] = [];
          const total = homeGoals + awayGoals;
          const bttsActual = homeGoals > 0 && awayGoals > 0;
          if (goals) {
            const line = parseFloat(goals[2].replace(/(\d)(\d)/, "$1.$2"));
            marketHits.push(goals[1] === "over" ? total > line : total < line);
          }
          if (bttsYes || bttsNo) marketHits.push(bttsYes ? bttsActual : !bttsActual);
          if (marketHits.length === 0 && prediction.predicted_score) {
            const score = prediction.predicted_score.match(/(\d+)\s*[-–:]\s*(\d+)/);
            if (score) {
              const ph = parseInt(score[1], 10);
              const pa = parseInt(score[2], 10);
              marketHits.push(ph + pa >= 3 ? total > 2.5 : total < 2.5);
              marketHits.push(ph >= 1 && pa >= 1 ? bttsActual : !bttsActual);
            }
          }
          evalResult = marketHits.length > 0 ? marketHits.some(Boolean) : false;
        }

        if (evalResult === null) {
          // Unrecognized market — fall back to 1X2 comparison
          const isWon = prediction.prediction === actualResult;
          var newStatus = isWon ? "won" : "lost";
        } else {
          var newStatus = evalResult ? "won" : "lost";
        }

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

          // --- WC26 win push: notify all users when a World Cup AI pick WINS ---
          try {
            const leagueStr = (prediction.league ?? "").toLowerCase();
            const isWorldCup = /world\s*cup/.test(leagueStr);
            if (newStatus === "won" && isWorldCup) {
              await supabase.functions.invoke("send-win-push", {
                body: {
                  type: "wc_pick",
                  record: {
                    id: prediction.id,
                    result: "won",
                    tier: "free",
                    home_team: prediction.home_team,
                    away_team: prediction.away_team,
                    league: prediction.league,
                    prediction: prediction.prediction,
                    score: `${homeGoals}-${awayGoals}`,
                  },
                },
              });
              console.log(`📣 WC win push dispatched for ${prediction.home_team} vs ${prediction.away_team}`);
            }
          } catch (pushErr) {
            console.error("WC win push error:", pushErr);
          }

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

                const arenaStatus = arenaWon ? "win" : "loss";

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
                    .select("id, points, wins, current_streak, reward_granted")
                    .eq("user_id", ap.user_id)
                    .eq("season_id", apSeasonId)
                    .maybeSingle();

                  if (stats) {
                    const newPoints = stats.points + 1;
                    const newStreak = (stats.current_streak ?? 0) + 1;
                    await supabase
                      .from("arena_user_stats")
                      .update({ points: newPoints, wins: stats.wins + 1, current_streak: newStreak })
                      .eq("id", stats.id);

                    // Auto-grant free Pro month at 1000 points
                    if (newPoints >= 1000 && !stats.reward_granted) {
                      // Mark reward as granted + reset points to 0 for new cycle
                      await supabase
                        .from("arena_user_stats")
                        .update({ reward_granted: true, points: 0 })
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
                            subscription_source: "arena_reward",
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
                            subscription_source: "arena_reward",
                          });
                        console.log(`🎉 Arena reward: created free Pro month for ${ap.user_id}`);
                      }

                      // Send reward notification
                      await supabase.from("arena_notifications").insert({
                        user_id: ap.user_id,
                        type: "win",
                        title: "🎉 Free Pro Month Unlocked!",
                        message: "Congratulations! You reached 1000 Arena points and earned a free Pro month. Your points have been reset — start a new cycle!",
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
                      .update({ losses: stats.losses + 1, current_streak: 0 })
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
    let arenaOrphanFound = 0;
    const orphanDiag: string[] = [];
    try {
      const { data: orphanedArena, error: orphanFetchErr } = await supabase
        .from("arena_predictions")
        .select("id, user_id, match_id, prediction, status, season_id")
        .eq("status", "pending")
        .limit(100);

      arenaOrphanFound = orphanedArena?.length ?? 0;
      if (orphanFetchErr) orphanDiag.push(`fetch_error: ${orphanFetchErr.message}`);

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
            if (!fixtureId || isNaN(Number(fixtureId))) {
              orphanDiag.push(`${fixtureId}: invalid_id`);
              continue;
            }

            const apiUrl = `https://v3.football.api-sports.io/fixtures?id=${fixtureId}`;
            const apiResp = await fetch(apiUrl, {
              headers: { "x-apisports-key": apiFootballKey },
            });

            if (!apiResp.ok) {
              orphanDiag.push(`${fixtureId}: api_error_${apiResp.status}`);
              continue;
            }
            const apiJson = await apiResp.json();
            const fix = apiJson.response?.[0] as FixtureResponse | undefined;
            if (!fix) {
              orphanDiag.push(`${fixtureId}: no_fixture_data`);
              continue;
            }

            const finStatuses = ["FT", "AET", "PEN", "AWD", "WO"];
            if (!finStatuses.includes(fix.fixture.status.short)) {
              orphanDiag.push(`${fixtureId}: status_${fix.fixture.status.short}`);
              continue;
            }

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

            const arenaStatus = arenaWon ? "win" : "loss";

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
                  .select("id, points, wins, current_streak")
                  .eq("user_id", ap.user_id)
                  .eq("season_id", seasonId)
                  .maybeSingle();
                if (stats) {
                  await supabase
                    .from("arena_user_stats")
                    .update({ points: stats.points + 1, wins: stats.wins + 1, current_streak: (stats.current_streak ?? 0) + 1 })
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
                    .update({ losses: stats.losses + 1, current_streak: 0 })
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

    // ── THIRD PASS: resolve ALL AI-generated TIPS (won/lost) ──
    // Any tip with created_by=NULL is AI-published (Diamond Pick, Risk of the Day,
    // standard daily/exclusive/premium). Use the tip's own match_id when present;
    // otherwise fall back to matching ai_predictions by (home_team|away_team|tip_date).
    let tipsResolved = 0;
    let tipsSkipped = 0;
    try {
      const todayStr = formatDate(today);
      const { data: pendingTips } = await supabase
        .from("tips")
        .select("id, home_team, away_team, prediction, tip_date, result, status, category, created_by, match_id")
        .eq("status", "published")
        .eq("result", "pending")
        .is("created_by", null)
        .gte("tip_date", formatDate(threeDaysAgo))
        .lte("tip_date", todayStr)
        .limit(100);

      if (pendingTips && pendingTips.length > 0) {
        // Lookup helper: combo leg evaluator
        const evalLeg = (leg: string, h: number, a: number): boolean => {
          const t = h + a;
          const btts = h > 0 && a > 0;
          const s = leg.trim();
          let m: RegExpMatchArray | null;
          if ((m = s.match(/^Over\s+(\d+(?:\.\d+)?)/i))) return t > parseFloat(m[1]);
          if ((m = s.match(/^Under\s+(\d+(?:\.\d+)?)/i))) return t < parseFloat(m[1]);
          if (/^BTTS\s*No/i.test(s)) return !btts;
          if (/^BTTS/i.test(s)) return btts;
          if (/^1X/i.test(s)) return h >= a;
          if (/^X2/i.test(s)) return a >= h;
          if (/^12/i.test(s)) return h !== a;
          if (/^Home/i.test(s)) return h > a;
          if (/^Away/i.test(s)) return a > h;
          if (/^Draw/i.test(s)) return h === a;
          return false;
        };
        const evalCombo = (label: string, h: number, a: number): boolean => {
          const s = label.trim();
          // Risk of the Day: "1/3 (Home or Away)" — wins if not a draw
          if (/^1\s*\/\s*3/.test(s) || /Home\s+or\s+Away/i.test(s)) return h !== a;
          const legs = s.split(/\s*&\s*/);
          return legs.every((l) => evalLeg(l, h, a));
        };

        // Build (home_team|away_team|tip_date) -> match_id map from ai_predictions
        const teamPairs = pendingTips.map((t: any) =>
          `${(t.home_team ?? "").toLowerCase()}|${(t.away_team ?? "").toLowerCase()}|${t.tip_date}`
        );
        const dates = [...new Set(pendingTips.map((t: any) => t.tip_date))];
        const { data: aiRows } = await supabase
          .from("ai_predictions")
          .select("match_id, home_team, away_team, match_date")
          .in("match_date", dates);
        const aiMap = new Map<string, string>();
        for (const r of aiRows ?? []) {
          const key = `${(r.home_team ?? "").toLowerCase()}|${(r.away_team ?? "").toLowerCase()}|${r.match_date}`;
          if (r.match_id) aiMap.set(key, String(r.match_id));
        }

        for (const tip of pendingTips as any[]) {
          try {
            const key = `${(tip.home_team ?? "").toLowerCase()}|${(tip.away_team ?? "").toLowerCase()}|${tip.tip_date}`;
            const fixtureId = (tip.match_id && !isNaN(Number(tip.match_id)))
              ? String(tip.match_id)
              : aiMap.get(key);
            if (!fixtureId || isNaN(Number(fixtureId))) { tipsSkipped++; continue; }

            const apiResp = await fetch(`https://v3.football.api-sports.io/fixtures?id=${fixtureId}`, {
              headers: { "x-apisports-key": apiFootballKey },
            });
            if (!apiResp.ok) { tipsSkipped++; continue; }
            const apiJson = await apiResp.json();
            const fix = apiJson.response?.[0] as FixtureResponse | undefined;
            if (!fix) { tipsSkipped++; continue; }
            const finStatuses = ["FT", "AET", "PEN", "AWD", "WO"];
            if (!finStatuses.includes(fix.fixture.status.short)) { tipsSkipped++; continue; }
            const hg = fix.goals.home, ag = fix.goals.away;
            if (hg === null || ag === null) { tipsSkipped++; continue; }

            const won = evalCombo(String(tip.prediction ?? ""), hg, ag);
            // Policy: only mark WON publicly. If lost → leave as pending (silent).
            if (won) {
              const { error: tipUpdErr } = await supabase
                .from("tips")
                .update({ result: "won" })
                .eq("id", tip.id);
              if (!tipUpdErr) {
                tipsResolved++;
                console.log(`✓ Tip [${tip.category ?? "standard"}] ${tip.home_team} vs ${tip.away_team} [${tip.prediction}] (${hg}-${ag}) → won`);
              }
            } else {
              tipsSkipped++;
              console.log(`· Tip ${tip.home_team} vs ${tip.away_team} lost — kept as pending`);
            }
            await new Promise((r) => setTimeout(r, 100));
          } catch (e) {
            console.error(`Tip resolve error ${tip.id}:`, e);
          }
        }
      }
    } catch (tipsErr) {
      console.error("Tips pass error:", tipsErr);
    }
    if (tipsResolved > 0) console.log(`Tips pass: ${tipsResolved} resolved, ${tipsSkipped} skipped`);

    // ── FOURTH PASS: resolve TICKETS (won/lost) ──
    // A ticket is WON only if ALL legs win. If any leg can't be evaluated
    // (e.g. unrecognized market label) or any match isn't finished yet, skip.
    let ticketsResolved = 0;
    let ticketsSkipped = 0;
    try {
      const todayStr = formatDate(today);
      const { data: pendingTickets } = await supabase
        .from("tickets")
        .select("id, ticket_date, status, result, matches:ticket_matches(id, home_team, away_team, match_date, prediction)")
        .eq("status", "published")
        .eq("result", "pending")
        .gte("ticket_date", formatDate(threeDaysAgo))
        .lte("ticket_date", todayStr)
        .limit(50);

      if (pendingTickets && pendingTickets.length > 0) {
        // Reuse leg evaluator (same as Diamond tips). Returns null if unrecognized.
        const evalLegT = (leg: string, h: number, a: number): boolean | null => {
          const t = h + a;
          const btts = h > 0 && a > 0;
          const s = leg.trim();
          let m: RegExpMatchArray | null;
          if ((m = s.match(/^Over\s+(\d+(?:\.\d+)?)/i))) return t > parseFloat(m[1]);
          if ((m = s.match(/^Under\s+(\d+(?:\.\d+)?)/i))) return t < parseFloat(m[1]);
          if (/^BTTS\s*No/i.test(s) || /^GG\s*No/i.test(s) || /^NG/i.test(s)) return !btts;
          if (/^BTTS/i.test(s) || /^GG/i.test(s)) return btts;
          if (/^1X/i.test(s)) return h >= a;
          if (/^X2/i.test(s)) return a >= h;
          if (/^12/i.test(s)) return h !== a;
          if (/^Home/i.test(s) || /^\s*1\s*$/.test(s)) return h > a;
          if (/^Away/i.test(s) || /^\s*2\s*$/.test(s)) return a > h;
          if (/^Draw/i.test(s) || /^\s*X\s*$/.test(s)) return h === a;
          return null;
        };
        const evalComboT = (label: string, h: number, a: number): boolean | null => {
          const legs = label.split(/\s*&\s*/);
          let allWon = true;
          for (const l of legs) {
            const r = evalLegT(l, h, a);
            if (r === null) return null;
            if (!r) allWon = false;
          }
          return allWon;
        };

        // Bulk lookup match_id by team+date from ai_predictions
        const allMatchDates = new Set<string>();
        for (const t of pendingTickets) {
          for (const mm of (t as any).matches ?? []) {
            if (mm.match_date) allMatchDates.add(mm.match_date);
          }
        }
        const { data: aiRowsT } = await supabase
          .from("ai_predictions")
          .select("match_id, home_team, away_team, match_date")
          .in("match_date", [...allMatchDates]);
        const aiMapT = new Map<string, string>();
        for (const r of aiRowsT ?? []) {
          const k = `${(r.home_team ?? "").toLowerCase()}|${(r.away_team ?? "").toLowerCase()}|${r.match_date}`;
          if (r.match_id) aiMapT.set(k, String(r.match_id));
        }

        // Fixture cache to avoid duplicate API calls within this run
        const fixtureCache = new Map<string, { hg: number; ag: number; finished: boolean }>();
        const getFixture = async (fid: string) => {
          if (fixtureCache.has(fid)) return fixtureCache.get(fid)!;
          const apiResp = await fetch(`https://v3.football.api-sports.io/fixtures?id=${fid}`, {
            headers: { "x-apisports-key": apiFootballKey },
          });
          if (!apiResp.ok) { const v = { hg: 0, ag: 0, finished: false }; fixtureCache.set(fid, v); return v; }
          const j = await apiResp.json();
          const f = j.response?.[0];
          const finStatuses = ["FT", "AET", "PEN", "AWD", "WO"];
          const finished = !!f && finStatuses.includes(f.fixture?.status?.short);
          const v = { hg: Number(f?.goals?.home ?? 0), ag: Number(f?.goals?.away ?? 0), finished: finished && f?.goals?.home != null && f?.goals?.away != null };
          fixtureCache.set(fid, v);
          await new Promise((r) => setTimeout(r, 100));
          return v;
        };

        for (const ticket of pendingTickets as any[]) {
          try {
            const matches = ticket.matches ?? [];
            if (matches.length === 0) { ticketsSkipped++; continue; }

            let allFinished = true;
            let unevaluable = false;
            let allLegsWon = true;

            for (const mm of matches) {
              const k = `${(mm.home_team ?? "").toLowerCase()}|${(mm.away_team ?? "").toLowerCase()}|${mm.match_date}`;
              const fid = aiMapT.get(k);
              if (!fid || isNaN(Number(fid))) { allFinished = false; break; }
              const fx = await getFixture(fid);
              if (!fx.finished) { allFinished = false; break; }
              const r = evalComboT(String(mm.prediction ?? ""), fx.hg, fx.ag);
              if (r === null) { unevaluable = true; break; }
              if (!r) allLegsWon = false;
            }

            if (!allFinished || unevaluable) { ticketsSkipped++; continue; }

            // Policy: only mark WON publicly. If lost → leave as pending (silent).
            if (allLegsWon) {
              const { error: tkUpdErr } = await supabase
                .from("tickets")
                .update({ result: "won" })
                .eq("id", ticket.id);
              if (!tkUpdErr) {
                ticketsResolved++;
                console.log(`✓ Ticket ${ticket.id} (${matches.length} legs) → won`);
              }
            } else {
              ticketsSkipped++;
              console.log(`· Ticket ${ticket.id} lost — kept as pending (display policy)`);
            }
          } catch (e) {
            console.error(`Ticket resolve error ${ticket.id}:`, e);
          }
        }
      }
    } catch (tkErr) {
      console.error("Tickets pass error:", tkErr);
    }
    if (ticketsResolved > 0) console.log(`Tickets pass: ${ticketsResolved} resolved, ${ticketsSkipped} skipped`);

    return new Response(
      JSON.stringify({
        message: "Prediction results updated",
        total_checked: pendingPredictions.length,
        updated: updatedCount,
        skipped: skippedCount,
        arena_orphans_found: arenaOrphanFound,
        arena_orphans_resolved: arenaOrphanResolved,
        arena_orphan_diag: orphanDiag,
        tips_resolved: tipsResolved,
        tips_skipped: tipsSkipped,
        tickets_resolved: ticketsResolved,
        tickets_skipped: ticketsSkipped,
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
