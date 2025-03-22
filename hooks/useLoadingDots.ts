"use client";

import { useEffect, useState } from "react";

export const useLoadingDots = (loadArgs: boolean[]) => {
  const [loadingDots, setLoadingDots] = useState("");

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (loadArgs.some((arg) => arg)) {
      intervalId = setInterval(() => {
        setLoadingDots((prev) => {
          if (prev.length >= 3) return "";
          return prev + ".";
        });
      }, 500);
    }
    return () => clearInterval(intervalId);
  }, [...loadArgs]);

  return loadingDots;
};
