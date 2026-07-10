<div align="center">

# 🍦 Stranger Gelatos — Plataforma 2D do Bento

**Jogo de plataforma 2D em pixel-art com tema de _Stranger Things_ — jogável no navegador e instalável no iPhone.**

![Status](https://img.shields.io/badge/status-ativo-22c55e)
![Plataforma](https://img.shields.io/badge/plataforma-web%20%2B%20PWA-0ea5e9)
![Engine](https://img.shields.io/badge/engine-HTML5%20Canvas-f59e0b)

[🎮 Jogar agora](https://stranger-gelatos.vercel.app) · [🗂 Ver no Alex Hub](https://alex-hub-three.vercel.app/repo/stranger-gelatos)

</div>

---

## 💡 O que é & motivação

**Stranger Gelatos** é um jogo de plataforma 2D em pixel-art (no espírito de _Mario_ e _Mega Man_) criado pelo Bento, unindo o universo da sorveteria **Bentô Gelatos** ao clima sombrio de _Stranger Things_.

A motivação: transformar a marca da gelateria em uma **experiência interativa** — um jogo leve, feito do zero com **HTML5 Canvas puro** (sem engine pronta), que roda liso em qualquer navegador e vira **app instalável no iPhone** com controles touch. Também foi um laboratório de física de jogos: coyote-time, input buffer, pulo variável e IA de inimigos, tudo implementado à mão.

**A história:** Bento explora a cidade até achar a sorveteria Bentô Gelatos. Lá entra num **portal** e cai no **Avesso** — precisa achar as **3 chaves**, derrotar **Demogorgons** e **Demo-dogs** com a **BENTÔLÉ gun** 🍦 (atira picolés!) e fugir pelo portal. **Whey** 🥤 cura, **freezers** 🧊 dão munição e **sorvetes** 🍨 são colecionáveis.

## 🎬 Demo

![Demo do jogo rodando](https://alex-hub-three.vercel.app/images/repos/stranger-gelatos/demo.gif)

| Desktop                                                                                   | Mobile (iPhone)                                                                                 |
| ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| ![Tela desktop](https://alex-hub-three.vercel.app/images/repos/stranger-gelatos/home.png) | ![Tela mobile](https://alex-hub-three.vercel.app/images/repos/stranger-gelatos/home.mobile.png) |

> 📸 As imagens acima são **recapturadas automaticamente toda segunda-feira** pelo [Alex Hub](https://alex-hub-three.vercel.app/repo/stranger-gelatos) — sempre mostram a versão em produção.

## 🧱 Stack

- **HTML5 Canvas** — renderização 2D, sem engine externa
- **JavaScript** puro (ES Modules) — física, IA, câmera e estados de jogo
- **WebAudio API** — efeitos sonoros sintetizados em tempo real
- **PWA** (manifest + service worker) — instalável e funciona **offline**
- **CSS** — HUD, telas e controles touch

```
js/
  main.js     # entrada, loop, telas, carregamento
  game.js     # estados, colisões, tiros, transição, desenho
  levels.js   # construção dos níveis (cidade e Avesso)
  physics.js  # colisão AABB com tiles + sondagem de chão
  player.js   # movimento, pulo, tiro, vida/munição
  enemy.js    # Demogorgon e Demo-dog (IA de patrulha/perseguição)
  items.js    # chave, whey, freezer, sorvete, portal
  camera.js   # scroll lateral
  input.js    # teclado + botões touch
  audio.js    # efeitos sonoros (WebAudio)
```

## 🚀 Instalação & como rodar

Não há build nem dependências — é estático:

```bash
git clone https://github.com/alexpiraginet-bot/Stranger-Gelatos.git
cd Stranger-Gelatos
python3 -m http.server 8000   # abra http://localhost:8000
```

**Instalar no iPhone:** abra no Safari → **Compartilhar ⎙ → Adicionar à Tela de Início** (ou toque em **📲 INSTALAR** na tela inicial do jogo). Abre em tela cheia e funciona offline.

## 🧪 Como testar (usuários & recrutadores)

Sem instalar nada — direto no navegador:

1. **Abra** 👉 <https://stranger-gelatos.vercel.app> (funciona no celular também).
2. **Controles no PC:** ← → mover · ↑/Espaço pular · `J`/`X` atirar · `Shift` correr.
3. **Controles no celular:** ◀ ▶ mover · ⤴ pular · 🍦 atirar (botões na tela).
4. **Roteiro de 2 minutos:** ande pela cidade até a sorveteria → entre no portal → no Avesso, pegue um **freezer** 🧊 (munição) e derrote um **Demogorgon** → colete uma **chave**.
5. **Para avaliar o código:** repare no _coyote-time_ (pular logo após sair da plataforma ainda funciona), no pulo variável (segurar = mais alto) e no **pisão** em cima dos inimigos — tudo em `js/physics.js` e `js/player.js`, sem engine.

> Versão anterior em 3D (primeira pessoa, Three.js) continua no histórico do Git.

## 🔗 Links

- 🎮 **Jogo ao vivo:** <https://stranger-gelatos.vercel.app>
- 🗂 **Página no hub (telas + status + docs):** <https://alex-hub-three.vercel.app/repo/stranger-gelatos>
- 📦 **Repositório:** <https://github.com/alexpiraginet-bot/Stranger-Gelatos>
