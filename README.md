<div align="center">

# 🍦 Stranger Gelatos — Plataforma 2D do Bento

**Jogo de plataforma 2D em pixel-art com tema de _Stranger Things_ — jogável no navegador e instalável no iPhone.**

![Status](https://img.shields.io/badge/status-ativo-22c55e)
![Plataforma](https://img.shields.io/badge/plataforma-web%20%2B%20PWA-0ea5e9)
![Engine](https://img.shields.io/badge/engine-HTML5%20Canvas-f59e0b)

[🎮 Jogar agora](https://stranger-gelatos.vercel.app) · [🥷 Gelo Ninja](https://stranger-gelatos.vercel.app/ninja/) · [🗂 Ver no Alex Hub](https://alex-hub-three.vercel.app/repo/stranger-gelatos)

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

## 🥷 Gelo Ninja — o segundo jogo (`/ninja/`)

**[▶ Jogar](https://stranger-gelatos.vercel.app/ninja/)** · PWA independente, mesmo repositório e mesmo domínio.

Jogo de **corte de precisão** no espírito de _Shuriken Cut_ e _Knife Hit_, mas com bonecos
próprios: os **GELECOS** — criaturas geométricas de gelato. Nada de aparência humana e nada de
ferimento: cortados, eles mostram **recheio de gelato**, se partem em duas e derretem.

**Como funciona.** Arraste pra mirar, solte pra cortar. A lâmina voa no ângulo exato do arrasto e
o corpo do geleco é **recortado de verdade** (corte geométrico do polígono, não animação pronta):
todo corte arranca a fatia menor, que se solta e derrete. Cortou pelo núcleo? Morre de primeira.
Cortou de raspão? Perdeu a lâmina. É essa regra única que cria toda a skill do jogo.

| | |
|---|---|
| **100 fases** | dificuldade crescente, geradas por semente — a fase 37 é sempre a fase 37 |
| **Loop infinito** | terminou as 100, volta pra fase 1 num **ciclo** mais duro: mais gelecos, mais velocidade, corte mais exigente — e outro **sabor** repintando o jogo (Pistache → Franui → Dubai → Prestígio → Copa → Vazio → …) |
| **9 armas** | começa com uma; **cada chefe (de 10 em 10 fases) libera a próxima** |
| **10 chefes** | corpo colossal que você vai **esculpindo**, escudos de aço girando e filhotes em órbita |
| **Obstáculos** | ⬜ placa de aço quebra a lâmina · 💎 cristal proibido custa a fase · 🌀 vórtice entorta a rota |
| **Bônus** | 🍒 cereja dá moedas · **+1** devolve uma lâmina |

**Arsenal:** Lâmina de Picolé → Shuriken Gelado (ricocheteia) → Kunai de Cristal (fura armadura) →
Bumerangue Bentô (corta na volta) → Disco Zero (congela) → Estilhaço Trio (leque de 3) →
Serra Cósmica (corte contínuo) → Foice Curva (trajetória curva) → Cruz do Vazio (corte em X).

**Técnica.** Canvas 2D puro em vetor — nenhuma imagem para baixar, nítido em qualquer densidade de
tela. A arena tem largura fixa e **altura elástica**, então preenche o aparelho inteiro sem tarjas.
Motion feito à mão: hitstop no impacto, slow-motion no golpe final, tremor de câmera por trauma,
rasgo de luz na linha do corte, partículas de estilhaço/névoa e wobble de gelatina nos alvos.
Som 100% sintetizado (WebAudio). Progresso salvo no aparelho.

```
ninja/
  js/config.js   # tuning, sabores, arsenal
  js/levels.js   # gerador das 100 fases + escala dos ciclos
  js/slice.js    # geometria do corte (recorte de polígono por reta)
  js/geleco.js   # os bonecos: forma, arte, corte e morte
  js/blade.js    # a lâmina (voo, ricochete, curva, bumerangue) + linha de mira
  js/props.js    # placa, cereja, recarga, cristal proibido, vórtice
  js/fx.js       # partículas, tremor, hitstop, slow-mo, texto cinético
  js/render.js   # fundo, arena e a torre que arremessa
  js/game.js     # motor: colisões, combo, pontuação, fluxo de fase
  js/main.js     # telas, HUD, controles, PWA
```

## 🔗 Links

- 🎮 **Jogo ao vivo:** <https://stranger-gelatos.vercel.app>
- 🥷 **Gelo Ninja:** <https://stranger-gelatos.vercel.app/ninja/>
- 🗂 **Página no hub (telas + status + docs):** <https://alex-hub-three.vercel.app/repo/stranger-gelatos>
- 📦 **Repositório:** <https://github.com/alexpiraginet-bot/Stranger-Gelatos>
