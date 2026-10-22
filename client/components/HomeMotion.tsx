

import { useEffect } from "react";

export function HomeMotion() {
  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>(".mtq-site [data-reveal]");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("mtq-revealed");
          observer.unobserve(entry.target);
        }
      }
    }, { threshold: 0.08 });
    elements.forEach((element) => {
      // No-JS visitors see all content; only animate elements below the initial viewport.
      if (element.getBoundingClientRect().top >= window.innerHeight) {
        element.classList.add("mtq-reveal-ready");
        observer.observe(element);
      }
    });
    return () => { observer.disconnect(); elements.forEach((element) => element.classList.remove("mtq-reveal-ready")); };
  }, []);
  return null;
}
