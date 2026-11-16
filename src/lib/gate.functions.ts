import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { redirect } from "@tanstack/react-router";

type GateSession = { unlocked?: boolean };

function sessionConfig() {
  return {
    password: process.env["SESSION_SECRET"]!,
    name: "h7-gate",
    maxAge: 60 * 60 * 24 * 30,
    cookie: { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" },
  };
}

async function sha(s: string) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
}
async function matches(input: string, expected: string) {
  const [a, b] = await Promise.all([sha(input), sha(expected)]);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

// Simple in-memory brute-force brake per worker instance
const fails = new Map<string, { n: number; until: number }>();

export const requireUnlocked = createServerFn({ method: "GET" }).handler(async () => {
  const s = await useSession<GateSession>(sessionConfig());
  if (!s.data.unlocked) throw redirect({ to: "/unlock" });
  return { ok: true };
});

export const isUnlocked = createServerFn({ method: "GET" }).handler(async () => {
  const s = await useSession<GateSession>(sessionConfig());
  return { unlocked: !!s.data.unlocked };
});

export const unlockSite = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string }) => ({ password: String(d?.password ?? "").slice(0, 200) }))
  .handler(async ({ data }) => {
    const expected = process.env["SITE_PASSWORD"];
    if (!expected) throw new Error("Acesso indisponível");
    const key = "global";
    const f = fails.get(key);
    if (f && f.until > Date.now()) return { ok: false as const, locked: true };
    if (!(await matches(data.password, expected))) {
      const n = (f?.n ?? 0) + 1;
      fails.set(key, { n, until: n >= 5 ? Date.now() + 60_000 * Math.min(n - 4, 15) : 0 });
      await new Promise((r) => setTimeout(r, 600));
      return { ok: false as const, locked: false };
    }
    fails.delete(key);
    const s = await useSession<GateSession>(sessionConfig());
    await s.update({ unlocked: true });
    return { ok: true as const, locked: false };
  });

export const lockSite = createServerFn({ method: "POST" }).handler(async () => {
  const s = await useSession<GateSession>(sessionConfig());
  await s.clear();
  return { ok: true };
});
