"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { hadAccount, promptDismissed, rememberHadAccount, rememberPromptDismissed } from "@/lib/sign-up-memory";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

/** The empty marker the article page puts right after the body. */
export const ARTICLE_END_ID = "article-end";

/** An article that fits on the screen shows the prompt after this long instead. */
const SHORT_ARTICLE_DELAY_MS = 15_000;

// A gentle, dismissible invitation to make an account, once the reader has
// finished the article (CLAUDE.md: never a pop-up, never on page load). It
// appears, above Comments, only when:
//   - the reader has scrolled to the end of the body (the #article-end marker
//     comes into view after a scroll), or, for an article that fits on the
//     screen, after 15 seconds on the page;
//   - nobody is signed in, and nobody ever has been on this browser;
//   - the reader hasn't chosen "Not now" before (remembered in the browser).
// On since Phase 5, when comments gave an account a purpose.
export function SignUpPrompt({ slug }: { slug: string }) {
  const [visible, setVisible] = useState(false);
  const headingId = useId();

  useEffect(() => {
    if (promptDismissed() || hadAccount()) return;
    let cancelled = false;
    let observer: IntersectionObserver | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let scrolled = window.scrollY > 0; // e.g. the browser restored a scroll position
    const onScroll = () => {
      scrolled = true;
    };

    const show = () => {
      if (cancelled || promptDismissed() || hadAccount()) return;
      setVisible(true);
      observer?.disconnect();
      clearTimeout(timer);
    };

    createSupabaseBrowserClient()
      .auth.getSession()
      .then(({ data }) => {
        if (cancelled) return;
        if (data.session) return rememberHadAccount();
        const end = document.getElementById(ARTICLE_END_ID);
        if (!end) return;

        if (end.getBoundingClientRect().top <= window.innerHeight && window.scrollY === 0) {
          // The whole article fits on the screen: give it time to be read.
          timer = setTimeout(show, SHORT_ARTICLE_DELAY_MS);
        } else {
          window.addEventListener("scroll", onScroll, { passive: true });
          observer = new IntersectionObserver((entries) => {
            if (scrolled && entries.some((entry) => entry.isIntersecting)) show();
          });
          observer.observe(end);
        }
      });

    return () => {
      cancelled = true;
      observer?.disconnect();
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  if (!visible) return null;

  function notNow() {
    rememberPromptDismissed();
    setVisible(false);
  }

  return (
    <aside aria-labelledby={headingId} className="reveal mt-16 rounded-xl bg-bg-raised p-6 sm:p-8">
      <h2 id={headingId} className="font-serif text-2xl">
        Enjoyed this?
      </h2>
      <p className="mt-2 max-w-[60ch] text-fg-muted">
        Make an account to join the conversation in the comments, with your own name and picture.
        It&apos;s free, optional, and you can delete it any time.
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2">
        <Link
          href={`/login?next=${encodeURIComponent(`/writing/${slug}#comments`)}`}
          className="button-primary inline-flex items-center no-underline"
        >
          Sign up
        </Link>
        <button
          type="button"
          onClick={notNow}
          className="min-h-11 cursor-pointer rounded-lg px-3 text-fg-muted transition-colors hover:bg-bg-raised-hover hover:text-fg"
        >
          Not now
        </button>
        <Link href="/privacy" className="ml-auto text-sm text-fg-muted underline underline-offset-4 hover:text-fg">
          Privacy
        </Link>
      </div>
    </aside>
  );
}
