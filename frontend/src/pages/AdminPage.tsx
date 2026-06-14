import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiDelete, apiGetJson, apiPostJson } from "../api";
import { clearAdminToken, getAdminToken, setAdminToken } from "../auth";
import { Checkbox, Input, Textarea } from "../components/FormFields";
import type { Project, Testimonial, TokenResponse } from "../types";

function parseTech(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(() => getAdminToken());
  const [projects, setProjects] = useState<Project[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  const baseUrl = import.meta.env.VITE_API_PROXY_TARGET || "";
  // console.log("API base URL:", baseUrl);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, t] = await Promise.all([
        apiGetJson<Project[]>(`${baseUrl}/api/projects`),
        apiGetJson<Testimonial[]>(`${baseUrl}/api/testimonials`),
      ]);
      setProjects(p);
      setTestimonials(t);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) void loadData();
  }, [token, loadData]);

  function handleUnauthorized(err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("401") || msg.toLowerCase().includes("token") || msg.toLowerCase().includes("forbidden")) {
      clearAdminToken();
      setToken(null);
      setError("Session expired. Please sign in again.");
      return true;
    }
    return false;
  }

  async function onLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoginLoading(true);
    setError(null);
    try {
      const form = new FormData(e.currentTarget);
      const res = await apiPostJson<TokenResponse>(`${baseUrl}/api/admin/login`, {
        email: String(form.get("email") ?? ""),
        password: String(form.get("password") ?? ""),
      });
      setAdminToken(res.access_token);
      setToken(res.access_token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoginLoading(false);
    }
  }

  function logout() {
    clearAdminToken();
    setToken(null);
    setProjects([]);
    setTestimonials([]);
    setError(null);
  }

  async function onCreateProject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;
    setError(null);
    const form = new FormData(e.currentTarget);
    const hrefRaw = String(form.get("href") ?? "").trim();
    try {
      const created = await apiPostJson<Project>(
        `${baseUrl}/api/admin/projects`,
        {
          title: String(form.get("title") ?? ""),
          summary: String(form.get("summary") ?? ""),
          tech: parseTech(String(form.get("tech") ?? "")),
          href: hrefRaw || null,
          featured: form.get("featured") === "on",
        },
        token,
      );
      setProjects((prev) => [created, ...prev]);
      // e.currentTarget.reset();
    } catch (err) {
      if (!handleUnauthorized(err)) {
        setError(err instanceof Error ? err.message : "Failed to create project");
      }
    }
  }

  async function onDeleteProject(id: string) {
    if (!token || !confirm("Delete this project?")) return;
    setError(null);
    try {
      await apiDelete(`${baseUrl}/api/admin/projects/${id}`, token);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      if (!handleUnauthorized(err)) {
        setError(err instanceof Error ? err.message : "Failed to delete project");
      }
    }
  }

  async function onCreateTestimonial(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;
    setError(null);
    const form = new FormData(e.currentTarget);
    const role = String(form.get("role") ?? "").trim();
    const company = String(form.get("company") ?? "").trim();
    try {
      const created = await apiPostJson<Testimonial>(
        `${baseUrl}/api/admin/testimonials`,
        {
          name: String(form.get("name") ?? ""),
          role: role || null,
          company: company || null,
          quote: String(form.get("quote") ?? ""),
        },
        token,
      );
      setTestimonials((prev) => [created, ...prev]);
      // e.currentTarget.reset();
    } catch (err) {
      if (!handleUnauthorized(err)) {
        setError(err instanceof Error ? err.message : "Failed to create testimonial");
      }
    }
  }

  async function onDeleteTestimonial(id: string) {
    if (!token || !confirm("Delete this testimonial?")) return;
    setError(null);
    try {
      await apiDelete(`${baseUrl}/api/admin/testimonials/${id}`, token);
      setTestimonials((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      if (!handleUnauthorized(err)) {
        setError(err instanceof Error ? err.message : "Failed to delete testimonial");
      }
    }
  }

  return (
    <div className="min-h-dvh">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">Admin</h1>
            <p className="mt-1 text-sm text-zinc-400">Manage portfolio content</p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link className="text-zinc-300 hover:text-zinc-50" to="/">
              ← Portfolio
            </Link>
            {token ? (
              <button
                type="button"
                onClick={logout}
                className="rounded-xl border border-white/15 px-3 py-1.5 text-zinc-50 transition hover:bg-white/5"
              >
                Sign out
              </button>
            ) : null}
          </div>
        </header>

        {error ? (
          <div className="mt-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        {!token ? (
          <section className="mx-auto mt-10 max-w-md">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-base font-medium">Sign in</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Enter admin credentials
              </p>
              <form className="mt-6 grid gap-4" onSubmit={onLogin}>
                <Input
                  label="Email"
                  name="email"
                  type="email"
                  autoComplete=""
                  required
                />
                <Input
                  label="Password"
                  name="password"
                  type="password"
                  autoComplete=""
                  required
                />
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="inline-flex items-center justify-center rounded-xl bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-white disabled:opacity-60"
                >
                  {loginLoading ? "Signing in…" : "Sign in"}
                </button>
              </form>
            </div>
          </section>
        ) : (
          <div className="mt-10 space-y-12">
            {loading ? (
              <p className="text-sm text-zinc-400">Loading…</p>
            ) : null}

            <section>
              <h2 className="text-lg font-semibold">Projects</h2>
              <p className="mt-1 text-sm text-zinc-400">Add or remove portfolio projects.</p>

              <form
                className="mt-5 grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 md:grid-cols-2"
                onSubmit={onCreateProject}
              >
                <Input label="Title" name="title" required minLength={2} maxLength={120} />
                <Input label="Link (optional)" name="href" type="url" placeholder="https://…" />
                <div className="md:col-span-2">
                  <Input label="Summary" name="summary" required minLength={5} maxLength={280} />
                </div>
                <div className="md:col-span-2">
                  <Input
                    label="Tech (comma-separated)"
                    name="tech"
                    placeholder="React, TypeScript, FastAPI"
                  />
                </div>
                <Checkbox label="Featured on homepage" name="featured" />
                <div className="flex items-end md:justify-end">
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-xl bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-white"
                  >
                    Add project
                  </button>
                </div>
              </form>

              <ul className="mt-6 space-y-3">
                {projects.length === 0 ? (
                  <li className="text-sm text-zinc-400">No projects yet.</li>
                ) : (
                  projects.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4"
                    >
                      <div>
                        <div className="font-medium">
                          {p.title}
                          {p.featured ? (
                            <span className="ml-2 rounded-full border border-white/10 px-2 py-0.5 text-xs text-zinc-400">
                              featured
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-1 text-sm text-zinc-300">{p.summary}</div>
                        {p.tech.length > 0 ? (
                          <div className="mt-2 text-xs text-zinc-500">{p.tech.join(" · ")}</div>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => void onDeleteProject(p.id)}
                        className="shrink-0 rounded-xl border border-rose-500/30 px-3 py-1 text-xs text-rose-200 transition hover:bg-rose-500/10"
                      >
                        Delete
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold">Testimonials</h2>
              <p className="mt-1 text-sm text-zinc-400">Add or remove client quotes.</p>

              <form
                className="mt-5 grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 md:grid-cols-2"
                onSubmit={onCreateTestimonial}
              >
                <Input label="Name" name="name" required minLength={2} maxLength={120} />
                <Input label="Role (optional)" name="role" maxLength={120} />
                <Input label="Company (optional)" name="company" maxLength={120} />
                <div className="md:col-span-2">
                  <Textarea label="Quote" name="quote" required minLength={10} rows={4} />
                </div>
                <div className="md:col-span-2 flex justify-end">
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-xl bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-white"
                  >
                    Add testimonial
                  </button>
                </div>
              </form>

              <ul className="mt-6 space-y-3">
                {testimonials.length === 0 ? (
                  <li className="text-sm text-zinc-400">No testimonials yet.</li>
                ) : (
                  testimonials.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4"
                    >
                      <div>
                        <div className="font-medium">{t.name}</div>
                        <div className="text-sm text-zinc-400">
                          {[t.role, t.company].filter(Boolean).join(" · ") || "—"}
                        </div>
                        <blockquote className="mt-2 text-sm text-zinc-300">{t.quote}</blockquote>
                      </div>
                      <button
                        type="button"
                        onClick={() => void onDeleteTestimonial(t.id)}
                        className="shrink-0 rounded-xl border border-rose-500/30 px-3 py-1 text-xs text-rose-200 transition hover:bg-rose-500/10"
                      >
                        Delete
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
