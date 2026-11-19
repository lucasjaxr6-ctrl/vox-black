# VOX · Dashboard do lojista — código da demonstração

Site estático (Next.js `output: "export"`) que roda os componentes reais do
dashboard do painel VOX com dados fictícios gerados no navegador.

- `src/components/painel/` — componentes copiados do sistema (vox-dash), sem alteração de layout.
  `dashboard/DashboardViewOld.tsx` é o dashboard original, para a chave "Antes".
- `src/mvp/mock.ts` — gerador dos dados fictícios (vendas, carrinhos, funil, séries dos gráficos)
  e respostas falsas das rotas `/api` que os componentes chamam.
- `src/mvp/store.ts` + `shims/` — substituem `next/navigation` e `next/link`: o filtro de período
  troca o estado da página em vez de navegar; os outros itens do menu mostram um aviso.
- `src/app/page.tsx` — barra da apresentação (Antes/Depois, Desktop/Celular) e o quadro do painel.

## Gerar e publicar

```bash
npm install
NEXT_PUBLIC_BASE=/vox-black npx next build
# copiar o conteúdo de out/ para a raiz da branch main (com .nojekyll)
```
