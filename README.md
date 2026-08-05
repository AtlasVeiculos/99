# Painel do Carro — Operação 99

Site simples (HTML + CSS + JS puro, sem build) pra controlar km, ganhos e
gastos do carro na operação de motorista de aplicativo, com a meta de que a
99 pague todo o custo do carro e ainda sobre lucro.

Os dados ficam salvos no `localStorage` do navegador (por aparelho). Use os
botões **Exportar/Importar** em Config pra fazer backup ou levar os dados
pra outro celular/computador.

## Como colocar no ar (GitHub Pages) — 5 minutos

1. Crie um repositório novo no GitHub (pode ser privado), por exemplo `painel-99`.
2. Envie estes 3 arquivos pra raiz do repositório: `index.html`, `styles.css`, `app.js`.
   - Pelo site do GitHub: abra o repositório → **Add file → Upload files** → arraste os três arquivos → **Commit changes**.
   - Ou pelo terminal:
     ```bash
     git init
     git add index.html styles.css app.js README.md
     git commit -m "painel do carro"
     git branch -M main
     git remote add origin https://github.com/SEU-USUARIO/painel-99.git
     git push -u origin main
     ```
3. No repositório, vá em **Settings → Pages**.
4. Em **Source**, escolha **Deploy from a branch**, branch **main**, pasta **/ (root)** → **Save**.
5. Espere 1-2 minutos e o GitHub mostra o link do site, algo como:
   `https://SEU-USUARIO.github.io/painel-99/`

Pronto — abre esse link no celular, adiciona à tela inicial (Safari/Chrome:
"Adicionar à tela de início") e usa como um app.

## Se o repositório for privado

GitHub Pages de repositório privado só funciona em planos pagos (Pro,
Team, etc.). Se o seu GitHub for gratuito, deixe o repositório **público**
— o conteúdo é só a ferramenta em si, nenhum dado seu fica no código (os
lançamentos moram no navegador de quem acessa, não no repositório).

## Estrutura dos arquivos

- `index.html` — estrutura da página e import das fontes.
- `styles.css` — todo o visual (cores, layout, responsivo).
- `app.js` — toda a lógica: cálculos, telas, gráficos e salvamento local.

## Atualizando o site depois

Qualquer alteração nos arquivos: só subir de novo (upload ou `git push`) que
o GitHub Pages atualiza sozinho em menos de um minuto. Os dados já
lançados não somem — eles ficam no navegador, não no repositório.
