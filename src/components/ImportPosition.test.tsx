import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublicKey } from "@solana/web3.js";
import { ImportPosition } from "./ImportPosition";
import { loadPositions } from "@/lib/positions";

const mocks = vi.hoisted(() => ({ balance: vi.fn(), info: vi.fn() }));
vi.mock("@solana/wallet-adapter-react", () => ({
  useConnection: () => ({ connection: {} }),
  useWallet: () => ({ publicKey: new PublicKey("So11111111111111111111111111111111111111112") }),
}));
vi.mock("@/lib/pump.functions", () => ({ getCoinsInfo: mocks.info }));
vi.mock("@/lib/import-position", async (original) => ({ ...(await original<typeof import("@/lib/import-position")>()), readImportBalance: mocks.balance }));

describe("import CA flow", () => {
  beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); });
  it("consults a CA then saves the selected wallet position without inventing PnL", async () => {
    const ca = "So11111111111111111111111111111111111111112";
    mocks.balance.mockResolvedValue(123);
    mocks.info.mockResolvedValue({ [ca]: { name: "Example", symbol: "EX", image: null } });
    render(<ImportPosition />);
    fireEvent.click(screen.getByRole("button", { name: "Importar CA" }));
    fireEvent.change(screen.getByLabelText("Endereço da moeda (CA)"), { target: { value: ca } });
    fireEvent.click(screen.getByRole("button", { name: "Consultar" }));
    fireEvent.click(await screen.findByRole("button", { name: "Adicionar ao painel" }));
    await waitFor(() => expect(loadPositions()).toHaveLength(1));
    expect(loadPositions()[0]).toMatchObject({ mint: ca, owner: ca, symbol: "EX", investedSol: 0, costBasisKnown: false });
    fireEvent.click(screen.getByRole("button", { name: "Importar CA" }));
    fireEvent.change(screen.getByLabelText("Endereço da moeda (CA)"), { target: { value: ca } });
    fireEvent.click(screen.getByRole("button", { name: "Consultar" }));
    await screen.findByRole("alert");
    expect(loadPositions()).toHaveLength(1);
    expect(mocks.balance).toHaveBeenCalledTimes(1);
  });
});