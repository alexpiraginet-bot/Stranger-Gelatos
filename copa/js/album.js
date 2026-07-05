// ===== ÁLBUM COPA 2026 (Panini) — estrutura de dados =====
// Lista EDITÁVEL: ajuste seleções/quantidade de cromos conforme o checklist
// oficial do seu álbum. O app inteiro se adapta sozinho a esta tabela.

// Seção especial de abertura (álbum REAL 2026): FWC 1–19 (todas brilhantes) + figurinha "00"
export const SPECIAL = {
  code: 'FWC', name: 'Especiais da Copa', flag: '🏆', count: 20,
  labels: {
    1: 'Emblema oficial ✨', 2: 'Emblema oficial ✨', 3: 'Mascote Maple 🦌', 4: 'Mascote Zayu 🐆',
    5: 'Bola oficial Trionda ⚽✨', 6: 'Canadá (sede) 🇨🇦', 7: 'México (sede) 🇲🇽', 8: 'EUA (sede) 🇺🇸',
    9: 'Campeões: Itália 1934', 10: 'Campeões: Uruguai 1950', 11: 'Campeões: Alemanha 1954',
    12: 'Campeões: Brasil 1962', 13: 'Campeões: Alemanha 1974', 14: 'Campeões: Argentina 1986',
    15: 'Campeões: Brasil 1994', 16: 'Campeões: Brasil 2002', 17: 'Campeões: Itália 2006',
    18: 'Campeões: Alemanha 2014', 19: 'Campeões: Argentina 2022', 20: 'Figurinha "00" (logo Panini) ✨',
  },
};

