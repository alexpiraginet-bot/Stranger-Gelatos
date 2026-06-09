# 🍦 Stranger Gelatos — Plataforma 2D do Bento

Jogo de **plataforma 2D em pixel-art** (estilo Mario/Mega Man) com tema de
*Stranger Things*, jogável no navegador e no **iPhone** (controles touch + PWA
instalável). Feito com **HTML5 Canvas** — leve e roda liso no celular.

Bento explora a cidade até achar a sorveteria **Bentô Gelatos**. Lá entra num
**portal** e cai no **Avesso**: precisa achar as **3 chaves**, derrotar
**Demogorgons** e **Demo-dogs** com a **BENTÔLÉ gun** 🍦 (atira picolés!) e fugir
pelo portal. **Whey** 🥤 cura, **freezers** 🧊 dão munição e **sorvetes** 🍨 são
colecionáveis.

> Versão anterior em 3D (primeira pessoa, Three.js) continua no histórico do Git.

## 🎮 Controles

**PC:** ← → mover · ↑ / Espaço pular · `J`/`X` atirar · `Shift` correr
**Celular:** ◀ ▶ mover · ⤴ pular · 🍦 atirar (botões na tela)

Mecânicas: pulo com *coyote-time* e buffer, pulo variável (segurar = mais alto),
**pisão** (cair em cima derrota inimigos), tiro com munição, vãos e espinhos.

## 📲 Instalar no iPhone
Abra no Safari → **Compartilhar ⎙ → Adicionar à Tela de Início**, ou use o botão
**📲 INSTALAR** na tela inicial. Abre em tela cheia e funciona **offline**.

## ▶️ Rodar localmente
```bash
python3 -m http.server 8000   # abra http://localhost:8000
```

## 🗂️ Estrutura
```
index.html        # telas, HUD, controles touch, PWA
manifest.json · sw.js   # app instalável + cache offline
css/style.css
sprites/          # pixel-art (personagem, monstros, itens, tiles, fundos)
icons/            # ícone assombrado do BENTÔ
js/
  main.js     # entrada, loop, telas, carregamento
  game.js     # estados, colisões, tiros, transição, desenho
  levels.js   # construção dos níveis (cidade e Avesso) — lógica pura
  physics.js  # colisão AABB com tiles + sondagem de chão
  player.js   # jogador (movimento, pulo, tiro, vida/munição)
  enemy.js    # Demogorgon e Demo-dog (IA de patrulha/perseguição)
  items.js    # chave, whey, freezer, sorvete, portal, sorveteria
  camera.js   # scroll lateral
  input.js    # teclado + botões touch
  audio.js    # efeitos sonoros sintetizados (WebAudio)
  assets.js   # carregamento dos sprites
  config.js   # constantes
  pwa.js      # instalação + service worker
```

## ✨ Destaques
- 🕹️ Plataforma 2D pixel-art com física de pulo gostosa (coyote-time, pisão).
- 🌗 Dois mundos: **cidade** clara → **Avesso** escuro (fundos parallax próprios).
- 👾 Dois inimigos: **Demogorgon** (resistente) e **Demo-dog** (rápido).
- 🍦 **BENTÔLÉ gun** com munição reabastecida em **freezers**.
- 📱 Touch + **PWA** instalável e offline.
