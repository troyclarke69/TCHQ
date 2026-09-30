import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { apiGetJson, apiPostJson } from "../api";
import type { ContactOut } from "../types";
import { Input, Textarea } from "../components/FormFields";
import ThemeSwitcher from "../components/ThemeSwitcher";
import Typewriter from "../components/Typewriter";
import WaterOverlay from "../components/WaterOverlay";
import { initialsFrom, placeholderGradient } from "../lib/placeholder";
import type { Project, Testimonial } from "../types";

const HERO_HEADING = "I build fast, reliable apps — from idea to production.";
const HERO_SUBTITLE = "Sharp UX, pragmatic architecture, and measurable outcomes.";

type Api = {
  projects: Project[];
  testimonials: Testimonial[];
};

const EASE = [0.22, 1, 0.36, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

const staggerGrid = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

type TechCount = { tech: string; count: number };

// How many projects use each tech tag, most-used first (ties broken
// alphabetically). Always computed off the full project list, independent
// of whatever tech filter is currently applied to the grid.
function techTally(projects: Project[]): TechCount[] {
  const counts = new Map<string, number>();
  for (const p of projects) {
    for (const t of p.tech) {
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tech, count]) => ({ tech, count }))
    .sort((a, b) => b.count - a.count || a.tech.localeCompare(b.tech));
}