// Página Coca-Cola (edição brasileira): CC 1–14
export const COCA = {
  code: 'CC', name: 'Coca-Cola', flag: '🥤', count: 14,
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

// Cromos por seleção (álbum REAL): 1=Escudo brilhante · 13=Foto do time (horizontal) · resto=Jogadores
export const PER_TEAM = 20;

// Os 48 CLASSIFICADOS REAIS, na ordem dos grupos do álbum (A–L)
export const TEAMS = [
  // Grupo A
  { code: 'CZE', name: 'Tchéquia', flag: '🇨🇿' },
  { code: 'MEX', name: 'México', flag: '🇲🇽' },
  { code: 'RSA', name: 'África do Sul', flag: '🇿🇦' },
  { code: 'KOR', name: 'Coreia do Sul', flag: '🇰🇷' },
  // Grupo B
  { code: 'BIH', name: 'Bósnia', flag: '🇧🇦' },
  { code: 'CAN', name: 'Canadá', flag: '🇨🇦' },
  { code: 'QAT', name: 'Catar', flag: '🇶🇦' },
  { code: 'SUI', name: 'Suíça', flag: '🇨🇭' },
  // Grupo C
  { code: 'BRA', name: 'Brasil', flag: '🇧🇷' },
  { code: 'HAI', name: 'Haiti', flag: '🇭🇹' },
  { code: 'MAR', name: 'Marrocos', flag: '🇲🇦' },
  { code: 'SCO', name: 'Escócia', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
  // Grupo D
  { code: 'AUS', name: 'Austrália', flag: '🇦🇺' },
  { code: 'PAR', name: 'Paraguai', flag: '🇵🇾' },
  { code: 'TUR', name: 'Turquia', flag: '🇹🇷' },
  { code: 'USA', name: 'Estados Unidos', flag: '🇺🇸' },
  // Grupo E
  { code: 'CUW', name: 'Curaçao', flag: '🇨🇼' },
  { code: 'ECU', name: 'Equador', flag: '🇪🇨' },
  { code: 'GER', name: 'Alemanha', flag: '🇩🇪' },
  { code: 'CIV', name: 'Costa do Marfim', flag: '🇨🇮' },
  // Grupo F
  { code: 'JPN', name: 'Japão', flag: '🇯🇵' },
  { code: 'NED', name: 'Países Baixos', flag: '🇳🇱' },
  { code: 'SWE', name: 'Suécia', flag: '🇸🇪' },
  { code: 'TUN', name: 'Tunísia', flag: '🇹🇳' },
  // Grupo G
  { code: 'BEL', name: 'Bélgica', flag: '🇧🇪' },
  { code: 'EGY', name: 'Egito', flag: '🇪🇬' },
  { code: 'IRN', name: 'Irã', flag: '🇮🇷' },
  { code: 'NZL', name: 'Nova Zelândia', flag: '🇳🇿' },
  // Grupo H
  { code: 'CPV', name: 'Cabo Verde', flag: '🇨🇻' },
  { code: 'KSA', name: 'Arábia Saudita', flag: '🇸🇦' },
  { code: 'ESP', name: 'Espanha', flag: '🇪🇸' },
  { code: 'URU', name: 'Uruguai', flag: '🇺🇾' },
  // Grupo I
  { code: 'FRA', name: 'França', flag: '🇫🇷' },
  { code: 'IRQ', name: 'Iraque', flag: '🇮🇶' },
  { code: 'NOR', name: 'Noruega', flag: '🇳🇴' },
  { code: 'SEN', name: 'Senegal', flag: '🇸🇳' },
  // Grupo J
  { code: 'ALG', name: 'Argélia', flag: '🇩🇿' },
  { code: 'ARG', name: 'Argentina', flag: '🇦🇷' },
  { code: 'AUT', name: 'Áustria', flag: '🇦🇹' },
  { code: 'JOR', name: 'Jordânia', flag: '🇯🇴' },
  // Grupo K
  { code: 'COL', name: 'Colômbia', flag: '🇨🇴' },
  { code: 'COD', name: 'RD Congo', flag: '🇨🇩' },
  { code: 'POR', name: 'Portugal', flag: '🇵🇹' },
  { code: 'UZB', name: 'Uzbequistão', flag: '🇺🇿' },
  // Grupo L
  { code: 'CRO', name: 'Croácia', flag: '🇭🇷' },
  { code: 'ENG', name: 'Inglaterra', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { code: 'GHA', name: 'Gana', flag: '🇬🇭' },
  { code: 'PAN', name: 'Panamá', flag: '🇵🇦' },
];

// ---- Seções na ordem do álbum (Bentô + especiais + Coca-Cola, depois seleções) ----
export const SECTIONS = [
  { code: BENTO.code, name: BENTO.name, flag: BENTO.flag, count: BENTO.count, special: true, bento: true },
  { code: SPECIAL.code, name: SPECIAL.name, flag: SPECIAL.flag, count: SPECIAL.count, special: true },
  { code: COCA.code, name: COCA.name, flag: COCA.flag, count: COCA.count, special: true },
  ...TEAMS.map((t) => ({ ...t, count: PER_TEAM })),
];
export const TEAM_OFFSET = 3;   // nº de seções antes das seleções (BEN, FWC, CC)

// Grupos REAIS do álbum (A–L, 4 seleções cada) — índice refere-se a TEAMS
export const GROUPS = 'ABCDEFGHIJKL'.split('').map((g, i) => ({ name: `⚽ Grupo ${g}`, from: i * 4, to: i * 4 + 3 }));

// Lista ORDENADA de todos os cromos: [{ id:'BRA-7', sec:'BRA', num:7 }, ...]
export const STICKERS = [];
for (const s of SECTIONS) {
  for (let n = 1; n <= s.count; n++) STICKERS.push({ id: `${s.code}-${n}`, sec: s.code, num: n });
}
export const TOTAL = STICKERS.length;

const secByCode = Object.fromEntries(SECTIONS.map((s) => [s.code, s]));
export function section(code) { return secByCode[code]; }

// ---- cores de cada seleção (fundo da página fiel ao álbum) — [tom A, tom B, tinta] ----
export const TEAM_COLORS = {
  CZE: ['#11457e', '#d7141a', '#11457e'], MEX: ['#006847', '#ce1126', '#006847'],
  RSA: ['#007a4d', '#ffb612', '#0b6b34'], KOR: ['#0047a0', '#cd2e3a', '#0047a0'],
  BIH: ['#002395', '#ffce00', '#002395'], CAN: ['#d52b1e', '#b81d13', '#d52b1e'],
  QAT: ['#8a1538', '#6d1c34', '#8a1538'], SUI: ['#d52b1e', '#b81d13', '#d52b1e'],
  BRA: ['#1b9e4b', '#f7d117', '#0b5c2e'], HAI: ['#00209f', '#d21034', '#00209f'],
  MAR: ['#006233', '#c1272d', '#006233'], SCO: ['#005eb8', '#0a3d78', '#005eb8'],
  AUS: ['#00843d', '#ffcd00', '#00693c'], PAR: ['#0038a8', '#d52b1e', '#0038a8'],
  TUR: ['#e30a17', '#b8060f', '#e30a17'], USA: ['#0a3161', '#b31942', '#0a3161'],
  CUW: ['#002b7f', '#f9d90f', '#002b7f'], ECU: ['#0072ce', '#ffd100', '#0057a0'],
  GER: ['#1a1a1a', '#dd0000', '#1a1a1a'], CIV: ['#f77f00', '#009e60', '#c65a00'],
  JPN: ['#bc002d', '#8f0022', '#bc002d'], NED: ['#ff6f00', '#21468b', '#c14e00'],
  SWE: ['#006aa7', '#fecc00', '#005a9c'], TUN: ['#e70013', '#b8000f', '#e70013'],
  BEL: ['#1a1a1a', '#fdda24', '#1a1a1a'], EGY: ['#c8102e', '#1a1a1a', '#c8102e'],
  IRN: ['#239f40', '#da0000', '#1c7a33'], NZL: ['#1a1a1a', '#00247d', '#1a1a1a'],
  CPV: ['#003893', '#cf2027', '#003893'], KSA: ['#006c35', '#00522a', '#006c35'],
  ESP: ['#aa151b', '#f1bf00', '#aa151b'], URU: ['#0038a8', '#fcd116', '#0038a8'],
  FRA: ['#0055a4', '#ef4135', '#0055a4'], IRQ: ['#007a3d', '#ce1126', '#007a3d'],
  NOR: ['#00205b', '#ba0c2f', '#00205b'], SEN: ['#00853f', '#fdef42', '#00693c'],
  ALG: ['#006233', '#d21034', '#006233'], ARG: ['#5b9bd5', '#74acdf', '#2f6fae'],
  AUT: ['#ed2939', '#c01f2d', '#ed2939'], JOR: ['#1a1a1a', '#007a3d', '#1a1a1a'],
  COL: ['#fcd116', '#003893', '#003893'], COD: ['#0068c9', '#f7d618', '#0068c9'],
  POR: ['#da291c', '#006233', '#006233'], UZB: ['#1eb53a', '#0099b5', '#0b7a2c'],
  CRO: ['#d21034', '#171796', '#d21034'], ENG: ['#cf142b', '#0a3d78', '#cf142b'],
  GHA: ['#006b3f', '#fcd116', '#006b3f'], PAN: ['#005293', '#d21034', '#005293'],
  // seções especiais
  BEN: ['#10444d', '#d4af37', '#0b2f36'], FWC: ['#7b3fd4', '#1daf5e', '#5a2ba3'],
  CC: ['#e61a27', '#111111', '#e61a27'],
};
export function teamColors(code) { return TEAM_COLORS[code] || ['#1b7a8c', '#0b2f36', '#0b3a44']; }

// Nome amigável de um cromo (p/ listas de troca e leitura da criança)
export function stickerLabel(sec, num) {
  if (sec === 'BEN') return BENTO.labels[num] || `Sabor ${num}`;
  if (sec === 'FWC') return SPECIAL.labels[num] || `Especial ${num}`;
  if (sec === 'CC') return `Coca-Cola ${num}`;
  if (num === 1) return 'Escudo ✨ (brilhante)';
  if (num === 13) return 'Foto da Seleção (horizontal)';
  return `Jogador ${num}`;
}
