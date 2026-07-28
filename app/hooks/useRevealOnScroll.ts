"use client";

import { useEffect } from "react";

export function useRevealOnScroll() {
  useEffect(() => {
    const nodes = document.querySelectorAll<HTMLElement>("[data-reveal]");
    const reveal = (node: HTMLElement) => {
      node.classList.add("revealVisible");
      node.classList.remove("revealPending");
    };

    if (!("IntersectionObserver" in window)) {
      nodes.forEach(reveal);
      return;
    }

    nodes.forEach((node) => node.classList.add("revealPending"));

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            reveal(entry.target as HTMLElement);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.16,
        rootMargin: "0px 0px -10% 0px"
      }
    );

    nodes.forEach((node) => observer.observe(node));
    const fallback = window.setTimeout(() => {
      nodes.forEach(reveal);
      observer.disconnect();
    }, 1800);

    return () => {
      window.clearTimeout(fallback);
      observer.disconnect();
    };
  }, []);
}
