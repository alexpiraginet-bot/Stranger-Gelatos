// ===== ÁLBUM COPA 2026 (Panini) — estrutura de dados =====
// Lista EDITÁVEL: ajuste seleções/quantidade de cromos conforme o checklist
// oficial do seu álbum. O app inteiro se adapta sozinho a esta tabela.

// Seção especial de abertura (álbum REAL 2026): FWC 1–19 (todas brilhantes) + figurinha "00"
export const SPECIAL = {
  code: 'FWC', name: 'Especiais da Copa', flag: '🏆', count: 20,
  labels: {
    1: 'Emblema oficial ✨', 2: 'Emblema oficial ✨', 3: 'Mascote Maple 🦌', 4: 'Mascote Zayu 🐆',
    5: 'Mascote Clutch 🦅', 6: 'Canadá (sede) 🇨🇦', 7: 'México (sede) 🇲🇽', 8: 'EUA (sede) 🇺🇸',
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

// Nome amigável de um cromo (p/ listas de troca e leitura da criança)
export function stickerLabel(sec, num) {
  if (sec === 'BEN') return BENTO.labels[num] || `Sabor ${num}`;
  if (sec === 'FWC') return SPECIAL.labels[num] || `Especial ${num}`;
  if (sec === 'CC') return `Coca-Cola ${num}`;
  if (num === 1) return 'Escudo ✨ (brilhante)';
  if (num === 13) return 'Foto da Seleção (horizontal)';
  return `Jogador ${num}`;
}
