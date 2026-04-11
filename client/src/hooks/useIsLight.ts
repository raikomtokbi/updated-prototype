import { useState, useEffect } from "react";

export function useIsLight(): boolean {
  const [isLight, setIsLight] = useState<boolean>(
    () => document.documentElement.getAttribute("data-theme") === "light",
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsLight(document.documentElement.getAttribute("data-theme") === "light");
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  return isLight;
}