export default function PortfolioPage() {
  const [data, setData] = useState<Api | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [techFilter, setTechFilter] = useState<string | null>(null);

  const baseUrl = import.meta.env.VITE_API_PROXY_TARGET || "";
  // console.log("API base URL:", baseUrl);

  const featured = useMemo(
    () => (data?.projects ?? []).filter((p) => p.featured),
    [data],
  );

  const stack = useMemo(() => techTally(data?.projects ?? []), [data]);

  const visibleProjects = useMemo(() => {
    const list = data?.projects ?? [];
    return techFilter ? list.filter((p) => p.tech.includes(techFilter)) : list;
  }, [data, techFilter]);

  // Selecting the same tag again clears the filter. `scroll` is used when
  // the click came from the Tech stack section (below the grid), which is
  // out of view when the filter is applied -- a click on a tag inside a
  // card that's already visible doesn't need it.
  function toggleTech(tech: string, opts?: { scroll?: boolean }) {
    setTechFilter((cur) => (cur === tech ? null : tech));
    if (opts?.scroll) {
      document.getElementById("work")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

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
    <div className="relative z-0 min-h-dvh overflow-hidden bg-gradient-to-b from-[var(--bg-from)] via-[var(--bg-via)] to-[var(--bg-to)] text-[var(--text-primary)] transition-colors duration-500">
      <WaterOverlay />
      <div className="mx-auto max-w-5xl px-6 py-10">
        <Header />

        <main className="mt-10 space-y-16">
          <Hero />

          <Section
            title="Featured work"
            subtitle={
              techFilter ? (
                <span className="inline-flex items-center gap-1.5">
                  Filtered by{" "}
                  <span className="font-medium text-[var(--text-primary)]">{techFilter}</span>
                  <button
                    type="button"
                    onClick={() => setTechFilter(null)}
                    className="ml-1 text-[var(--text-primary)] underline decoration-[var(--border)] underline-offset-4 transition hover:decoration-[var(--text-primary)]"
                  >
                    Clear
                  </button>
                </span>
              ) : (
                "Selected projects"
              )
            }
          >
            <AnimatePresence mode="wait">
              {loadError ? (
                <motion.div key="error" {...fadeIn()}>
                  <Callout title="API error" body={loadError} />
                </motion.div>
              ) : !data ? (
                <motion.div key="skeleton" {...fadeIn()}>
                  <SkeletonGrid />
                </motion.div>
              ) : visibleProjects.length === 0 ? (
                <motion.div key="empty-filter" {...fadeIn()}>
                  <Muted>No projects use {techFilter}.</Muted>
                </motion.div>
              ) : (
                <motion.div
                  key={`projects-${techFilter ?? "all"}`}
                  className="grid gap-4 md:grid-cols-2"
                  variants={staggerGrid}
                  initial="hidden"
                  animate="show"
                >
                  {/* {(featured.length ? featured : data.projects).map((p) => ( */}
                  {visibleProjects.map((p) => (
                    <ProjectCard key={p.id} p={p} techFilter={techFilter} onTechClick={toggleTech} />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </Section>

          <TechStackSection stack={stack} techFilter={techFilter} onTechClick={toggleTech} />

          {/* Bio section hidden for now (originally meant as "testimonials" --
              may revisit later). Left in place, not deleted, so it's a
              one-line uncomment to bring back along with the nav link in
              Header() below.
          <Section title="Bio" subtitle="Achievements, background, and skills">
            <AnimatePresence mode="wait">
              {!data ? (
                <motion.div key="skeleton" {...fadeIn()}>
                  <SkeletonLines />
                </motion.div>
              ) : data.testimonials.length === 0 ? (
                <motion.div key="empty" {...fadeIn()}>
                  <Muted>Coming soon.</Muted>
                </motion.div>
              ) : (
                <motion.div
                  key="testimonials"
                  className="grid gap-4 md:grid-cols-1"
                  variants={staggerGrid}
                  initial="hidden"
                  animate="show"
                >
                  {data.testimonials.map((t) => (
                    <TestimonialCard key={t.id} t={t} />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </Section>
          */}

          <Section title="Contact" subtitle="Tell me about your project">
            <div className="grid gap-6 md:grid-cols-5">
              <div className="md:col-span-2">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition-colors duration-500">
                  <div className="text-sm text-[var(--text-secondary)]">
                    Email me instead?{" "}
                    <a
                      className="text-[var(--text-primary)] underline decoration-[var(--border)] underline-offset-4 hover:decoration-[var(--text-primary)]"
                      href="mailto:teclarke@rogers.com"
                    >
                      teclarke@rogers.com
                    </a>
                  </div>
                  <div className="mt-2 text-sm text-[var(--text-muted)]">
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
                    <p className="text-xs text-[var(--text-muted)]">At least 10 characters.</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <motion.button
                      type="submit"
                      disabled={sending}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="inline-flex items-center justify-center rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-text)] transition disabled:opacity-60"
                    >
                      {sending ? "Sending…" : "Send message"}
                    </motion.button>
                    <AnimatePresence>
                      {sent ? (
                        <motion.span
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="text-sm text-[var(--text-secondary)]"
                        >
                          Thanks!
                        </motion.span>
                      ) : null}
                    </AnimatePresence>
                    {contactError ? (
                      <span className="text-sm text-[var(--danger-text)]">{contactError}</span>
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

function fadeIn() {
  return {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.3, ease: EASE },
  };
}

function Header() {
  return (
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <motion.div
          className="h-10 w-10 rounded-3xl bg-gradient-to-br from-[var(--logo-from)] via-[var(--logo-via)] to-[var(--logo-to)] transition-colors duration-500"
          whileHover={{ rotate: 8, scale: 1.08 }}
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
        />
        <div>
          <div className="text-md font-medium">Troy Clarke</div>
          <div className="text-sm text-[var(--text-secondary)]">Web | Data | Cloud</div>
        </div>
      </div>

      <div className="flex items-center gap-5">
        <nav className="hidden items-center gap-6 text-sm text-[var(--nav-text)] md:flex">
          <a className="transition-colors hover:text-[var(--nav-hover)]" href="#work">
            Work
          </a>
          {/* Bio nav link hidden along with the Bio section above.
          <a className="transition-colors hover:text-[var(--nav-hover)]" href="#testimonials">
            Bio
          </a>
          */}
          <a className="transition-colors hover:text-[var(--nav-hover)]" href="#contact">
            Contact
          </a>
          <a
            className="flex items-center gap-1.5 transition-colors hover:text-[var(--nav-hover)]"
            href="/Troy_Clarke_Resume.pdf"
            download
          >
            <DownloadIcon />
            Résumé
          </a>
        </nav>
        <ThemeSwitcher />
      </div>
    </header>
  );
}

function Hero() {
  const [headingDone, setHeadingDone] = useState(false);
  const [subtitleDone, setSubtitleDone] = useState(false);

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE }}
      className="rounded-3xl border border-[var(--border)] bg-gradient-to-b from-[var(--surface)] to-transparent p-8 transition-colors duration-500"
    >
      <div className="max-w-2xl">
        <h1 className="text-balance text-3xl font-semibold leading-tight text-[var(--heading)] md:text-4xl">
          <Typewriter text={HERO_HEADING} speed={115} startDelay={250} onDone={() => setHeadingDone(true)} />
        </h1>
        <p className="mt-4 min-h-[1.5em] text-pretty text-[var(--heading-soft)]">
          {headingDone ? (
            <Typewriter
              text={HERO_SUBTITLE}
              speed={110}
              startDelay={350}
              onDone={() => setSubtitleDone(true)}
            />
          ) : null}
        </p>

        <motion.div
          className="mt-6 flex flex-wrap gap-3"
          initial={{ opacity: 0, y: 8 }}
          animate={subtitleDone ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          <motion.a
            href="#contact"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center justify-center rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-text)] transition"
          >
            Work with me
          </motion.a>
          <motion.a
            href="#work"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-transparent px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface)]"
          >
            See my work
          </motion.a>
        </motion.div>
      </div>
    </motion.section>
  );
}

function Section(props: {
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
}) {
  const id = props.title.toLowerCase().includes("work")
    ? "work"
    : props.title.toLowerCase().includes("testimonial")
      ? "testimonials"
      : props.title.toLowerCase().includes("bio")
        ? "testimonials"
        : props.title.toLowerCase().includes("contact")
          ? "contact"
          : undefined;

  return (
    <motion.section
      id={id}
      className="scroll-mt-8"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, ease: EASE }}
    >
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-lg font-semibold text-[var(--heading-soft)]">{props.title}</h1>
        {props.subtitle ? (
          <div className="text-sm text-[var(--text-muted)]">{props.subtitle}</div>
        ) : null}
      </div>
      <div className="mt-5">{props.children}</div>
    </motion.section>
  );
}

function ProjectThumbnail({ p }: { p: Project }) {
  const [broken, setBroken] = useState(false);

  // If a project's thumbnail URL changes (e.g. edited in Admin), give the
  // new one a fresh chance to load instead of staying stuck on the old
  // failure.
  useEffect(() => {
    setBroken(false);
  }, [p.thumbnail]);

  if (p.thumbnail && !broken) {
    return (
      <div className="mb-4 aspect-[16/9] w-full overflow-hidden rounded-xl border border-[var(--border)]">
        <img
          src={p.thumbnail}
          alt={`${p.title} thumbnail`}
          loading="lazy"
          onError={() => setBroken(true)}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
      </div>
    );
  }

  return (
    <div
      className="mb-4 flex aspect-[16/9] w-full items-center justify-center overflow-hidden rounded-xl border border-[var(--border)] text-lg font-semibold tracking-wide text-white/80 transition-transform duration-500 group-hover:scale-105"
      style={{ backgroundImage: placeholderGradient(p.id) }}
      aria-hidden="true"
    >
      {initialsFrom(p.title)}
    </div>
  );
}

function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.09 3.29 9.4 7.86 10.93.58.11.79-.25.79-.56 0-.27-.01-1.17-.02-2.12-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.69-1.28-1.69-1.04-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.19-3.08-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.64 1.59.24 2.76.12 3.05.74.8 1.18 1.82 1.18 3.08 0 4.41-2.69 5.38-5.25 5.67.42.36.78 1.06.78 2.15 0 1.55-.01 2.8-.01 3.18 0 .31.21.68.8.56A10.51 10.51 0 0 0 23.5 12c0-6.35-5.15-11.5-11.5-11.5Z" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
    >
      <path d="M12 3v12" />
      <path d="M7 10l5 5 5-5" />
      <path d="M4 19h16" />
    </svg>
  );
}

