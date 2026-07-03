// ===== ÁLBUM COPA 2026 (Panini) — estrutura de dados =====
// Lista EDITÁVEL: ajuste seleções/quantidade de cromos conforme o checklist
// oficial do seu álbum. O app inteiro se adapta sozinho a esta tabela.

// Seção especial (capa do álbum): troféu, mascotes, bola e estádios
export const SPECIAL = {
  code: 'FWC', name: 'Copa 2026', flag: '🏆', count: 30,
  labels: {
    1: 'Troféu', 2: 'Logo oficial', 3: 'Mascote Maple 🦌', 4: 'Mascote Zayu 🐆',
    5: 'Mascote Clutch 🦅', 6: 'Bola oficial', 7: 'Estádio', 8: 'Estádio', 9: 'Estádio',
    10: 'Estádio', 11: 'Estádio', 12: 'Estádio', 13: 'Estádio', 14: 'Estádio', 15: 'Estádio',
    16: 'Estádio', 17: 'Estádio', 18: 'Estádio', 19: 'Estádio', 20: 'Estádio', 21: 'Estádio',
    22: 'Estádio', 23: 'Cidade-sede', 24: 'Cidade-sede', 25: 'Cidade-sede', 26: 'Cidade-sede',
    27: 'História da Copa', 28: 'História da Copa', 29: 'História da Copa', 30: 'História da Copa',
  },
};

// Coleção exclusiva BENTÔ WORLDCUP 26: 10 sabores por países + selo extra 🏆🍦
export const BENTO = {
  code: 'BEN', name: 'Bentô Worldcup', flag: '🍦', count: 11,
  labels: {
    1: 'Sabor Itália 🇮🇹', 2: 'Sabor Brasil 🇧🇷', 3: 'Sabor França 🇫🇷', 4: 'Sabor Alemanha 🇩🇪',
    5: 'Sabor Argentina 🇦🇷', 6: 'Sabor Espanha 🇪🇸', 7: 'Sabor Portugal 🇵🇹', 8: 'Sabor Inglaterra 🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    9: 'Sabor Uruguai 🇺🇾', 10: 'Sabor México 🇲🇽', 11: 'Selo Extra Especial ⭐',
  },
};

// Cromos por seleção: 1=Escudo · 2=Foto da Seleção · 3..19=Jogadores
export const PER_TEAM = 19;

