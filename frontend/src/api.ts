type ValidationIssue = { loc?: (string | number)[]; msg?: string };

async function parseError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { detail?: string | ValidationIssue[] };
    if (typeof data.detail === "string") return data.detail;
    if (Array.isArray(data.detail) && data.detail.length > 0) {
      return data.detail
        .map((issue) => {
          const field = issue.loc?.filter((p) => p !== "body").pop();
          const label = field ? String(field) : "input";
          return issue.msg ? `${label}: ${issue.msg}` : "Invalid input";
        })
        .join("; ");
    }
  } catch {
    /* ignore */
  }
  return `Request failed (${res.status})`;
}
export async function apiGetJson<T>(path: string): Promise<T> {
  const res = await fetch(path, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as T;
}

export async function apiPostJson<T>(
  path: string,
  body: unknown,
  token?: string | null,
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(path, { method: "POST", headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as T;
}

export async function apiDelete(path: string, token: string): Promise<void> {
  const res = await fetch(path, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
}
