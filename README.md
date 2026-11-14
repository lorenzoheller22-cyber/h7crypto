# H7Crypto

Eu quero criar um site no estilo deploytoken.now focado exclusivamente na funcionalidade de Copy Trending Coins (copiar tokens em alta e lançar com máxima visibilidade na Pump.fun, para ter compradores imediatos assim que for criada).

O app deve ter:
1. Feed em tempo real de tokens em alta (trending) da Solana e Pump.fun (com ticker, nome, imagem, market cap, volume, tempo de criação e variação).
2. Botão de cópia em 1 clique em cada card: ao clicar, abre o modal/formulário de lançamento já com nome, símbolo, imagem, descrição e parâmetros otimizados pré-preenchidos.
3. Conexão com carteiras Solana (Phantom, Solflare) via Solana Wallet Adapter.
4. Opções de lançamento com Dev Buy inicial (compra de largada pelo criador para impulsionar a liquidez e subir o gráfico de imediato) e prioridade de transação.
5. Taxa de serviço (fee) em SOL configurável para o dono da plataforma cobrada no ato do deploy.
6. Design escuro, moderno, ágil e estilo terminal DeFi / degen, com feedback visual claro das transações e links diretos para a moeda no Pump.fun e DexScreener.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://h7crypto.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/be451b70-0f9f-4fc4-b8f8-e8aeda450163).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