function ProjectCard({
  p,
  techFilter,
  onTechClick,
}: {
  p: Project;
  techFilter: string | null;
  onTechClick: (tech: string) => void;
}) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition-colors duration-500 hover:bg-[var(--surface-strong)]"
    >
      <ProjectThumbnail p={p} />

      <div className="flex items-start justify-between gap-4">
        <div>
          {p.category ? (
            <span className="mb-1.5 inline-block rounded-full bg-[var(--badge-bg)] px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-[var(--badge-text)]">
              {p.category}
            </span>
          ) : null}
          <h2 className="text-[var(--heading)]">{p.title}</h2>
          <div className="mt-1 text-sm text-[var(--text-secondary)]">{p.summary}</div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {p.github ? (
            <a
              href={p.github}
              className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-transparent px-3 py-1 text-xs text-[var(--text-primary)] transition hover:bg-[var(--surface-strong)]"
              target="_blank"
              rel="noreferrer"
              aria-label="View source on GitHub"
            >
              <GithubIcon />
              Code
            </a>
          ) : null}
          {p.href ? (
            <a
              href={p.href}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs text-[var(--text-primary)] transition hover:bg-[var(--surface-strong)]"
              target="_blank"
              rel="noreferrer"
            >
              Visit
            </a>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {p.tech.slice(0, 6).map((t) => {
          const active = techFilter === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => onTechClick(t)}
              aria-pressed={active}
              className={`rounded-full border px-2.5 py-1 text-xs transition ${
                active
                  ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-text)]"
                  : "border-[var(--border)] bg-[var(--badge-bg)] text-[var(--badge-text)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
              }`}
            >
              {t}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}

function TechStackSection({
  stack,
  techFilter,
  onTechClick,
}: {
  stack: TechCount[];
  techFilter: string | null;
  onTechClick: (tech: string, opts?: { scroll?: boolean }) => void;
}) {
  if (stack.length === 0) return null;

  return (
    <Section title="Tech stack" subtitle={`${stack.length} tools across all projects`}>
      <p className="-mt-2 mb-4 max-w-2xl text-sm text-[var(--text-muted)]">
        Taken from each project's tech tags, with how many projects use each. Select one to
        filter the projects above.
      </p>
      <div className="flex flex-wrap gap-2">
        {stack.map(({ tech, count }) => {
          const active = techFilter === tech;
          return (
            <button
              key={tech}
              type="button"
              onClick={() => onTechClick(tech, { scroll: true })}
              aria-pressed={active}
              aria-label={`${tech}, used in ${count} project${count > 1 ? "s" : ""}`}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 font-mono text-xs transition ${
                active
                  ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-text)]"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
              }`}
            >
              {tech}
              <span className={active ? "opacity-80" : "text-[var(--text-muted)]"}>{count}</span>
            </button>
          );
        })}
      </div>
    </Section>
  );
}

function TestimonialCard({ t }: { t: Testimonial }) {
  return (
    <motion.figure
      variants={fadeUp}
      className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition-colors duration-500"
    >
      <span className="text-[var(--heading)]">{t.name}</span>
      <blockquote className="text-sm text-[var(--text-secondary)]">{t.quote}</blockquote>
      <figcaption className="mt-4 text-sm text-[var(--text-secondary)]">
        {t.role || t.company ? (
          <>
            {" "}
            — {t.role ? t.role : null}
            {t.role && t.company ? ", " : null}
            {t.company ? t.company : null}
          </>
        ) : null}
      </figcaption>
    </motion.figure>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-28 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface)]"
        />
      ))}
    </div>
  );
}

function SkeletonLines() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="h-3 w-3/4 animate-pulse rounded bg-[var(--surface-strong)]" />
          <div className="mt-3 h-3 w-5/6 animate-pulse rounded bg-[var(--surface-strong)]" />
          <div className="mt-3 h-3 w-2/3 animate-pulse rounded bg-[var(--surface-strong)]" />
          <div className="mt-5 h-3 w-1/3 animate-pulse rounded bg-[var(--surface-strong)]" />
        </div>
      ))}
    </div>
  );
}

function Callout({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] p-5">
      <div className="text-sm font-medium text-[var(--danger-text)]">{title}</div>
      <div className="mt-1 text-sm text-[var(--danger-text)] opacity-80">{body}</div>
    </div>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <div className="text-sm text-[var(--text-muted)]">{children}</div>;
}

function Footer() {
  return (
    <footer className="mt-16 border-t border-[var(--border)] pt-8 text-sm text-[var(--nav-text)]">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>© {new Date().getFullYear()} Troy Clarke.
          Grab the  <a className="transition-colors hover:text-[var(--nav-hover)]" href="https://github.com/troyclarke69/tchq"
            target="_blank"
            rel="noreferrer"
          >
            source code&nbsp;
          </a>
           but don't sell my data.
        </div>

        <div className="flex gap-4">
          <a className="transition-colors hover:text-[var(--nav-hover)]" href="https://github.com/troyclarke69"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
          <a className="transition-colors hover:text-[var(--nav-hover)]" href="https://www.linkedin.com/in/troy-clarke-6752ba9/"
            target="_blank"
            rel="noreferrer"
          >
            LinkedIn
          </a>
          <Link className="transition-colors hover:text-[var(--nav-hover)]" to="/admin">
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
