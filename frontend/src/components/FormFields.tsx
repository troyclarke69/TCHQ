export function Input(props: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const { label, className, ...rest } = props;
  return (
    <label className="grid gap-2 text-sm">
      <span className="text-zinc-300">{label}</span>
      <input
        {...rest}
        className={[
          "w-full rounded-xl border border-white/10 bg-zinc-950/30 px-3 py-2 text-zinc-50",
          "outline-none ring-0 transition focus:border-white/20 focus:bg-zinc-950/40",
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
      <span className="text-zinc-300">{label}</span>
      <textarea
        {...rest}
        className={[
          "w-full resize-y rounded-xl border border-white/10 bg-zinc-950/30 px-3 py-2 text-zinc-50",
          "outline-none ring-0 transition focus:border-white/20 focus:bg-zinc-950/40",
          className ?? "",
        ].join(" ")}
      />
    </label>
  );
}

export function Checkbox(props: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const { label, className, ...rest } = props;
  return (
    <label className="flex items-center gap-2 text-sm text-zinc-300">
      <input
        type="checkbox"
        {...rest}
        className={["h-4 w-4 rounded border-white/20 bg-zinc-950/30", className ?? ""].join(" ")}
      />
      {label}
    </label>
  );
}
