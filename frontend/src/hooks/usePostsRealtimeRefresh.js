import { useEffect } from "react";
import socketClient from "../services/socket.js";

/**
 * Re-runs `refetch` whenever the backend broadcasts a `data_invalidate` for
 * the 'posts' scope on this brand — e.g. SocialPublishStep marking a
 * PostTarget PUBLISHED/FAILED as it happens, so planner views showing
 * publishProgress ("N/M platforms published") pick up each per-platform
 * update instead of only refreshing on the next manual action.
 */
export function usePostsRealtimeRefresh(brandId, refetch) {
  useEffect(() => {
    if (!brandId || !refetch) return;

    // Server only broadcasts to sockets that joined this brand's room (see
    // socket.manager.js's checkBrandAccess-gated join_room handler) — most
    // pages never join it themselves, so join here rather than assuming
    // some other component on the page already did.
    socketClient.emit("join_room", { brandId });

    const handleInvalidate = ({ scope, brandId: eventBrandId }) => {
      if (scope === "posts" && eventBrandId === brandId) {
        refetch();
      }
    };

    socketClient.on("data_invalidate", handleInvalidate);
    return () => socketClient.off("data_invalidate", handleInvalidate);
  }, [brandId, refetch]);
}
