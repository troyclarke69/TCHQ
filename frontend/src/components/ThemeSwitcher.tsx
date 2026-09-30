import { useTheme, type Theme } from "../theme";

const OPTIONS: { value: Theme; label: string; icon: React.ReactNode }[] = [
  {
    value: "light",
    label: "Light",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
        <circle cx="12" cy="12" r="4" />
        <path
          strokeLinecap="round"
          d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
        />
      </svg>
    ),
  },
  {
    value: "dark",
    label: "Dark",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z" />
      </svg>
    ),
  },
  {
    value: "monet",
    label: "Monet",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
        <path d="M12 3a9 9 0 1 0 0 18c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.2 0-.9.7-1.5 1.5-1.5h1.8c1.9 0 3.7-1.6 3.7-3.7A8 8 0 0 0 12 3Z" />
        <circle cx="7.5" cy="11" r="1" fill="currentColor" stroke="none" />
        <circle cx="10.5" cy="7.5" r="1" fill="currentColor" stroke="none" />
        <circle cx="15" cy="8" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    value: "funky",
    label: "Funky",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M13 2 3 14h6l-1 8 11-14h-7l1-6Z" />
      </svg>
    ),
  },
];

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-full border border-[var(--border)] bg-[var(--surface)] p-1 transition-colors duration-500"
      role="radiogroup"
      aria-label="Theme"
    >
      {OPTIONS.map((opt) => {
        const active = opt.value === theme;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={opt.label}
            onClick={() => setTheme(opt.value)}
            className={[
              "flex h-7 w-7 items-center justify-center rounded-full transition-all duration-300",
              active
                ? "bg-[var(--accent)] text-[var(--accent-text)] scale-100"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] scale-95 hover:scale-100",
            ].join(" ")}
          >
            {opt.icon}
          </button>
        );
      })}
    </div>
  );
}
