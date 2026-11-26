# Convite web · 15 anos da Suellen

Site estático (HTML/CSS/JS) com confirmação de presença gravada numa planilha do Google.

```
convite-suellen/
├── index.html        página do convite
├── style.css         visual
├── config.js         ← ÚNICO arquivo que precisa editar
├── script.js         lógica (portão, vaga-lumes, contagem, formulário, PIX)
├── fonts/            fontes hospedadas no próprio site (Great Vibes, Cormorant, Cinzel)
├── img/              arco de flores, ramos, jardim do rodapé e imagem de prévia do WhatsApp
└── apps-script/
    └── Code.gs       código que vai na planilha do Google
```

## 1. Planilha + Apps Script (recebe as confirmações)

1. Crie uma planilha nova no Google Sheets (ex.: "Confirmações 15 anos Suellen").
2. Menu **Extensões → Apps Script**. Apague o que estiver lá e cole o conteúdo de `apps-script/Code.gs`. Salve.
3. Clique em **Implantar → Nova implantação**.
   - Tipo: **App da Web**
   - Executar como: **Eu**
   - Quem pode acessar: **Qualquer pessoa**
4. Autorize com sua conta Google (vai aparecer "app não verificado" → *Avançado* → *Acessar*; é normal, o app é seu).
5. Copie a URL que termina em `/exec` e cole em `urlPlanilha` no `config.js`.
6. Teste: abra essa URL no navegador, deve aparecer "recebendo confirmações ✔".

> Se mudar o `Code.gs` depois, use **Implantar → Gerenciar implantações → editar → Nova versão** para a URL continuar a mesma.

A aba "Confirmações" é criada sozinha no primeiro envio, com o **total de pessoas confirmadas** na célula I2. Compartilhe a planilha com quem for organizar a festa.

## 2. Editar o `config.js`

Endereço real, nome do salão, link do Google Maps, WhatsApp (só dígitos, com 55 + DDD), prazo de confirmação, máximo de pessoas por convite, lista de presentes e chave PIX.

## 3. Publicar no GitHub Pages

```bash
cd convite-suellen
git init
git add .
git commit -m "Convite 15 anos Suellen"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/convite-suellen.git
git push -u origin main
```

No GitHub: **Settings → Pages → Source: Deploy from a branch → main / (root) → Save**.
Em 1–2 minutos o site fica em `https://SEU-USUARIO.github.io/convite-suellen/`.

Depois, troque `SEU-USUARIO` nas tags `og:` do `index.html` (a prévia do WhatsApp precisa do endereço completo da imagem) e dê outro push.

> O WhatsApp guarda a prévia em cache. Teste a prévia mandando o link para você mesmo **só depois** de tudo pronto.

## Testar no computador

```bash
python3 -m http.server 8000
# abra http://localhost:8000
```

## Observações

- **Mudou algo e o navegador continua mostrando a versão antiga?** É cache. No `index.html`, aumente o número em `?v=4` (nos 3 lugares: style.css, config.js e script.js) e dê push. No PC, Ctrl+Shift+R força a atualização.

- O envio usa `fetch` com `mode: "no-cors"` porque o Apps Script não devolve cabeçalho CORS. O dado grava normalmente; o site só não consegue ler a resposta.
- Tem um campo invisível anti-robô e proteção contra fórmulas injetadas na planilha.
- Depois do prazo, o formulário some e aparece só o botão de WhatsApp.
