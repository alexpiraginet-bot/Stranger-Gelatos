# 🍦 Stranger Gelatos 3D — O Mundo Invertido do Bento

Jogo **3D em primeira pessoa** (estilo Roblox) com tema de *Stranger Things*,
jogável no navegador — inclusive no **iPhone**, com controles touch e instalação
na tela inicial (PWA, tela cheia).

Bento caiu no **Mundo Invertido**: escuro, enevoado e cheio de Demogorgons.
Por sorte ele tem a **BENTÔLÉ gun** 🍦 — uma arma que atira picolés congelantes!
Encontre as **3 chaves**, derreta os monstros e chegue ao **Portal** para voltar
para casa. Pegue **potes de whey** 🥤 para regenerar vida e **baterias** 🔦 para
manter a lanterna acesa.

## 🎮 Controles

**No PC**
| Ação | Comando |
|------|---------|
| Mover | `W A S D` / setas |
| Olhar | Mouse (clique na tela para travar o cursor) |
| Atirar picolé | Clique ou `Espaço` |
| Correr | `Shift` |
| Pausar | `P` |

**No celular (iOS/Android)**
- **Joystick** no lado esquerdo da tela → mover
- **Arrastar** no lado direito → olhar ao redor
- Botão **🍦 ATIRAR** e botão **CORRER**

## 📲 Instalar no iPhone (tela cheia)

1. Abra o jogo no **Safari**.
2. Na tela inicial do jogo, toque em **📲 INSTALAR NO IPHONE** (mostra o passo a passo),
   ou use **Compartilhar ⎙ → Adicionar à Tela de Início**.
3. Abra pelo ícone do **BENTÔ** (versão assombrada) para jogar em tela cheia.

No Android/Chrome o botão faz a instalação com 1 toque. Depois de instalado,
o jogo também funciona **offline** (service worker).

## ▶️ Rodar localmente

Usa módulos ES + Three.js (via CDN), então precisa de um servidor HTTP:

```bash
python3 -m http.server 8000
# abra http://localhost:8000
```

> O Three.js é carregado do CDN (`unpkg.com`) via *import map* — precisa de internet
> no primeiro acesso; depois o service worker guarda em cache.

## 🗂️ Estrutura

```
index.html        # Telas, HUD, controles touch, PWA (manifest + ícones)
manifest.json     # Configuração do app instalável (PWA)
sw.js             # Service worker (cache offline)
css/style.css     # Estilo (HUD, joystick, botões, telas)
icons/            # Ícone assombrado do BENTÔ (vários tamanhos)
js/
  config.js       # Constantes e cores
  engine.js       # Three.js: renderer, cena, câmera, resize
  level.js        # Geração da grade + colisão (lógica pura, testável)
  world.js        # Constrói o cenário 3D (paredes, névoa, esporos, luzes)
  player.js       # Câmera 1ª pessoa, movimento, lanterna, vida/bateria
  weapon.js       # BENTÔLÉ gun 🍦 — modelo e projéteis de picolé
  enemy.js        # Demogorgon (modelo blocado + IA)
  items.js        # Chaves, baterias, whey e o Portal
  game.js         # Estados, loop, vitória/derrota, HUD
  controls.js     # Teclado/mouse (PC) + touch (joystick/olhar/botões)
  pwa.js          # Botão de instalar + registro do service worker
  main.js         # Liga tudo e roda o loop
```

## ✨ Destaques

- 🔫 **BENTÔLÉ gun** com picolés coloridos e recuo.
- 🌫️ **Mundo Invertido** 3D: névoa densa, esporos flutuantes, vinhas, lanterna em cone.
- 🥤 **Whey** regenera vida · 🔦 **baterias** recarregam a lanterna.
- 👾 **Demogorgons** que perambulam e perseguem, com cabeça-flor que abre ao atacar.
- 📱 **Jogável no iPhone** com controles touch e **instalável** em tela cheia (PWA + offline).
