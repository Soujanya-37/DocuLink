"use client";

import { useEffect } from "react";

export default function Pwa() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("serviceWorker" in navigator) {
      const register = async () => {
        try {
          const reg = await navigator.serviceWorker.register("/sw.js");
          reg.onupdatefound = () => {
            const installingWorker = reg.installing;
            if (!installingWorker) return;
            installingWorker.onstatechange = () => {
              // optional: notify about updates
            };
          };
        } catch (_) {
          // ignore
        }
      };
      register();
    }
  }, []);

  return null;
}


