import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiGetJson, apiPostJson } from "../api";
import type { ContactOut } from "../types";
import { Input, Textarea } from "../components/FormFields";
import type { Project, Testimonial } from "../types";

type Api = {
  projects: Project[];
  testimonials: Testimonial[];
};

export default function PortfolioPage() {
  const [data, setData] = useState<Api | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const baseUrl = import.meta.env.VITE_API_PROXY_TARGET || "";
  // console.log("API base URL:", baseUrl);

  const featured = useMemo(
    () => (data?.projects ?? []).filter((p) => p.featured),
    [data],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [projects, testimonials] = await Promise.all([
          apiGetJson<Project[]>(`${baseUrl}/api/projects`),
          apiGetJson<Testimonial[]>(`${baseUrl}/api/testimonials`),
        ]);
        if (!cancelled) setData({ projects, testimonials });
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmitContact(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    setContactError(null);
    setSent(false);
    setSending(true);
    try {
      const form = new FormData(formEl);
      const payload = {
        name: String(form.get("name") ?? "").trim(),
        email: String(form.get("email") ?? "").trim(),
        message: String(form.get("message") ?? "").trim(),
      };
      await apiPostJson<ContactOut>(`${baseUrl}/api/contact`, payload);
      formEl.reset();
      setSent(true);
    } catch (err) {
      setContactError(err instanceof Error ? err.message : "Could not send message");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-dvh">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <Header />

        <main className="mt-10 space-y-16">
          <Hero />

          <Section title="Featured work" subtitle="Selected projects">
            {loadError ? (
              <Callout title="API error" body={loadError} />
            ) : !data ? (
              <SkeletonGrid />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {/* {(featured.length ? featured : data.projects).map((p) => ( */}
                {(data.projects).map((p) => (
                  <ProjectCard key={p.id} p={p} />
                ))}
              </div>
            )}
          </Section>

          <Section title="Bio" subtitle="Achievements, background, and skills">
            {!data ? (
              <SkeletonLines />
            ) : data.testimonials.length === 0 ? (
              <Muted>Coming soon.</Muted>
            ) : (
              <div className="grid gap-4 md:grid-cols-1">
                {data.testimonials.map((t) => (
                  <TestimonialCard key={t.id} t={t} />
                ))}
              </div>
            )}
          </Section>

          <Section title="Contact" subtitle="Tell me about your project">
            <div className="grid gap-6 md:grid-cols-5">
              <div className="md:col-span-2">
                <div className="rounded-2xl border border-white/10 bg-white/25 p-5">
                  <div className="text-sm text-zinc-300">
                    Email me instead?{" "}
                    <a
                      className="text-zinc-50 underline decoration-white/20 underline-offset-4 hover:decoration-white/50"
                      href="mailto:teclarke@rogers.com"
                    >
                      teclarke@rogers.com
                    </a>
                  </div>
                  <div className="mt-2 text-sm text-zinc-400">
                    Typical response time: 1 business day.
                  </div>
                </div>
              </div>

              <form
                className="md:col-span-3"
                onSubmit={onSubmitContact}
                aria-label="Contact form"
              >
                <div className="grid gap-4">
                  <Input
                    label=""                   
                    name="name"
                    placeholder="name"
                    minLength={2}
                    maxLength={120}
                    required
                  />
                  <Input
                    label=""                   
                    name="email"
                    placeholder="email"
                    type="email"
                    required
                  />
                  <div className="grid gap-2">
                    <Textarea
                      label=""
                      name="message"
                      placeholder="What do you have in mind?"
                      minLength={10}
                      required
                    />
                    <p className="text-xs text-zinc-400">At least 10 characters.</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="submit"
                      disabled={sending}
                      className="inline-flex items-center justify-center rounded-xl bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-white disabled:opacity-60"
                    >
                      {sending ? "Sending…" : "Send message"}
                    </button>
                    {sent ? <span className="text-sm text-zinc-300">Thanks!</span> : null}
                    {contactError ? (
                      <span className="text-sm text-rose-300">{contactError}</span>
                    ) : null}
                  </div>
                </div>
              </form>
            </div>
          </Section>
        </main>

        <Footer />
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-3xl bg-gradient-to-br from-green-900 via-blue-900 to-green-400" />
        <div>
          <div className="text-md font-medium">Troy Clarke</div>
          <div className="text-sm text-zinc-200">Web | Data | Cloud</div>
        </div>
      </div>

      <nav className="hidden items-center gap-6 text-sm text-green-200 md:flex">
        <a className="hover:text-zinc-50" href="#work">
          Work
        </a>
        <a className="hover:text-zinc-50" href="#testimonials">
          Bio
        </a>
        <a className="hover:text-zinc-50" href="#contact">
          Contact
        </a>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/20 to-white/0 p-8">
      <div className="max-w-2xl">
        <h1 className="text-balance text-3xl font-semibold leading-tight text-blue-400 md:text-4xl">
          I build fast, reliable apps — from idea to production.
        </h1>
        {/* <h1 className="text-balance text-3xl font-semibold leading-tight text-blue-400 md:text-4xl">
          Let's hope this stuff works.
        </h1> */}
        <p className="mt-4 text-pretty text-blue-100">
          Sharp UX, pragmatic architecture, and measurable outcomes.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href="#contact"
            className="inline-flex items-center justify-center rounded-xl bg-zinc-300 px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-white"
          >
            Work with me
          </a>
          <a
            href="#work"
            className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/0 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/25"
          >
            See my work
          </a>
        </div>
      </div>
    </section>
  );
}

function Section(props: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const id = props.title.toLowerCase().includes("work")
    ? "work"
    : props.title.toLowerCase().includes("testimonial")
      ? "testimonials"
      : props.title.toLowerCase().includes("contact")
        ? "contact"
        : undefined;

  return (
    <section id={id} className="scroll-mt-8">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-lg font-semibold text-blue-100">{props.title}</h1>
        {props.subtitle ? <div className="text-sm text-zinc-500">{props.subtitle}</div> : null}
      </div>
      <div className="mt-5 bg-blue/25">{props.children}</div>
    </section>
  );
}

function ProjectCard({ p }: { p: Project }) {
  return (
    <div className="group rounded-2xl border border-white/10 bg-white/25 p-5 transition hover:bg-white/7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-blue-400">{p.title}</h2>
          <div className="mt-1 text-sm text-zinc-300">{p.summary}</div>
        </div>
        {p.href ? (
          <a
            href={p.href}
            className="shrink-0 rounded-xl border border-white/15 bg-white/10 px-3 py-1 text-xs text-zinc-50 transition hover:bg-white/25"
            target="_blank"
            rel="noreferrer"
          >
            Visit
          </a>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {p.tech.slice(0, 6).map((t) => (
          <span
            key={t}
            className="rounded-full border border-white/10 bg-zinc-950/20 px-2.5 py-1 text-xs text-yellow-200"
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

function TestimonialCard({ t }: { t: Testimonial }) {
  return (
    <figure className="rounded-2xl border border-white/10 bg-white/25 p-5">
      <span className="text-blue-400">{t.name}</span>
      <blockquote className="text-sm text-zinc-300">{t.quote}</blockquote>
      <figcaption className="mt-4 text-sm text-zinc-200">        
        {t.role || t.company ? (
          <>
            {" "}
            — {t.role ? t.role : null}
            {t.role && t.company ? ", " : null}
            {t.company ? t.company : null}
          </>
        ) : null}
      </figcaption>
    </figure>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-28 animate-pulse rounded-2xl border border-white/10 bg-white/25"
        />
      ))}
    </div>
  );
}

function SkeletonLines() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-white/10 bg-white/25 p-5">
          <div className="h-3 w-3/4 animate-pulse rounded bg-white/10" />
          <div className="mt-3 h-3 w-5/6 animate-pulse rounded bg-white/10" />
          <div className="mt-3 h-3 w-2/3 animate-pulse rounded bg-white/10" />
          <div className="mt-5 h-3 w-1/3 animate-pulse rounded bg-white/10" />
        </div>
      ))}
    </div>
  );
}

function Callout({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-5">
      <div className="text-sm font-medium text-rose-100">{title}</div>
      <div className="mt-1 text-sm text-rose-200/80">{body}</div>
    </div>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <div className="text-sm text-zinc-400">{children}</div>;
}

function Footer() {
  return (
    <footer className="mt-16 border-t border-white/10 pt-8 text-sm text-green-200">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>© {new Date().getFullYear()} Troy Clarke. 
          Grab the  <a className="hover:text-zinc-50" href="https://github.com/troyclarke69/tchq"
            target="_blank"
            rel="noreferrer"
          >
            source code&nbsp;
          </a> 
           but don't sell my data.
        </div>

        <div className="flex gap-4">
          <a className="hover:text-zinc-50" href="https://github.com/troyclarke69"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
          <a className="hover:text-zinc-50" href="https://www.linkedin.com/in/troy-clarke-6752ba9/"
            target="_blank"
            rel="noreferrer"
          >
            LinkedIn
          </a>
          <Link className="hover:text-zinc-50" to="/admin">
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
