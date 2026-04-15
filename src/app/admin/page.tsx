"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

type SnapshotItem = {
  id: string;
  status: string;
  summaryText: string | null;
  sourceText: string | null;
  lastVerifiedAt: string;
  needsConfirmation: boolean;
  llmRejectSuggestion: boolean;
  llmRejectReason: string | null;
  lab: {
    id: string;
    labName: string;
    facultyName: string;
    facultyEmail: string | null;
  };
};

type AdminSubmissionsResponse = {
  needConfirmation: SnapshotItem[];
  allLabs: SnapshotItem[];
};

type SessionResponse = {
  ok: boolean;
  authenticated: boolean;
  email?: string;
};

type ProfessorContactItem = {
  email: string;
  isActive: boolean;
  statusSinceLastSurvey: "received" | "not_received" | "expired" | "rejected";
  lastLabUpdateAt?: string;
  labName?: string;
  waveId?: string;
};

type StudentItem = {
  id: string;
  email: string;
  isActive: boolean;
  subscribedAt: string;
  unsubscribedAt?: string | null;
};

async function getAdminSession(): Promise<SessionResponse> {
  const res = await fetch("/api/admin/auth/session", { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Failed to load admin session.");
  }
  return res.json();
}

async function getSubmissions(): Promise<AdminSubmissionsResponse> {
  const res = await fetch("/api/admin/submissions", { cache: "no-store" });
  if (res.status === 401) {
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    throw new Error("Failed to load submissions.");
  }
  return res.json();
}

async function getProfessors(): Promise<ProfessorContactItem[]> {
  const res = await fetch("/api/admin/professors", { cache: "no-store" });
  if (res.status === 401) {
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    throw new Error("Failed to load professor list.");
  }

  const payload = (await res.json()) as { ok: boolean; contacts: ProfessorContactItem[] };
  return payload.contacts;
}

async function getStudents(): Promise<StudentItem[]> {
  const res = await fetch("/api/admin/students", { cache: "no-store" });
  if (res.status === 401) {
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    throw new Error("Failed to load student list.");
  }

  const payload = (await res.json()) as { ok: boolean; students: StudentItem[] };
  return payload.students;
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

async function addProfessor(email: string): Promise<void> {
  const res = await fetch("/api/admin/professors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    throw new Error("Failed to add professor email.");
  }
}

async function removeProfessor(email: string): Promise<void> {
  const res = await fetch("/api/admin/professors", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    throw new Error("Failed to remove professor email.");
  }
}

async function addStudent(email: string): Promise<void> {
  const res = await fetch("/api/admin/students", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    throw new Error("Failed to add student email.");
  }
}

async function removeStudent(email: string): Promise<void> {
  const res = await fetch("/api/admin/students", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    throw new Error("Failed to remove student email.");
  }
}

async function sendManualSurvey(emails: string[]): Promise<void> {
  const res = await fetch("/api/admin/survey/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emails }),
  });

  if (!res.ok) {
    throw new Error("Failed to send manual survey.");
  }
}

async function collectManualSurvey(): Promise<void> {
  const res = await fetch("/api/admin/survey/collect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    throw new Error("Failed to collect survey responses.");
  }
}

function formatDate(value?: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toISOString().slice(0, 10);
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

  const [newProfessorEmail, setNewProfessorEmail] = useState("");
  const [newStudentEmail, setNewStudentEmail] = useState("");
  const [selectedProfessorEmails, setSelectedProfessorEmails] = useState<Record<string, boolean>>(
    {},
  );

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

  const submissionsQuery = useQuery({
    queryKey: ["admin-submissions"],
    queryFn: getSubmissions,
    enabled: isAuthenticated,
  });

  const professorsQuery = useQuery({
    queryKey: ["admin-professors"],
    queryFn: getProfessors,
    enabled: isAuthenticated,
  });

  const studentsQuery = useQuery({
    queryKey: ["admin-students"],
    queryFn: getStudents,
    enabled: isAuthenticated,
  });

  const isBusy = useMemo(() => Boolean(actionBusyId), [actionBusyId]);

  const selectedEmails = useMemo(() => {
    return Object.keys(selectedProfessorEmails).filter((email) => selectedProfessorEmails[email]);
  }, [selectedProfessorEmails]);

  const refreshAll = async () => {
    await Promise.all([
      submissionsQuery.refetch(),
      professorsQuery.refetch(),
      studentsQuery.refetch(),
    ]);
  };

  const needConfirmation = submissionsQuery.data?.needConfirmation ?? [];
  const allLabs = submissionsQuery.data?.allLabs ?? [];
  const professorContacts = professorsQuery.data ?? [];
  const students = studentsQuery.data ?? [];

  if (!authChecked) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-10">
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
    <section className="mx-auto max-w-7xl space-y-8 px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Admin dashboard</h1>
          <p className="mt-1 text-xs text-slate-600">Signed in as {adminEmail || "admin"}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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

      {submissionsQuery.isLoading || professorsQuery.isLoading || studentsQuery.isLoading ? (
        <p className="text-sm text-slate-700">Loading admin data...</p>
      ) : null}

      {submissionsQuery.isError || professorsQuery.isError || studentsQuery.isError ? (
        <p className="text-sm text-rose-700">Failed to load part of the admin data.</p>
      ) : null}

      {actionError ? <p className="text-sm text-rose-700">{actionError}</p> : null}

      <article className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-xl font-bold text-slate-900">Manual survey operations</h2>
        <p className="mt-1 text-sm text-slate-600">
          Manual send does not trigger expiration timer. Manual collect imports past 7-day responses.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={async () => {
              setActionError(null);
              setActionBusyId("manual-send");
              try {
                await sendManualSurvey(selectedEmails);
                await refreshAll();
              } catch (error) {
                setActionError(
                  error instanceof Error ? error.message : "Manual survey send failed.",
                );
              } finally {
                setActionBusyId(null);
              }
            }}
            disabled={isBusy || selectedEmails.length === 0}
            className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Send survey to selected professors ({selectedEmails.length})
          </button>

          <button
            onClick={async () => {
              setActionError(null);
              setActionBusyId("manual-collect");
              try {
                await collectManualSurvey();
                await refreshAll();
              } catch (error) {
                setActionError(
                  error instanceof Error ? error.message : "Manual collect failed.",
                );
              } finally {
                setActionBusyId(null);
              }
            }}
            disabled={isBusy}
            className="rounded-lg bg-amber-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Collect past 7-day survey responses
          </button>
        </div>
      </article>

      <article className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-xl font-bold text-slate-900">Professor email list</h2>

        <div className="mt-4 flex flex-wrap gap-2">
          <input
            type="email"
            value={newProfessorEmail}
            onChange={(event) => setNewProfessorEmail(event.target.value)}
            placeholder="Add professor email"
            className="w-80 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            onClick={async () => {
              setActionError(null);
              setActionBusyId("add-professor");
              try {
                await addProfessor(newProfessorEmail);
                setNewProfessorEmail("");
                await professorsQuery.refetch();
              } catch (error) {
                setActionError(error instanceof Error ? error.message : "Failed to add professor.");
              } finally {
                setActionBusyId(null);
              }
            }}
            disabled={isBusy || !newProfessorEmail.trim()}
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Add professor
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-700">
                <th className="px-2 py-2">Select</th>
                <th className="px-2 py-2">Email</th>
                <th className="px-2 py-2">Status since last survey</th>
                <th className="px-2 py-2">Lab</th>
                <th className="px-2 py-2">Last update</th>
                <th className="px-2 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {professorContacts.map((item) => (
                <tr key={item.email} className="border-b border-slate-100 align-top">
                  <td className="px-2 py-2">
                    <input
                      type="checkbox"
                      checked={Boolean(selectedProfessorEmails[item.email])}
                      onChange={(event) => {
                        const checked = event.target.checked;
                        setSelectedProfessorEmails((prev) => ({
                          ...prev,
                          [item.email]: checked,
                        }));
                      }}
                    />
                  </td>
                  <td className="px-2 py-2 text-slate-900">{item.email}</td>
                  <td className="px-2 py-2 text-slate-700">{item.statusSinceLastSurvey}</td>
                  <td className="px-2 py-2 text-slate-700">{item.labName ?? "(empty)"}</td>
                  <td className="px-2 py-2 text-slate-700">{formatDate(item.lastLabUpdateAt)}</td>
                  <td className="px-2 py-2">
                    <button
                      onClick={async () => {
                        setActionError(null);
                        setActionBusyId(`remove-professor:${item.email}`);
                        try {
                          await removeProfessor(item.email);
                          setSelectedProfessorEmails((prev) => {
                            if (!prev[item.email]) {
                              return prev;
                            }

                            const next = { ...prev };
                            delete next[item.email];
                            return next;
                          });
                          await refreshAll();
                        } catch (error) {
                          setActionError(
                            error instanceof Error ? error.message : "Failed to remove professor.",
                          );
                        } finally {
                          setActionBusyId(null);
                        }
                      }}
                      disabled={isBusy}
                      className="rounded-lg bg-rose-700 px-2 py-1 text-xs font-semibold text-white"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <article className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-xl font-bold text-slate-900">Student email list</h2>

        <div className="mt-4 flex flex-wrap gap-2">
          <input
            type="email"
            value={newStudentEmail}
            onChange={(event) => setNewStudentEmail(event.target.value)}
            placeholder="Add student email"
            className="w-80 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            onClick={async () => {
              setActionError(null);
              setActionBusyId("add-student");
              try {
                await addStudent(newStudentEmail);
                setNewStudentEmail("");
                await studentsQuery.refetch();
              } catch (error) {
                setActionError(error instanceof Error ? error.message : "Failed to add student.");
              } finally {
                setActionBusyId(null);
              }
            }}
            disabled={isBusy || !newStudentEmail.trim()}
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Add student
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-700">
                <th className="px-2 py-2">Email</th>
                <th className="px-2 py-2">Active</th>
                <th className="px-2 py-2">Subscribed</th>
                <th className="px-2 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {students.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 align-top">
                  <td className="px-2 py-2 text-slate-900">{item.email}</td>
                  <td className="px-2 py-2 text-slate-700">{item.isActive ? "yes" : "no"}</td>
                  <td className="px-2 py-2 text-slate-700">{formatDate(item.subscribedAt)}</td>
                  <td className="px-2 py-2">
                    <button
                      onClick={async () => {
                        setActionError(null);
                        setActionBusyId(`remove-student:${item.email}`);
                        try {
                          await removeStudent(item.email);
                          await studentsQuery.refetch();
                        } catch (error) {
                          setActionError(
                            error instanceof Error ? error.message : "Failed to remove student.",
                          );
                        } finally {
                          setActionBusyId(null);
                        }
                      }}
                      disabled={isBusy}
                      className="rounded-lg bg-rose-700 px-2 py-1 text-xs font-semibold text-white"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <article className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <h2 className="text-xl font-bold text-amber-900">Need confirmation</h2>
        <p className="mt-1 text-sm text-amber-800">
          Potential rejects from LLM or pending review records requiring admin decision.
        </p>

        <div className="mt-4 space-y-4">
          {needConfirmation.map((item) => (
            <article key={item.id} className="rounded-xl border border-amber-200 bg-white p-4">
              <h3 className="text-lg font-bold text-slate-900">{item.lab.labName}</h3>
              <p className="text-sm text-slate-700">Professor: {item.lab.facultyName}</p>
              <p className="text-sm text-slate-700">Email: {item.lab.facultyEmail ?? "(empty)"}</p>
              <p className="mt-1 text-sm text-slate-700">Status: {item.status}</p>
              <p className="mt-1 text-sm text-slate-700">Summary: {item.summaryText ?? "(empty)"}</p>
              {item.llmRejectSuggestion ? (
                <p className="mt-1 text-sm text-rose-700">
                  LLM reject suggestion: {item.llmRejectReason ?? "No reason provided"}
                </p>
              ) : null}

              <details className="mt-2">
                <summary className="cursor-pointer text-sm font-semibold text-slate-800">
                  Parsed website text
                </summary>
                <p className="mt-2 whitespace-pre-wrap text-xs text-slate-600">
                  {item.sourceText ?? "No parsed source text."}
                </p>
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
                          await refreshAll();
                        } catch (error) {
                          setActionError(
                            error instanceof Error ? error.message : "Approve failed.",
                          );
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
                          await refreshAll();
                        } catch (error) {
                          setActionError(
                            error instanceof Error ? error.message : "Reject failed.",
                          );
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
                      await refreshAll();
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
                      await refreshAll();
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
                      await refreshAll();
                    } catch (error) {
                      setActionError(
                        error instanceof Error ? error.message : "Delete lab failed.",
                      );
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

          {needConfirmation.length === 0 ? (
            <p className="text-sm text-slate-700">No records currently need confirmation.</p>
          ) : null}
        </div>
      </article>

      <article className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-xl font-bold text-slate-900">All labs (approved history)</h2>
        <p className="mt-1 text-sm text-slate-600">
          Labs shown here have at least one approved snapshot.
        </p>

        <div className="mt-4 space-y-4">
          {allLabs.map((item) => (
            <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-lg font-bold text-slate-900">{item.lab.labName}</h3>
              <p className="text-sm text-slate-700">Professor: {item.lab.facultyName}</p>
              <p className="text-sm text-slate-700">Email: {item.lab.facultyEmail ?? "(empty)"}</p>
              <p className="text-sm text-slate-700">Last update: {formatDate(item.lastVerifiedAt)}</p>
              <p className="mt-1 text-sm text-slate-700">Summary: {item.summaryText ?? "(empty)"}</p>

              <details className="mt-2">
                <summary className="cursor-pointer text-sm font-semibold text-slate-800">
                  Parsed website text
                </summary>
                <p className="mt-2 whitespace-pre-wrap text-xs text-slate-600">
                  {item.sourceText ?? "No parsed source text."}
                </p>
              </details>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={async () => {
                    setActionError(null);
                    setActionBusyId(`regenerate:${item.id}`);
                    try {
                      await postAction("regenerate_summary", item.id);
                      await refreshAll();
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
                      await refreshAll();
                    } catch (error) {
                      setActionError(
                        error instanceof Error ? error.message : "Delete lab failed.",
                      );
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

          {allLabs.length === 0 ? (
            <p className="text-sm text-slate-700">No approved labs yet.</p>
          ) : null}
        </div>
      </article>
    </section>
  );
}
