export function Input(props: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const { label, className, ...rest } = props;
  return (
    <label className="grid gap-2 text-sm">
      <span className="text-[var(--text-secondary)]">{label}</span>
      <input
        {...rest}
        className={[
          "w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--text-primary)]",
          "outline-none ring-0 transition focus:border-[var(--heading)] focus:bg-[var(--surface-strong)]",
          className ?? "",
        ].join(" ")}
      />
    </label>
  );
}

export function Textarea(
  props: { label: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  const { label, className, ...rest } = props;
  return (
    <label className="grid gap-2 text-sm">
      <span className="text-[var(--text-secondary)]">{label}</span>
      <textarea
        {...rest}
        className={[
          "w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--text-primary)]",
          "outline-none ring-0 transition focus:border-[var(--heading)] focus:bg-[var(--surface-strong)]",
          className ?? "",
        ].join(" ")}
      />
    </label>
  );
}

export function Checkbox(props: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const { label, className, ...rest } = props;
  return (
    <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
      <input
        type="checkbox"
        {...rest}
        className={["h-4 w-4 rounded border-[var(--border)] bg-[var(--surface)]", className ?? ""].join(" ")}
      />
      {label}
    </label>
  );
}
