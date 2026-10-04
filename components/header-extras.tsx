"use client";

import { useEffect, useState, type ReactNode } from "react";

// The header's right side (social links, theme toggle). It fades in a second
// after the site loads and steps aside once the page scrolls (past 20px), so
// only the tab bar floats over the content, as on chester.how.
export function HeaderExtras({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 20);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    // Two layers: the load-time fade is an animation, which would override a
    // plain opacity change; the scroll fade is a transition on the inner one.
    <div className="fade-in-late shrink-0">
      <div
        className={`flex items-center gap-4 transition-opacity ${scrolled ? "pointer-events-none opacity-0" : "pointer-events-auto"}`}
        // Hidden controls mustn't be reachable by Tab while invisible.
        inert={scrolled}
      >
        {children}
      </div>
    </div>
  );
}
