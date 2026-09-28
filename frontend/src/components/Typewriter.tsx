import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * Types `text` out one character at a time, then calls `onDone` once.
 * Full text is always present for screen readers/SEO via a visually-hidden
 * span; the animated span is aria-hidden. Respects prefers-reduced-motion
 * by rendering the final text immediately.
 */
export default function Typewriter({
  text,
  speed = 24,
  startDelay = 0,
  showCursor = true,
  className,
  onDone,
}: {
  text: string;
  speed?: number;
  startDelay?: number;
  showCursor?: boolean;
  className?: string;
  onDone?: () => void;
}) {
  const prefersReducedMotion = useReducedMotion();
  const [count, setCount] = useState(prefersReducedMotion ? text.length : 0);
  const firedDone = useRef(false);

  useEffect(() => {
    firedDone.current = false;

    if (prefersReducedMotion) {
      setCount(text.length);
      if (!firedDone.current) {
        firedDone.current = true;
        onDone?.();
      }
      return;
    }

    setCount(0);
    let cancelled = false;
    let stepTimer: ReturnType<typeof setTimeout>;

    const startTimer = setTimeout(() => {
      let i = 0;
      const step = () => {
        if (cancelled) return;
        i += 1;
        setCount(i);
        if (i < text.length) {
          stepTimer = setTimeout(step, speed);
        } else if (!firedDone.current) {
          firedDone.current = true;
          onDone?.();
        }
      };
      step();
    }, startDelay);

    return () => {
      cancelled = true;
      clearTimeout(startTimer);
      clearTimeout(stepTimer);
    };
    // Intentionally only re-run if the text itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const isTyping = !prefersReducedMotion && count < text.length;

  return (
    <span className={className}>
      <span aria-hidden="true">
        {text.slice(0, count)}
        {showCursor && !prefersReducedMotion ? (
          <span
            className={[
              "ml-0.5 inline-block w-[2px] translate-y-[0.1em] bg-current align-middle",
              isTyping ? "animate-pulse" : "opacity-0",
            ].join(" ")}
            style={{ height: "0.9em" }}
          />
        ) : null}
      </span>
      <span className="sr-only">{text}</span>
    </span>
  );
}
