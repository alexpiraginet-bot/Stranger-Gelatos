// ============================================================================
// GELO NINJA — progresso salvo no aparelho (localStorage).
// Guarda fase, ciclo, moedas, arma escolhida, recordes e estatísticas.
// Tudo tolerante a falha: se o navegador bloquear o storage, o jogo roda igual.
// ============================================================================

const KEY = 'gelo-ninja:v1';

const BASE = {
  level: 1,
  cycle: 1,
  maxLevel: 1,          // maior fase já vencida no ciclo 1 (libera armas)
  maxCycle: 1,
  coins: 0,
  weapon: 'picole',
  best: 0,              // maior pontuação de uma corrida
  score: 0,             // pontuação da corrida atual
  streak: 0,
  totalCuts: 0,
  totalKills: 0,
  perfects: 0,
  bosses: 0,
  muted: false,
  seenTutorial: false,
};

export const State = {
  data: { ...BASE },

  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) this.data = { ...BASE, ...JSON.parse(raw) };
    } catch (e) { /* storage bloqueado: segue com o padrão */ }
    return this.data;
  },

  save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* ignora */ }
  },

  reset() {
    const keep = { coins: this.data.coins, best: this.data.best, muted: this.data.muted, seenTutorial: true };
    this.data = { ...BASE, ...keep };
    this.save();
  },

  // Progresso total contínuo — usado no placar e nas estatísticas.
  get absLevel() { return (this.data.cycle - 1) * 100 + this.data.level; }
};
