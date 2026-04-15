"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

type SnapshotItem = {
  id: string;
  status: string;
  summaryText: string | null;
  sourceText: string | null;
  lastVerifiedAt: string;
  lab: {
    id: string;
    labName: string;
    department: string;
  };
};

type SessionResponse = {
  ok: boolean;
  authenticated: boolean;
  email?: string;
};

async function getAdminSession(): Promise<SessionResponse> {
  const res = await fetch("/api/admin/auth/session", { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Failed to load admin session.");
  }
  return res.json();
}

async function getSubmissions(): Promise<SnapshotItem[]> {
  const res = await fetch("/api/admin/submissions", { cache: "no-store" });
  if (res.status === 401) {
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    throw new Error("Failed to load submissions.");
  }
  return res.json();
}

async function loginAdmin(email: string, password: string): Promise<void> {
  const res = await fetch("/api/admin/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    throw new Error("Invalid email or password.");
  }
}

async function logoutAdmin(): Promise<void> {
  await fetch("/api/admin/auth/logout", { method: "POST" });
}

async function postAction(action: string, snapshotId: string, summaryText?: string) {
  const endpoint =
    action === "regenerate_summary" ? "/api/admin/regenerate-summary" : "/api/admin/review";

  const body =
    action === "regenerate_summary"
      ? { snapshotId }
      : {
          snapshotId,
          action,
          summaryText,
        };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Action failed: ${action}`);
  }
}

async function deleteLab(labId: string): Promise<void> {
  const res = await fetch("/api/admin/labs", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ labId }),
  });

  if (!res.ok) {
    throw new Error("Failed to delete lab.");
  }
}

export default function AdminPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const session = await getAdminSession();
        setIsAuthenticated(session.authenticated);
        setAdminEmail(session.email ?? "");
        if (session.email) {
          setLoginEmail(session.email);
        }
      } catch {
        setIsAuthenticated(false);
      } finally {
        setAuthChecked(true);
      }
    })();
  }, []);

  const { data, refetch, isLoading, isError } = useQuery({
    queryKey: ["admin-submissions"],
    queryFn: getSubmissions,
    enabled: isAuthenticated,
  });

  const isBusy = useMemo(() => Boolean(actionBusyId), [actionBusyId]);

  if (!authChecked) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-sm text-slate-700">Checking admin session...</p>
      </section>
    );
  }

  if (!isAuthenticated) {
    return (
      <section className="mx-auto max-w-xl px-4 py-14">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-extrabold text-slate-900">Admin sign in</h1>
          <p className="mt-2 text-sm text-slate-600">
            Please log in to access the review dashboard.
          </p>

          <form
            className="mt-6 space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              setLoginError(null);
              setIsAuthenticating(true);

              try {
                await loginAdmin(loginEmail, loginPassword);
                const session = await getAdminSession();
                setIsAuthenticated(session.authenticated);
                setAdminEmail(session.email ?? "");
                setLoginPassword("");
              } catch (error) {
                setLoginError(error instanceof Error ? error.message : "Login failed.");
              } finally {
                setIsAuthenticating(false);
              }
            }}
          >
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-800">Email</label>
              <input
                type="email"
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-800">Password</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </div>

            {loginError ? <p className="text-sm text-rose-700">{loginError}</p> : null}

            <button
              type="submit"
              disabled={isAuthenticating}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isAuthenticating ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </article>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Admin review dashboard</h1>
          <p className="mt-1 text-xs text-slate-600">Signed in as {adminEmail || "admin"}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={async () => {
              setActionError(null);
              await fetch("/api/mock/ingest", { method: "POST" });
              await refetch();
            }}
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
          >
            Ingest mock submission
          </button>

          <button
            onClick={async () => {
              await logoutAdmin();
              setIsAuthenticated(false);
              setAdminEmail("");
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
          >
            Sign out
          </button>
        </div>
      </div>

      {isLoading ? <p className="mt-4 text-sm">Loading submissions...</p> : null}
      {isError ? <p className="mt-4 text-sm text-rose-700">Error loading submissions.</p> : null}
      {actionError ? <p className="mt-4 text-sm text-rose-700">{actionError}</p> : null}

      <div className="mt-6 space-y-4">
        {(data ?? []).map((item) => (
          <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-bold text-slate-900">{item.lab.labName}</h2>
            <p className="text-sm text-slate-700">{item.lab.department}</p>
            <p className="mt-2 text-sm text-slate-700">Status: {item.status}</p>
            <p className="mt-2 text-sm text-slate-700">Summary: {item.summaryText ?? "(empty)"}</p>
            <details className="mt-2">
              <summary className="cursor-pointer text-sm font-semibold text-slate-800">Parsed website text</summary>
              <p className="mt-2 whitespace-pre-wrap text-xs text-slate-600">{item.sourceText ?? "No parsed source text."}</p>
            </details>

            <div className="mt-4 flex flex-wrap gap-2">
              {item.status !== "approved" && item.status !== "rejected" ? (
                <>
                  <button
                    onClick={async () => {
                      setActionError(null);
                      setActionBusyId(`approve:${item.id}`);
                      try {
                        await postAction("approve", item.id);
                        await refetch();
                      } catch (error) {
                        setActionError(error instanceof Error ? error.message : "Approve failed.");
                      } finally {
                        setActionBusyId(null);
                      }
                    }}
                    disabled={isBusy}
                    className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white"
                  >
                    Approve
                  </button>
                  <button
                    onClick={async () => {
                      setActionError(null);
                      setActionBusyId(`reject:${item.id}`);
                      try {
                        await postAction("reject", item.id);
                        await refetch();
                      } catch (error) {
                        setActionError(error instanceof Error ? error.message : "Reject failed.");
                      } finally {
                        setActionBusyId(null);
                      }
                    }}
                    disabled={isBusy}
                    className="rounded-lg bg-rose-700 px-3 py-2 text-xs font-semibold text-white"
                  >
                    Reject
                  </button>
                </>
              ) : null}
              <button
                onClick={async () => {
                  const next = prompt("Edit summary", item.summaryText ?? "") ?? "";
                  setActionError(null);
                  setActionBusyId(`edit:${item.id}`);
                  try {
                    await postAction("edit_summary", item.id, next);
                    await refetch();
                  } catch (error) {
                    setActionError(error instanceof Error ? error.message : "Edit failed.");
                  } finally {
                    setActionBusyId(null);
                  }
                }}
                disabled={isBusy}
                className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-semibold text-white"
              >
                Edit summary
              </button>
              <button
                onClick={async () => {
                  setActionError(null);
                  setActionBusyId(`regenerate:${item.id}`);
                  try {
                    await postAction("regenerate_summary", item.id);
                    await refetch();
                  } catch (error) {
                    setActionError(
                      error instanceof Error ? error.message : "Regenerate summary failed.",
                    );
                  } finally {
                    setActionBusyId(null);
                  }
                }}
                disabled={isBusy}
                className="rounded-lg bg-indigo-700 px-3 py-2 text-xs font-semibold text-white"
              >
                Regenerate summary
              </button>

              <button
                onClick={async () => {
                  const confirmed = confirm(
                    "Delete this lab and all related submissions/snapshots? This cannot be undone.",
                  );
                  if (!confirmed) {
                    return;
                  }

                  setActionError(null);
                  setActionBusyId(`delete:${item.lab.id}`);
                  try {
                    await deleteLab(item.lab.id);
                    await refetch();
                  } catch (error) {
                    setActionError(error instanceof Error ? error.message : "Delete lab failed.");
                  } finally {
                    setActionBusyId(null);
                  }
                }}
                disabled={isBusy}
                className="rounded-lg bg-red-900 px-3 py-2 text-xs font-semibold text-white"
              >
                Delete lab
              </button>
            </div>
          </article>
        ))}
      </div>

      <button
        onClick={async () => {
          await fetch("/api/admin/publication/export", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: "Research Starters Hub Weekly" }),
          });
          await refetch();
        }}
        className="mt-8 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
      >
        Trigger newsletter export
      </button>
    </section>
  );
}