export const TEAMS = [
  // Sedes
  { code: 'USA', name: 'Estados Unidos', flag: '🇺🇸' },
  { code: 'MEX', name: 'México', flag: '🇲🇽' },
  { code: 'CAN', name: 'Canadá', flag: '🇨🇦' },
  // América do Sul
  { code: 'ARG', name: 'Argentina', flag: '🇦🇷' },
  { code: 'BRA', name: 'Brasil', flag: '🇧🇷' },
  { code: 'URU', name: 'Uruguai', flag: '🇺🇾' },
  { code: 'COL', name: 'Colômbia', flag: '🇨🇴' },
  { code: 'ECU', name: 'Equador', flag: '🇪🇨' },
  { code: 'PAR', name: 'Paraguai', flag: '🇵🇾' },
  // Europa
  { code: 'GER', name: 'Alemanha', flag: '🇩🇪' },
  { code: 'ESP', name: 'Espanha', flag: '🇪🇸' },
  { code: 'FRA', name: 'França', flag: '🇫🇷' },
  { code: 'ENG', name: 'Inglaterra', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { code: 'POR', name: 'Portugal', flag: '🇵🇹' },
  { code: 'NED', name: 'Holanda', flag: '🇳🇱' },
  { code: 'BEL', name: 'Bélgica', flag: '🇧🇪' },
  { code: 'CRO', name: 'Croácia', flag: '🇭🇷' },
  { code: 'ITA', name: 'Itália', flag: '🇮🇹' },
  { code: 'SUI', name: 'Suíça', flag: '🇨🇭' },
  { code: 'AUT', name: 'Áustria', flag: '🇦🇹' },
  { code: 'DEN', name: 'Dinamarca', flag: '🇩🇰' },
  { code: 'NOR', name: 'Noruega', flag: '🇳🇴' },
  { code: 'POL', name: 'Polônia', flag: '🇵🇱' },
  { code: 'SCO', name: 'Escócia', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
  { code: 'TUR', name: 'Turquia', flag: '🇹🇷' },
  { code: 'CZE', name: 'Rep. Tcheca', flag: '🇨🇿' },
  // América Central / Caribe
  { code: 'PAN', name: 'Panamá', flag: '🇵🇦' },
  { code: 'CUW', name: 'Curaçao', flag: '🇨🇼' },
  { code: 'HAI', name: 'Haiti', flag: '🇭🇹' },
  // África
  { code: 'MAR', name: 'Marrocos', flag: '🇲🇦' },
  { code: 'SEN', name: 'Senegal', flag: '🇸🇳' },
  { code: 'EGY', name: 'Egito', flag: '🇪🇬' },
  { code: 'ALG', name: 'Argélia', flag: '🇩🇿' },
  { code: 'TUN', name: 'Tunísia', flag: '🇹🇳' },
  { code: 'CIV', name: 'Costa do Marfim', flag: '🇨🇮' },
  { code: 'GHA', name: 'Gana', flag: '🇬🇭' },
  { code: 'RSA', name: 'África do Sul', flag: '🇿🇦' },
  { code: 'CPV', name: 'Cabo Verde', flag: '🇨🇻' },
  { code: 'COD', name: 'RD Congo', flag: '🇨🇩' },
  // Ásia / Oceania
  { code: 'JPN', name: 'Japão', flag: '🇯🇵' },
  { code: 'KOR', name: 'Coreia do Sul', flag: '🇰🇷' },
  { code: 'IRN', name: 'Irã', flag: '🇮🇷' },
  { code: 'KSA', name: 'Arábia Saudita', flag: '🇸🇦' },
  { code: 'AUS', name: 'Austrália', flag: '🇦🇺' },
  { code: 'QAT', name: 'Catar', flag: '🇶🇦' },
  { code: 'UZB', name: 'Uzbequistão', flag: '🇺🇿' },
  { code: 'JOR', name: 'Jordânia', flag: '🇯🇴' },
  { code: 'NZL', name: 'Nova Zelândia', flag: '🇳🇿' },
];

// ---- Seções na ordem do álbum (Bentô + especial primeiro, depois seleções) ----
export const SECTIONS = [
  { code: BENTO.code, name: BENTO.name, flag: BENTO.flag, count: BENTO.count, special: true, bento: true },
  { code: SPECIAL.code, name: SPECIAL.name, flag: SPECIAL.flag, count: SPECIAL.count, special: true },
  ...TEAMS.map((t) => ({ ...t, count: PER_TEAM })),
];

// Grupos (âncoras visuais na grade) — índice refere-se a TEAMS
export const GROUPS = [
  { name: '🏟️ Países-sede', from: 0, to: 2 },
  { name: '🌎 América do Sul', from: 3, to: 8 },
  { name: '🌍 Europa', from: 9, to: 25 },
  { name: '🌎 América Central e Caribe', from: 26, to: 28 },
  { name: '🌍 África', from: 29, to: 38 },
  { name: '🌏 Ásia e Oceania', from: 39, to: 47 },
];

// Lista ORDENADA de todos os cromos: [{ id:'BRA-7', sec:'BRA', num:7 }, ...]
export const STICKERS = [];
for (const s of SECTIONS) {
  for (let n = 1; n <= s.count; n++) STICKERS.push({ id: `${s.code}-${n}`, sec: s.code, num: n });
}
export const TOTAL = STICKERS.length;

const secByCode = Object.fromEntries(SECTIONS.map((s) => [s.code, s]));
export function section(code) { return secByCode[code]; }

// Nome amigável de um cromo (p/ listas de troca e leitura da criança)
export function stickerLabel(sec, num) {
  if (sec === 'BEN') return BENTO.labels[num] || `Sabor ${num}`;
  if (sec === 'FWC') return SPECIAL.labels[num] || `Especial ${num}`;
  if (num === 1) return 'Escudo';
  if (num === 2) return 'Foto da Seleção';
  return `Jogador ${num}`;
}
