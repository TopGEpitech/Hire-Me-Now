"use client";

import { KeyRound, LogOut } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { Role } from "@/core/domain/access/rbac";
import { cn } from "@/ui/cn";

type Call = { method: string; path: string; status: number; body: unknown; ms: number };

const ENDPOINTS = [
  { path: "/api/me", note: "who am I" },
  { path: "/api/contact", note: "recruiter +" },
  { path: "/api/admin/audit", note: "admin only" },
  { path: "/api/profile", note: "everyone" },
  { path: "/api/pokemon/pikachu", note: "everyone" },
];

const ROLE_STYLE: Record<Role, string> = {
  visitor: "bg-muted",
  recruiter: "bg-emerald-500 text-white",
  admin: "bg-primary text-primary-foreground",
};

async function call(method: string, path: string, body?: unknown): Promise<Call> {
  const t0 = performance.now();
  const res = await fetch(path, {
    method,
    credentials: "same-origin",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {}
  return { method, path, status: res.status, body: parsed, ms: Math.round(performance.now() - t0) };
}

// long payloads (profile, pokemon) get cut, nobody reads 300 lines in a widget
const preview = (body: unknown) => {
  const out = JSON.stringify(body, null, 2);
  return out.length > 1600 ? `${out.slice(0, 1600)}\n  ... (cut, ${out.length} chars total)` : out;
};

export function ApiPlayground() {
  const [role, setRole] = useState<Role>("visitor");
  const [code, setCode] = useState("");
  const [calls, setCalls] = useState<Call[]>([]);
  const [pending, setPending] = useState(false);

  const run = useCallback(async (method: string, path: string, body?: unknown) => {
    setPending(true);
    try {
      const result = await call(method, path, body);
      setCalls((c) => [result, ...c].slice(0, 6));
      // refresh the badge after anything that can change the session
      const me = await call("GET", "/api/me");
      if (me.status === 200) setRole((me.body as { role: Role }).role);
      return result;
    } finally {
      setPending(false);
    }
  }, []);

  useEffect(() => {
    call("GET", "/api/me").then((me) => me.status === 200 && setRole((me.body as { role: Role }).role));
  }, []);

  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b-2 bg-muted/60 p-4">
        <span className="text-sm font-semibold">You are:</span>
        <span
          className={cn("rounded-full border-2 px-3 py-0.5 font-mono text-sm font-bold uppercase", ROLE_STYLE[role])}
        >
          {role}
        </span>

        <form
          className="ml-auto flex w-full gap-2 sm:w-auto"
          onSubmit={async (e) => {
            e.preventDefault();
            const res = await run("POST", "/api/auth/session", { accessCode: code });
            if (res.status === 201) setCode("");
          }}
        >
          <label className="sr-only" htmlFor="access-code">
            Access code
          </label>
          <input
            id="access-code"
            type="password"
            autoComplete="off"
            placeholder="access code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="min-w-0 flex-1 rounded-md border-2 bg-card px-3 py-1.5 font-mono text-sm outline-none focus:ring-2 focus:ring-ring sm:w-44"
          />
          <button
            disabled={!code || pending}
            className="inline-flex items-center gap-1.5 rounded-md border-2 bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            <KeyRound className="size-4" /> Log in
          </button>
          {role !== "visitor" && (
            <button
              type="button"
              onClick={() => run("DELETE", "/api/auth/session")}
              className="inline-flex items-center gap-1.5 rounded-md border-2 bg-card px-3 py-1.5 text-sm font-bold"
            >
              <LogOut className="size-4" />
              <span className="sr-only sm:not-sr-only">Log out</span>
            </button>
          )}
        </form>
      </div>

      <div className="grid md:grid-cols-[14rem_1fr]">
        <ul className="flex flex-wrap gap-2 border-b-2 p-4 md:flex-col md:border-b-0 md:border-r-2">
          {ENDPOINTS.map((ep) => (
            <li key={ep.path}>
              <button
                onClick={() => run("GET", ep.path)}
                disabled={pending}
                className="w-full rounded-md border-2 bg-card px-3 py-1.5 text-left font-mono text-xs shadow-hard-sm hover:bg-accent disabled:opacity-60"
              >
                <span className="font-bold text-emerald-700">GET</span> {ep.path}
                <span className="block text-[10px] text-muted-foreground">{ep.note}</span>
              </button>
            </li>
          ))}
        </ul>

        <div className="screen m-4 min-h-72 overflow-hidden rounded-lg p-4 text-xs" aria-live="polite">
          {calls.length === 0 ? (
            <p className="opacity-80">
              {"> "}No code? Then you&apos;re a visitor. Hit /api/contact + enjoy your 403.
              <span aria-hidden className="ml-1 animate-blink">
                ▌
              </span>
            </p>
          ) : (
            <ul className="space-y-4">
              {calls.map((c, i) => (
                <li key={`${c.path}-${calls.length - i}`} className={cn(i > 0 && "opacity-50")}>
                  <p>
                    {"> "}
                    {c.method} {c.path}{" "}
                    <span
                      className={cn(
                        "rounded px-1.5 font-bold",
                        c.status < 300
                          ? "bg-emerald-400/20 text-emerald-300"
                          : c.status < 500
                            ? "bg-yellow-400/20 text-yellow-200"
                            : "bg-red-400/20 text-red-300",
                      )}
                    >
                      {c.status}
                    </span>{" "}
                    <span className="opacity-60">{c.ms}ms</span>
                  </p>
                  {i === 0 && (
                    <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words">{preview(c.body)}</pre>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
