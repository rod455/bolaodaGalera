import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Capacitor } from "@capacitor/core";

const EDGE_ZONE = 30; // px from left edge to start swipe
const MIN_DISTANCE = 80; // px horizontal to trigger back
const MAX_Y_DRIFT = 100; // px vertical tolerance
const EXIT_ROUTES = ["/home", "/auth"];

export function useSwipeBack() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathRef = useRef(location.pathname);

  useEffect(() => {
    pathRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let startX = 0;
    let startY = 0;
    let tracking = false;

    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      if (touch.clientX <= EDGE_ZONE) {
        startX = touch.clientX;
        startY = touch.clientY;
        tracking = true;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!tracking) return;
      tracking = false;

      const touch = e.changedTouches[0];
      if (!touch) return;
      const dx = touch.clientX - startX;
      const dy = Math.abs(touch.clientY - startY);

      if (dx >= MIN_DISTANCE && dy <= MAX_Y_DRIFT) {
        const current = pathRef.current;
        const isExit = EXIT_ROUTES.some((r) => current === r || current === r + "/");
        if (!isExit) {
          navigate(-1);
        }
      }
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [navigate]);
}
