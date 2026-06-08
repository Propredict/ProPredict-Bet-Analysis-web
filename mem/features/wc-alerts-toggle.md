---
name: WC Match Alerts Toggle
description: Settings toggle (Android only) for World Cup 2026 push notifications; opt-out model via OneSignal tag wc_alerts
type: feature
---
- Toggle in Settings > Push Notifications (Android only), default ON.
- localStorage key: `wc_alerts_enabled` ("false" only when explicitly opted out).
- OneSignal tag: `wc_alerts` set to "true" or "false" (never null) so daily/kickoff push can filter.
- Edge functions `send-worldcup-kickoff-push` and `send-worldcup-daily-push` use OneSignal `filters: [{field:"tag", key:"wc_alerts", relation:"!=", value:"false"}]` — users without the tag still receive.
- PushAction analytics extended with `wc_alerts_enabled` / `wc_alerts_disabled`.