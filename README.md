# 🔦 Stranger Gelatos — O Mundo Invertido do Bento

Jogo de **aventura top-down** (estilo Zelda) com tema de *Stranger Things*, criado pelo Bento.

O Bento foi puxado para o **Mundo Invertido**: um lugar escuro e frio onde só
a luz da sua lanterna ilumina o caminho. Ele precisa encontrar **3 chaves**,
fugir (ou enfrentar) os **Demogorgons** e achar o **Portal** de volta para casa.

## 🎮 Como jogar

Abra o jogo no navegador (veja abaixo) e clique em **COMEÇAR**.

| Ação | Teclas |
|------|--------|
| Mover | `W A S D` ou setas |
| Atacar | `Espaço` |
| Pausar | `P` |

### Objetivo
1. Explore o mapa escuro usando sua lanterna.
2. Colete as **3 chaves** 🔑 (setas amarelas nas bordas apontam onde estão).
3. Recarregue a lanterna pegando **baterias** 🔦 — sem luz, fica quase tudo escuro!
4. Com as 3 chaves, vá até o **Portal** 🟣 para escapar e vencer.
5. Cuidado com os **Demogorgons** 🌸: encostar neles tira vida. Você pode
   derrotá-los com 2 ataques cada.

## ▶️ Como rodar localmente

O jogo é HTML5 + Canvas puro, sem dependências. Como usa módulos ES,
precisa ser servido por um servidor HTTP (não basta abrir o arquivo direto):

```bash
# Opção 1: Python
python3 -m http.server 8000

# Opção 2: Node
npx serve .
```

Depois abra **http://localhost:8000** no navegador.

## 🗂️ Estrutura do projeto

```
index.html        # Página, telas (início/game over/vitória) e HUD
css/style.css     # Estilo retro/terror do Mundo Invertido
js/
  config.js       # Constantes de gameplay e paleta de cores
  input.js        # Teclado (movimento, ataque, pausa)
  world.js        # Mapa em tiles, colisões, render do cenário
  player.js       # Bento: movimento, lanterna, ataque, vida
  enemy.js        # Demogorgon: perseguição, perambulação, combate
  items.js        # Chaves, baterias e o Portal de saída
  game.js         # Loop, câmera, escuridão/luz, colisões, vitória/derrota
  main.js         # Liga a UI ao jogo e roda o loop principal
```

## ✨ Recursos

- 🌑 **Escuridão dinâmica** com lanterna em cone de luz que tremula.
- 🔋 **Bateria** que drena com o tempo — o raio de luz encolhe quando acaba.
- 🧭 **Setas-guia** nas bordas apontando para os próximos objetivos.
- 👾 **Demogorgons** com IA simples: perambulam e perseguem ao avistar o Bento.
- 🗺️ Mapa com **câmera que segue** o jogador e geração de itens variada a cada partida.
