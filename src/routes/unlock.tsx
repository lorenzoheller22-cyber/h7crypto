import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { isUnlocked, unlockSite } from "@/lib/gate.functions";
import { ArrowRight, Eye, EyeOff, Loader2, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  const [showPassword, setShowPassword] = useState(false);

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
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border px-6 sm:px-10">
        <span className="text-sm font-semibold">H7 CRYPTO</span>
        <span className="flex items-center gap-2 text-[11px] text-muted-foreground"><LockKeyhole className="h-3.5 w-3.5" /> Acesso privado</span>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 py-12">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-7">
        <div className="space-y-3 border-b border-border pb-7">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-panel text-muted-foreground"><LockKeyhole className="h-5 w-5" /></span>
          <h1 className="text-2xl font-semibold">Entrar no H7 CRYPTO</h1>
          <p className="text-sm text-muted-foreground">Acesso restrito</p>
        </div>
        <div className="space-y-2">
        <label htmlFor="site-password" className="text-xs font-medium">Senha de acesso</label>
        <div className="relative">
        <input
          id="site-password"
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          placeholder="Digite sua senha"
          required
          aria-invalid={!!error}
          aria-describedby={error ? "login-error" : undefined}
          className="h-12 w-full rounded border border-border bg-panel pl-3 pr-12 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-ring"
        />
        <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1.5 text-muted-foreground" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} title={showPassword ? "Ocultar senha" : "Mostrar senha"} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff /> : <Eye />}</Button>
        </div>
        {error && <p id="login-error" role="alert" className="text-xs text-destructive">{error}</p>}
        </div>
        <Button type="submit" disabled={busy} className="h-12 w-full justify-between shadow-none">
          {busy ? "Verificando" : "Entrar"}{busy ? <Loader2 className="animate-spin" /> : <ArrowRight />}
        </Button>
      </form>
      </main>
      <footer className="flex justify-between border-t border-border px-6 py-4 text-[10px] text-muted-foreground sm:px-10"><span>H7 CRYPTO</span><span>Terminal privado</span></footer>
    </div>
  );
}
