import { useEffect } from "react";
import { syncFavoritesTag } from "@/components/AndroidPushModal";

/**
 * Syncs the current favorites set to OneSignal tags for push targeting.
 * This keeps push notification concerns separate from the favorites CRUD logic.
 */
export function useFavoritesPushSync(favorites: Set<string>) {
  useEffect(() => {
    syncFavoritesTag(favorites);
  }, [favorites]);
}
