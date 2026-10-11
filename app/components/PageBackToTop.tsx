"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useSettingsContext } from "./SettingsContext";
import { useTranslation } from "../hooks/useTranslation";

export default function PageBackToTop() {
  const pathname = usePathname();
  const { settings } = useSettingsContext();
  const { tr } = useTranslation();
  const [visible, setVisible] = useState(false);
  const restoreHeadingRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let frame = 0;
    const sync = () => {
      frame = 0;
      setVisible(window.scrollY > Math.max(640, window.innerHeight));
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(sync);
    };
    sync();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      restoreHeadingRef.current?.();
    };
  }, [pathname]);

  const returnToTop = () => {
    restoreHeadingRef.current?.();
    const heading = document.querySelector<HTMLElement>("main h1");
    if (heading) {
      const previousTabIndex = heading.getAttribute("tabindex");
      if (previousTabIndex === null) heading.setAttribute("tabindex", "-1");
      const restore = () => {
        if (previousTabIndex === null) heading.removeAttribute("tabindex");
        heading.removeEventListener("blur", restore);
        restoreHeadingRef.current = null;
      };
      restoreHeadingRef.current = restore;
      heading.addEventListener("blur", restore, { once: true });
      heading.focus({ preventScroll: true });
    }
    const reduced = !settings.animationsEnabled || settings.reduceAnimations
      || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "instant" : "smooth" });
  };

  return (
    <button className="pageBackToTop" type="button" hidden={!visible} onClick={returnToTop}
      aria-label={tr("backToTop")} title={tr("backToTop")}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 5h14M6 13l6-6 6 6M12 7v13" />
      </svg>
    </button>
  );
}
