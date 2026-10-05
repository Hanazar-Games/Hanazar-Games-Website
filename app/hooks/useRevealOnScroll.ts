"use client";

import { useEffect } from "react";

export function useRevealOnScroll() {
  useEffect(() => {
    const pending = new Set(document.querySelectorAll<HTMLElement>("[data-reveal]:not(.revealVisible)"));
    let observer: IntersectionObserver | undefined;
    let fallback: number | undefined;

    const reveal = (node: HTMLElement, animate = true) => {
      if (!pending.delete(node)) return;
      node.classList.remove("revealPending");
      if (animate && !node.matches(":focus-within")) node.classList.add("revealVisible");
      observer?.unobserve(node);
    };
    const handleFocus = () => {
      pending.forEach((node) => {
        if (node.matches(":focus-within")) reveal(node, false);
      });
    };
    const cleanup = () => {
      window.clearTimeout(fallback);
      observer?.disconnect();
      document.removeEventListener("focusin", handleFocus);
      pending.forEach((node) => node.classList.remove("revealPending"));
      pending.clear();
    };

    if (typeof window.IntersectionObserver !== "function" || pending.size === 0) {
      cleanup();
      return;
    }

    try {
      observer = new IntersectionObserver(
        (entries) => {
          // A healthy observer owns offscreen entrances; the timer only guards startup failure.
          window.clearTimeout(fallback);
          entries.forEach((entry) => {
            if (entry.isIntersecting) reveal(entry.target as HTMLElement);
          });
        },
        { threshold: 0, rootMargin: "0px 0px -24px 0px" }
      );
      fallback = window.setTimeout(cleanup, 1800);
      pending.forEach((node) => {
        node.classList.add("revealPending");
        observer!.observe(node);
      });
      document.addEventListener("focusin", handleFocus);
      handleFocus();
    } catch {
      cleanup();
    }

    return cleanup;
  }, []);
}
