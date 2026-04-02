
1. **Update DB trigger `notify_tip_won`** — Add `category` field to the payload sent to the edge function
2. **Update edge function `send-win-push`** — Add special headlines for `diamond_pick` ("💎 Diamond Pick WON!") and `risk_of_day` ("🎯 Risk of the Day WON!"), with FOMO variants for users without access. Also update body text and nav_path routing.
