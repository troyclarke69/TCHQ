import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiDelete, apiGetJson, apiPostJson, apiPutJson } from "../api";
import { clearAdminToken, getAdminToken, setAdminToken } from "../auth";
import { Checkbox, Input, Textarea } from "../components/FormFields";
import ThemeSwitcher from "../components/ThemeSwitcher";
import type { Project, Testimonial, TokenResponse } from "../types";

const CATEGORY_SUGGESTIONS = ["Data", "Full stack", ".NET", "Frontend", "Backend", "Cloud", "DevOps"];

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const baseUrl = import.meta.env.VITE_API_PROXY_TARGET || "";
  // console.log("API base URL:", baseUrl);

  const categorySuggestions = useMemo(() => {
    const fromData = projects.map((p) => p.category).filter((c): c is string => Boolean(c));
    return Array.from(new Set([...CATEGORY_SUGGESTIONS, ...fromData]));
  }, [projects]);

  const editingProject = useMemo(
    () => projects.find((p) => p.id === editingId) ?? null,
    [projects, editingId],
  );

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

  function startEditProject(p: Project) {
    setEditingId(p.id);
    setError(null);
    document.getElementById("project-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function cancelEditProject() {
    setEditingId(null);
    setError(null);
  }

  async function onSubmitProject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;
    setError(null);
    const form = new FormData(e.currentTarget);
    const hrefRaw = String(form.get("href") ?? "").trim();
    const githubRaw = String(form.get("github") ?? "").trim();
    const categoryRaw = String(form.get("category") ?? "").trim();
    const thumbnailRaw = String(form.get("thumbnail") ?? "").trim();
    const payload = {
      title: String(form.get("title") ?? ""),
      summary: String(form.get("summary") ?? ""),
      tech: parseTech(String(form.get("tech") ?? "")),
      href: hrefRaw || null,
      github: githubRaw || null,
      category: categoryRaw || null,
      thumbnail: thumbnailRaw || null,
      featured: form.get("featured") === "on",
    };

    setSaving(true);
    try {
      if (editingId) {
        const updated = await apiPutJson<Project>(
          `${baseUrl}/api/admin/projects/${editingId}`,
          payload,
          token,
        );
        setProjects((prev) => prev.map((p) => (p.id === editingId ? updated : p)));
        setEditingId(null);
      } else {
        const created = await apiPostJson<Project>(`${baseUrl}/api/admin/projects`, payload, token);
        setProjects((prev) => [created, ...prev]);
        e.currentTarget.reset();
      }
    } catch (err) {
      if (!handleUnauthorized(err)) {
        setError(err instanceof Error ? err.message : "Failed to save project");
      }
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteProject(id: string) {
    if (!token || !confirm("Delete this project?")) return;
    setError(null);
    try {
      await apiDelete(`${baseUrl}/api/admin/projects/${id}`, token);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      if (editingId === id) setEditingId(null);
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
    <div className="min-h-dvh bg-gradient-to-b from-[var(--bg-from)] via-[var(--bg-via)] to-[var(--bg-to)] text-[var(--text-primary)] transition-colors duration-500">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">Admin</h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Manage portfolio content</p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <ThemeSwitcher />
            <Link className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]" to="/">
              ← Portfolio
            </Link>
            {token ? (
              <button
                type="button"
                onClick={logout}
                className="rounded-xl border border-[var(--border)] px-3 py-1.5 text-[var(--text-primary)] transition hover:bg-[var(--surface)]"
              >
                Sign out
              </button>
            ) : null}
          </div>
        </header>

        {error ? (
          <div className="mt-6 rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] p-4 text-sm text-[var(--danger-text)]">
            {error}
          </div>
        ) : null}

        {!token ? (
          <section className="mx-auto mt-10 max-w-md">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
              <h2 className="text-base font-medium">Sign in</h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
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
                  className="inline-flex items-center justify-center rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-text)] transition disabled:opacity-60"
                >
                  {loginLoading ? "Signing in…" : "Sign in"}
                </button>
              </form>
            </div>
          </section>
        ) : (
          <div className="mt-10 space-y-12">
            {loading ? (
              <p className="text-sm text-[var(--text-muted)]">Loading…</p>
            ) : null}

            <section>
              <h2 className="text-lg font-semibold">Projects</h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Add, edit, or remove portfolio projects.
              </p>

              <form
                id="project-form"
                key={editingId ?? "new"}
                className="mt-5 grid scroll-mt-6 gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 md:grid-cols-2"
                onSubmit={onSubmitProject}
              >
                {editingId ? (
                  <div className="md:col-span-2 flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--badge-bg)] px-3 py-2 text-xs text-[var(--badge-text)]">
                    <span>
                      Editing <span className="font-medium">{editingProject?.title}</span>
                    </span>
                    <button
                      type="button"
                      onClick={cancelEditProject}
                      className="text-[var(--text-primary)] underline decoration-[var(--border)] underline-offset-4 hover:decoration-[var(--text-primary)]"
                    >
                      Cancel
                    </button>
                  </div>
                ) : null}
                <Input
                  label="Title"
                  name="title"
                  required
                  minLength={2}
                  maxLength={120}
                  defaultValue={editingProject?.title ?? ""}
                />
                <Input
                  label="Link (optional)"
                  name="href"
                  type="url"
                  placeholder="https://…"
                  defaultValue={editingProject?.href ?? ""}
                />
                <div className="md:col-span-2">
                  <Input
                    label="Summary"
                    name="summary"
                    required
                    minLength={5}
                    maxLength={280}
                    defaultValue={editingProject?.summary ?? ""}
                  />
                </div>
                <div className="md:col-span-2">
                  <Input
                    label="Tech (comma-separated)"
                    name="tech"
                    placeholder="React, TypeScript, FastAPI"
                    defaultValue={editingProject?.tech.join(", ") ?? ""}
                  />
                </div>
                <Input
                  label="Category (optional)"
                  name="category"
                  list="category-suggestions"
                  placeholder="Full stack"
                  maxLength={60}
                  defaultValue={editingProject?.category ?? ""}
                />
                <datalist id="category-suggestions">
                  {categorySuggestions.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
                <Input
                  label="GitHub URL (optional)"
                  name="github"
                  type="url"
                  placeholder="https://github.com/…"
                  defaultValue={editingProject?.github ?? ""}
                />
                <Input
                  label="Thumbnail URL (optional)"
                  name="thumbnail"
                  type="url"
                  placeholder="https://…/image.png"
                  defaultValue={editingProject?.thumbnail ?? ""}
                />
                <Checkbox
                  label="Featured on homepage"
                  name="featured"
                  defaultChecked={editingProject?.featured ?? false}
                />
                <div className="flex items-end gap-3 md:justify-end">
                  {editingId ? (
                    <button
                      type="button"
                      onClick={cancelEditProject}
                      className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--surface-strong)]"
                    >
                      Cancel
                    </button>
                  ) : null}
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-text)] transition disabled:opacity-60"
                  >
                    {saving ? "Saving…" : editingId ? "Save changes" : "Add project"}
                  </button>
                </div>
              </form>

              <ul className="mt-6 space-y-3">
                {projects.length === 0 ? (
                  <li className="text-sm text-[var(--text-muted)]">No projects yet.</li>
                ) : (
                  projects.map((p) => (
                    <li
                      key={p.id}
                      className={`flex items-start justify-between gap-4 rounded-2xl border p-4 transition-colors ${
                        p.id === editingId
                          ? "border-[var(--accent)] bg-[var(--surface-strong)]"
                          : "border-[var(--border)] bg-[var(--surface)]"
                      }`}
                    >
                      <div>
                        <div className="font-medium">
                          {p.title}
                          {p.category ? (
                            <span className="ml-2 rounded-full bg-[var(--badge-bg)] px-2 py-0.5 text-xs text-[var(--badge-text)]">
                              {p.category}
                            </span>
                          ) : null}
                          {p.featured ? (
                            <span className="ml-2 rounded-full border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--text-muted)]">
                              featured
                            </span>
                          ) : null}
                          {p.thumbnail ? (
                            <span className="ml-2 rounded-full border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--text-muted)]">
                              thumbnail
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-1 text-sm text-[var(--text-secondary)]">{p.summary}</div>
                        {p.tech.length > 0 ? (
                          <div className="mt-2 text-xs text-[var(--text-muted)]">{p.tech.join(" · ")}</div>
                        ) : null}
                        {p.github ? (
                          <div className="mt-1 text-xs text-[var(--text-muted)]">
                            <a
                              href={p.github}
                              className="underline decoration-[var(--border)] underline-offset-2 hover:text-[var(--text-primary)]"
                              target="_blank"
                              rel="noreferrer"
                            >
                              {p.github}
                            </a>
                          </div>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => startEditProject(p)}
                          className="rounded-xl border border-[var(--border)] px-3 py-1 text-xs text-[var(--text-primary)] transition hover:bg-[var(--surface-strong)]"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void onDeleteProject(p.id)}
                          className="rounded-xl border border-[var(--danger-border)] px-3 py-1 text-xs text-[var(--danger-text)] transition hover:bg-[var(--danger-bg)]"
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold">Testimonials</h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">Add or remove client quotes.</p>

              <form
                className="mt-5 grid gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 md:grid-cols-2"
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
                    className="inline-flex items-center justify-center rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-text)] transition"
                  >
                    Add testimonial
                  </button>
                </div>
              </form>

              <ul className="mt-6 space-y-3">
                {testimonials.length === 0 ? (
                  <li className="text-sm text-[var(--text-muted)]">No testimonials yet.</li>
                ) : (
                  testimonials.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-start justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"
                    >
                      <div>
                        <div className="font-medium">{t.name}</div>
                        <div className="text-sm text-[var(--text-muted)]">
                          {[t.role, t.company].filter(Boolean).join(" · ") || "—"}
                        </div>
                        <blockquote className="mt-2 text-sm text-[var(--text-secondary)]">{t.quote}</blockquote>
                      </div>
                      <button
                        type="button"
                        onClick={() => void onDeleteTestimonial(t.id)}
                        className="shrink-0 rounded-xl border border-[var(--danger-border)] px-3 py-1 text-xs text-[var(--danger-text)] transition hover:bg-[var(--danger-bg)]"
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
