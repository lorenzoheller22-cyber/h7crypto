import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { ArrowDownToLine, Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCoinsInfo } from "@/lib/pump.functions";
import { importedPosition, parseMint, readImportBalance } from "@/lib/import-position";
import { loadPositions, savePosition } from "@/lib/positions";

type Preview = { mint: string; owner: string; name: string; symbol: string; image: string | null; balance: number };

export function ImportPosition() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [open, setOpen] = useState(false);
  const [address, setAddress] = useState("");
  const [cost, setCost] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function lookup(event: React.FormEvent) {
    event.preventDefault();
    if (!publicKey) return;
    setBusy(true); setError(""); setPreview(null); setMessage("");
    try {
      const mint = parseMint(address);
      const owner = publicKey.toBase58();
      if (loadPositions().some((p) => p.mint === mint.toBase58() && p.owner === owner)) throw new Error("Essa moeda já está no seu painel.");
      const [balance, coins] = await Promise.all([
        readImportBalance(connection, publicKey, mint),
        getCoinsInfo({ data: { mints: [mint.toBase58()] } }),
      ]);
      const coin = coins[mint.toBase58()];
      if (!coin?.name || !coin.symbol) throw new Error("Moeda não encontrada na Pump.fun. Confira o CA e tente novamente.");
      setPreview({ mint: mint.toBase58(), owner, name: coin.name, symbol: coin.symbol, image: coin.image, balance });
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível consultar a moeda. Tente novamente."); }
    finally { setBusy(false); }
  }

  function add() {
    if (!preview || publicKey?.toBase58() !== preview.owner) { setError("A carteira mudou. Consulte a moeda novamente."); return; }
    try {
      if (loadPositions().some((p) => p.mint === preview.mint && p.owner === preview.owner)) throw new Error("Essa moeda já está no seu painel.");
      savePosition(importedPosition(preview.mint, preview.owner, { name: preview.name, symbol: preview.symbol, image: preview.image }, cost));
      setMessage(`${preview.symbol} adicionada ao painel`); setOpen(false); setPreview(null); setAddress(""); setCost("");
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível salvar a moeda."); }
  }

  return (
    <section className="space-y-3 border-b border-border pb-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Minhas moedas</h2>
        <Button variant="outline" size="sm" disabled={!publicKey} onClick={() => { setOpen(!open); setError(""); setMessage(""); }}><ArrowDownToLine /> Importar CA</Button>
      </div>
      {message && <p role="status" className="text-xs text-positive">{message}</p>}
      {open && (
        <form onSubmit={lookup} className="space-y-3">
          <div className="flex items-center justify-between"><label htmlFor="import-ca" className="text-xs text-muted-foreground">Endereço da moeda (CA)</label><Button variant="ghost" size="icon" type="button" aria-label="Fechar importação" onClick={() => setOpen(false)}><X /></Button></div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input id="import-ca" required value={address} onChange={(e) => { setAddress(e.target.value); setPreview(null); setError(""); }} autoComplete="off" spellCheck={false} placeholder="Cole o endereço completo" className="num h-10 min-w-0 flex-1 border border-border bg-background px-3 text-xs outline-none focus:border-primary" />
            <Button type="submit" disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <Search />} {busy ? "Consultando" : "Consultar"}</Button>
          </div>
          {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
          {preview && preview.owner === publicKey?.toBase58() && (
            <div className="space-y-3 border-l-2 border-primary pl-3">
              <div className="flex items-center gap-3">
                {preview.image && <img src={preview.image} alt="" className="h-9 w-9 rounded object-cover" />}
                <div className="min-w-0"><p className="break-words text-sm font-medium">{preview.name} <span className="text-muted-foreground">${preview.symbol}</span></p><p className="num text-xs text-muted-foreground">Saldo: {preview.balance.toLocaleString("pt-BR", { maximumFractionDigits: 6 })}</p></div>
              </div>
              {preview.balance === 0 && <p className="text-xs text-muted-foreground">Sem tokens nesta carteira. Venda indisponível.</p>}
              <label className="block space-y-1"><span className="text-xs text-muted-foreground">Custo da posição (SOL, opcional)</span><input type="number" min="0" step="any" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="Não informado" className="num h-9 w-full border border-border bg-background px-3 text-xs outline-none focus:border-primary" /></label>
              <Button type="button" onClick={add}><ArrowDownToLine /> Adicionar ao painel</Button>
            </div>
          )}
        </form>
      )}
    </section>
  );
}