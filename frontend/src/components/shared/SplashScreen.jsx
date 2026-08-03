import { useEffect, useState } from "react";

const BRAND_NAME = "PubliCast";
const LETTER_DELAY_MS = 40;
const HOLD_AFTER_MS = 300;
const FADE_OUT_MS = 300;

/**
 * Splash shown while the app bootstraps (checkAuth in flight). Letters fade
 * in one by one; once fully revealed it waits for `ready` (auth check done)
 * before holding briefly and fading the whole screen out.
 */
export function SplashScreen({ ready, onDone }) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [fadingOut, setFadingOut] = useState(false);
  const lettersDone = visibleCount >= BRAND_NAME.length;

  useEffect(() => {
    if (lettersDone) return;
    const letterTimer = setTimeout(() => setVisibleCount((c) => c + 1), LETTER_DELAY_MS);
    return () => clearTimeout(letterTimer);
  }, [visibleCount, lettersDone]);

  useEffect(() => {
    if (!lettersDone || !ready) return;
    const holdTimer = setTimeout(() => setFadingOut(true), HOLD_AFTER_MS);
    return () => clearTimeout(holdTimer);
  }, [lettersDone, ready]);

  useEffect(() => {
    if (!fadingOut) return;
    const doneTimer = setTimeout(onDone, FADE_OUT_MS);
    return () => clearTimeout(doneTimer);
  }, [fadingOut, onDone]);

  return (
    <div
      className="w-full h-screen flex items-center justify-center bg-[#F8F8F7]"
      style={{
        opacity: fadingOut ? 0 : 1,
        transition: `opacity ${FADE_OUT_MS}ms ease`
      }}
    >
      <div
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 32,
          fontWeight: 700,
          color: "#0A0A0A",
          letterSpacing: 0.5
        }}
      >
        {BRAND_NAME.split("").map((char, i) => (
          <span
            key={i}
            style={{
              opacity: i < visibleCount ? 1 : 0,
              transition: "opacity 200ms ease"
            }}
          >
            {char}
          </span>
        ))}
      </div>
    </div>
  );
}
