import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { isUnlocked, unlockSite } from "@/lib/gate.functions";
import h7Logo from "@/assets/h7_logo.png.asset.json";

export const Route = createFileRoute("/unlock")({
  beforeLoad: async () => {
    const { unlocked } = await isUnlocked();
    if (unlocked) throw redirect({ to: "/" });
  },
  head: () => ({
    meta: [
      { title: "H7 CRYPTO — Acesso privado" },
      { name: "description", content: "Área restrita do H7 CRYPTO." },
      { property: "og:title", content: "H7 CRYPTO — Acesso privado" },
      { property: "og:description", content: "Área restrita do H7 CRYPTO." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Unlock,
});

function Unlock() {
  const router = useRouter();
  const unlock = useServerFn(unlockSite);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const password = new FormData(e.currentTarget).get("password") as string;
    try {
      const r = await unlock({ data: { password } });
      if (r.ok) await router.navigate({ to: "/" });
      else setError(r.locked ? "Muitas tentativas. Aguarde alguns minutos." : "Senha incorreta");
    } catch {
      setError("Erro ao verificar. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0d0b1a] px-6 text-slate-100">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5 rounded-3xl border border-purple-900/40 bg-[#160f2e] p-7 shadow-2xl">
        <div className="flex flex-col items-center gap-3">
          <img src={h7Logo.url} alt="H7 CRYPTO" className="h-20 w-20 rounded-2xl border border-violet-500/40 object-cover" />
          <h1 className="text-lg font-black tracking-widest">H7 CRYPTO</h1>
          <p className="text-xs text-purple-300/60">Acesso privado</p>
        </div>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Senha"
          required
          className="h-12 w-full rounded-2xl border border-purple-900/50 bg-[#0b0818] px-4 text-sm outline-none focus:border-violet-500"
        />
        {error && <p className="text-center text-xs text-rose-400">{error}</p>}
        <button disabled={busy} className="h-12 w-full rounded-2xl bg-violet-500 font-bold text-white hover:bg-violet-400 disabled:opacity-50">
          {busy ? "Verificando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
