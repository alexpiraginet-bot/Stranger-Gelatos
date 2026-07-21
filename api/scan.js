// ===== /api/scan — identifica figurinhas coladas numa foto de página do álbum =====
// Função serverless do Vercel. A CHAVE DA IA fica em variável de ambiente
// (Settings > Environment Variables no Vercel) — nunca no navegador.
// Suporta automaticamente: ANTHROPIC_API_KEY (Claude) > OPENAI_API_KEY > GEMINI_API_KEY.

// Prompt calibrado com a estrutura REAL dos álbuns Panini (Copa 2026):
// slot vazio tem o CÓDIGO impresso dentro do quadro; figurinha colada cobre o
// código; nome do jogador fica impresso na página SEMPRE (não é prova de nada);
// nº 1 = escudo metalizado (brilho forte = COLADA, não vazia).
const PROMPT = (teams, counts) => `Você analisa a FOTO de uma página de um álbum de figurinhas Panini da Copa do Mundo 2026.

SEÇÕES POSSÍVEIS (código = nome): ${teams}
QUANTIDADE DE FIGURINHAS POR SEÇÃO: ${counts}

COMO O ÁLBUM FUNCIONA (use isto, não adivinhe):
- Espaço VAZIO: retângulo impresso na página com o CÓDIGO/NÚMERO da figurinha visível DENTRO do quadro (ex.: "BRA 16"), sobre papel fosco, sem foto colada.
- Espaço PREENCHIDO: figurinha colada (foto colorida/brilhante) que COBRE o código impresso. Escudos e especiais são METALIZADOS: reflexo/brilho forte quase sempre = figurinha COLADA, nunca classifique brilho como vazio.
- O NOME do jogador fica impresso na página abaixo/ao lado do quadro e aparece SEMPRE, com ou sem figurinha. NUNCA use o nome como prova de preenchido.

CROMOS METALIZADOS — LIÇÃO IMPORTANTE (erro comum de leitura):
- O nº 1 de CADA seleção é o ESCUDO: um cromo metalizado espelhado (prata/holográfico). É o PRIMEIRO
  quadro da grade, logo depois do título "WE ARE <PAÍS>".
- Cromo colado FOTOGRAFA MAL: o reflexo da luz do celular vira um BORRÃO BRANCO ESTOURADO, prateado ou
  arco-íris — às vezes parece um "quadro em branco" ou uma mancha clara. ISSO É FIGURINHA COLADA!
- Teste infalível: quadro VAZIO sempre mostra o CÓDIGO impresso (ex.: "BRA 1") em papel FOSCO e sem
  brilho. Se o quadro do escudo NÃO mostra o código legível e tem qualquer brilho/reflexo/mancha clara
  estourada → {"n":1,"estado":"colada"}. Nunca responda vazia nem duvida por causa de reflexo.
- O mesmo vale para TODOS os cromos (FWC inteiras, escudos): brilho estourado = colada, sempre.

PÁGINAS ESPECIAIS (também existem no álbum — identifique igual):
- "CC" = página Coca-Cola (códigos CC 1 a CC 14, geralmente com logo da Coca-Cola no topo).
- "FWC" = abertura da Copa (todas brilhantes/metalizadas). MAPA da seção FWC p/ deduzir números:
  FWC 1-2 = emblema oficial (dupla) · 3 = mascote Maple · 4 = mascote Zayu · 5 = bola oficial Trionda ·
  6 = emblema do país-sede CANADÁ (versão VERMELHA) · 7 = emblema do país-sede MÉXICO (versão VERDE) ·
  8 = emblema do país-sede EUA/USA (versão AZUL) · 9-19 = campeões do Museu FIFA · 20 = figurinha "00".
  DICA DE OURO: os 3 emblemas de país-sede (6,7,8) mostram a TAÇA DOURADA da Copa + o texto
  "FIFA WORLD CUP 2026 CAN MEX USA" — o TEXTO É IGUAL NOS TRÊS (lista os 3 países juntos), então
  o texto NÃO diz qual é. Quem decide é a COR do fundo holográfico: VERMELHO=CAN=6 · VERDE=MEX=7 ·
  AZUL=USA=8. Para esses 3, a COR *é* evidência inequívoca: dê o número pela cor, NUNCA n:0/duvida.
  Confirme pelo contexto: cidades do Canadá (Toronto/Vancouver) na página = 6; cidades do México = 7;
  cidades dos EUA = 8. "Figurinha metalizada com a taça e CAN MEX USA" NUNCA fica sem número.

SEÇÃO DOS CAMPEÕES / FIFA MUSEUM (FWC 9-19) — CUIDADO, é uma pegadinha:
- Essas páginas ("HISTORY", "FIFA WORLD CUP") mostram VÁRIAS fotos de times campeões IMPRESSAS na
  própria página. FOTO IMPRESSA NÃO É FIGURINHA COLADA!
- A figurinha COLADA de campeão se reconhece por DOIS sinais juntos: (a) moldura metalizada com
  brilho/glitter ao redor, e (b) FAIXA VERMELHA na base escrita "FIFA MUSEUM + país + ano".
  Sem a faixa vermelha e sem o brilho = imagem impressa da página (não conte).
- Nem toda final tem quadro de figurinha: só estes ANOS têm slot, com este mapa ano→número:
  1934→9 · 1950→10 · 1954→11 · 1962→12 · 1974→13 · 1986→14 · 1994→15 · 2002→16 · 2006→17 · 2014→18 · 2022→19.
  Leia o ANO na faixa vermelha (ou na legenda) e converta. Ano fora desta lista = imagem impressa, ignore.

AS BORDAS COLORIDAS cheias de "26" repetidos nas laterais das páginas são ARTE IMPRESSA da página —
nunca são figurinhas, ignore-as completamente.
- "BEN" = coleção Bentô Worldcup (sabores de gelato).

REGRA DE OURO (precedência máxima): se você LÊ um código (ex.: "FWC 7") impresso DENTRO de um quadro
claro/fosco, aquele quadro está VAZIO e esse número é OBRIGATORIAMENTE "vazia". Esse mesmo número NUNCA
pode aparecer como "colada" — o texto de um quadro vazio pertence só a ele. Uma página pode ter quadros
vazios E colados ao mesmo tempo: liste os dois.

FIGURINHA COLADA COBRE O CÓDIGO — seja CONSERVADOR com o número dela:
- Só dê número a uma colada se a evidência for INEQUÍVOCA: a legenda/título encostando NELA
  (ex.: "TRIONDA - Bola Oficial" imediatamente ao lado → FWC 5) ou parte do código visível.
- Nas páginas de seleção, o NOME DO JOGADOR impresso embaixo do quadro + a ordem da grade identificam o número.
- EXCEÇÃO: os 3 emblemas de país-sede (FWC 6/7/8) se identificam pela COR do fundo (regra acima) —
  para eles a cor basta, não precisa de título encostado e NÃO se usa duvida.
- NUNCA invente número e NUNCA reuse o número de um quadro vazio da mesma página.

EXEMPLO REAL (aprenda com ele): uma página tem um quadro fosco escrito "Emblema do país-sede / FWC 7"
perto das cidades do México, e uma figurinha metalizada colada mais acima perto do título "USA".
CORRETO: {"n":7,"estado":"vazia"} e {"n":8,"estado":"colada"} (a figurinha colada é AZUL = USA = 8).
ERRADO: dizer que 7 está colada — o código FWC 7 legível prova que o 7 está vazio.
OUTRO EXEMPLO REAL: página "HOST COUNTRIES AND CITIES" com "CAN" + Toronto/Vancouver e uma figurinha
metalizada VERMELHA com a taça e "FIFA WORLD CUP 2026 CAN MEX USA".
CORRETO: {"n":6,"estado":"colada"} (fundo vermelho = Canadá = 6). ERRADO: n:0 duvida.

VERIFICAÇÃO ANTI-TROLAGEM (figurinha errada, falsa ou personalizada):
- Toda figurinha OFICIAL tem o nome do jogador impresso NELA (barra com nome), e a página tem o nome
  impresso ABAIXO/AO LADO do quadro. Se der para ler os dois e forem DIFERENTES, a figurinha está no
  LUGAR ERRADO ou NÃO É OFICIAL → use {"n":X,"estado":"estranha"} e explique na note.
- Também é "estranha": figurinha com foto caseira/criança/pessoa comum, nome que não existe na seleção,
  design diferente do padrão Panini, ou colada torta/fora da grade de quadros.
- Figurinha "estranha" NUNCA conta como colada. Na note, diga o nome lido e por que desconfia
  (ex.: "sticker com nome Bento Teixeira não corresponde a jogador oficial — parece personalizada").

A FOTO PODE MOSTRAR AS DUAS PÁGINAS DO MESMO TIME (álbum aberto, foto deitada): cada seleção ocupa
2 páginas com os cromos 1 a 20 distribuídos entre elas (a página ESQUERDA tem os números menores,
a DIREITA os maiores). Analise as DUAS páginas e junte tudo numa resposta só. A dobra do meio pode
esconder quadros — esses vão para "duvida".

A FOTO PODE ESTAR GIRADA/DE LADO: considere a rotação ao ler os textos.

FAÇA NESTA ORDEM:
1. Leia o cabeçalho e identifique a SEÇÃO (um código da lista acima — pode ter 2 ou 3 letras, ex.: CC, BRA, FWC).
2. Localize os quadros de figurinha REALMENTE visíveis na foto. Páginas de índice/abertura podem mostrar poucos quadros — liste SÓ os que aparecem, não invente os outros. Elementos brilhantes IMPRESSOS na página (logos, faixas, títulos holográficos) NÃO são figurinhas.
3. Para CADA quadro visível, escreva o número dele e o estado:
   - "vazia": o código impresso (ex.: "FWC 3") está legível dentro do quadro, papel fosco, SEM figurinha física colada por cima.
   - "colada": há uma figurinha FÍSICA colada cobrindo o quadro (foto colorida/metalizada com borda, relevo de adesivo). Na dúvida entre brilho da página e figurinha, prefira "duvida".
   - "duvida": cortado pela borda/dobra, escuro, borrado, coberto por dedo, ou você não tem certeza.
4. Baseie-se em LER o que está impresso em cada quadro, não na posição da grade.
5. AUTOCONFERÊNCIA obrigatória: releia sua "note" — se você descreveu um quadro como vazio/sem colar, o estado dele TEM que ser "vazia". Nunca contradiga sua própria descrição.

RESPONDA SOMENTE com JSON válido, sem texto antes ou depois, um objeto por quadro visível:
{"section":"FWC","slots":[{"n":3,"estado":"vazia"},{"n":4,"estado":"colada"},{"n":13,"estado":"duvida"},{"n":2,"estado":"estranha"}],"note":"observação curta em português ou vazio"}
Estados possíveis: "colada" | "vazia" | "duvida" | "estranha".
Se a foto não mostrar uma página de álbum: {"section":null,"slots":[],"note":"não é uma página do álbum"}.`;

// ===== MODO LIVE: identifica UMA figurinha solta na mão (abrir pacote/troca) =====
const PROMPT_STICKER = (teams) => `Você vê a FOTO de UMA figurinha Panini da Copa 2026 segurada na mão (uma só, avulsa, ainda NÃO colada).

SEÇÕES/CÓDIGOS possíveis (código = nome): ${teams}
Cada seleção tem 20 figurinhas: nº 1 = ESCUDO (brasão metalizado da seleção) · nº 13 = FOTO DO TIME (retrato horizontal do elenco) · os demais (2–12, 14–20) = JOGADORES (um atleta cada).
Especiais foil = seção "FWC" (numeradas de 1 a 20): 1-2 emblema oficial · 3 mascote Maple · 4 mascote Zayu · 5 bola Trionda · 6 país-sede CANADÁ (fundo VERMELHO) · 7 país-sede MÉXICO (fundo VERDE) · 8 país-sede EUA (fundo AZUL) · 9-19 campeões do Museu FIFA (por ano) · 20 figurinha "00".

TAREFA: descubra a SELEÇÃO (pela bandeira/escudo/cores do uniforme/texto) e o TIPO da figurinha:
- "escudo": é o brasão metalizado da seleção → número 1.
- "time": é a foto do elenco todo (horizontal) → número 13.
- "especial": é uma foil da seção FWC → dê o número 1..20 pela lista acima.
- "jogador": é um atleta. Você NÃO consegue saber o número exato do jogador (isso depende da ordem do elenco no álbum), então devolva num:null — o app vai pedir o número.

REGRAS:
- Para escudo/time/especial, dê o número exato. Para jogador, num É null.
- "code" é o código de 3 letras da seleção (ou "FWC" para especiais). Se não reconhecer a seleção, code:null.
- Leia o nome do jogador se aparecer (campo "name"), senão "".
- Se a foto não mostrar uma figurinha (borrada, dedo tapando, vazia), code:null e explique em "note".

RESPONDA SOMENTE com JSON válido, um objeto:
{"code":"BRA","num":null,"tipo":"jogador","name":"Vinícius Jr","confianca":"alta","note":""}
tipo ∈ "escudo"|"time"|"jogador"|"especial" · confianca ∈ "alta"|"media"|"baixa".`;

function parseDataUrl(image) {
  const m = /^data:(image\/\w+);base64,(.+)$/.exec(image || '');
  if (m) return { mediaType: m[1], b64: m[2] };
  return { mediaType: 'image/jpeg', b64: image };
}

function extractJson(text) {
  const m = /\{[\s\S]*\}/.exec(text || '');
  if (m) { try { return JSON.parse(m[0]); } catch (e) { /* tenta o resgate abaixo */ } }
  // resgate de resposta TRUNCADA: recupera os slots completos que deu tempo de escrever
  const slots = [];
  const re = /\{\s*"n"\s*:\s*(\d+)\s*,\s*"estado"\s*:\s*"(\w+)"\s*\}/g;
  let s;
  while ((s = re.exec(text || ''))) slots.push({ n: +s[1], estado: s[2] });
  if (slots.length >= 3) {
    const sec = /"section"\s*:\s*"([A-Z]{2,4})"/.exec(text || '');
    return { section: sec ? sec[1] : null, slots, note: 'Li a página quase toda — confira e escaneie de novo se faltar algo.' };
  }
  return null;
}

async function callAnthropic(key, b64, mediaType, prompt) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: process.env.SCAN_MODEL || 'claude-sonnet-5',
      max_tokens: 3000,
      // sonnet-5 liga thinking adaptativo por padrão; às vezes ele consome os
      // 3000 tokens inteiros pensando e a resposta chega VAZIA (stop=max_tokens).
      // Nosso prompt já é prescritivo — desligar garante que os tokens virem JSON.
      thinking: { type: 'disabled' },
      messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: b64 } },
        { type: 'text', text: prompt },
      ] }],
    }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || `Anthropic ${r.status}`);
  const text = (j.content || []).map((c) => c.text || '').join('');
  if (!text) console.error('anthropic vazio: stop=%s content=%j usage=%j', j.stop_reason, j.content, j.usage);
  return text;
}

async function callOpenAI(key, b64, mediaType, prompt) {
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: process.env.SCAN_MODEL || 'gpt-4o-mini',
      max_tokens: 3000,
      messages: [{ role: 'user', content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: `data:${mediaType};base64,${b64}` } },
      ] }],
    }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || `OpenAI ${r.status}`);
  return j.choices?.[0]?.message?.content || '';
}

async function callGemini(key, b64, mediaType, prompt) {
  const model = process.env.SCAN_MODEL || 'gemini-2.0-flash';
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({ contents: [{ parts: [
      { inline_data: { mime_type: mediaType, data: b64 } },
      { text: prompt },
    ] }] }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || `Gemini ${r.status}`);
  return j.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
}

// anti-abuso: só o nosso domínio + limite de chamadas por IP (memória da instância)
const ALLOWED_ORIGINS = (process.env.SCAN_ORIGINS || 'https://stranger-gelatos.vercel.app').split(',');
const hits = new Map(); // ip -> { n, t0 }
const RATE_MAX = 20, RATE_WIN = 60 * 60 * 1000; // 20 scans/hora por IP

function rateLimited(ip) {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now - h.t0 > RATE_WIN) { hits.set(ip, { n: 1, t0: now }); return false; }
  h.n++;
  if (hits.size > 5000) hits.clear(); // não cresce sem limite
  return h.n > RATE_MAX;
}

module.exports = async (req, res) => {
  const origin = req.headers.origin || '';
  const originOk = ALLOWED_ORIGINS.includes(origin);
  res.setHeader('Access-Control-Allow-Origin', originOk ? origin : ALLOWED_ORIGINS[0]);
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'use POST' });
  if (origin && !originOk) return res.status(403).json({ error: 'origem não permitida' });

  const ip = String(req.headers['x-forwarded-for'] || 'x').split(',')[0].trim();
  if (rateLimited(ip)) return res.status(429).json({ error: 'Muitos scans seguidos — espere um pouquinho! ⏳' });

  try {
    const body = typeof req.body === 'object' && req.body ? req.body : JSON.parse(await readBody(req) || '{}');
    const { image, teams, counts, mode } = body;
    if (!image) return res.status(400).json({ error: 'faltou a imagem' });

    const { mediaType, b64 } = parseDataUrl(image);
    if (!b64 || b64.length > 4_000_000) return res.status(400).json({ error: 'imagem muito grande — tente de novo' });
    const sticker = mode === 'sticker';   // MODO LIVE: identificar UMA figurinha solta
    const prompt = sticker
      ? PROMPT_STICKER(String(teams || '').slice(0, 4000))
      : PROMPT(String(teams || '').slice(0, 4000), String(counts || '').slice(0, 2000));

    let text;
    if (process.env.ANTHROPIC_API_KEY) text = await callAnthropic(process.env.ANTHROPIC_API_KEY, b64, mediaType, prompt);
    else if (process.env.OPENAI_API_KEY) text = await callOpenAI(process.env.OPENAI_API_KEY, b64, mediaType, prompt);
    else if (process.env.GEMINI_API_KEY) text = await callGemini(process.env.GEMINI_API_KEY, b64, mediaType, prompt);
    else return res.status(500).json({ error: 'IA não configurada: adicione ANTHROPIC_API_KEY (ou OPENAI_API_KEY / GEMINI_API_KEY) nas variáveis de ambiente do Vercel.' });

    const out = extractJson(text);
    if (!out) {
      console.error('scan parse fail: len=%d head=%s', (text || '').length, (text || '').slice(0, 300));
      return res.status(502).json({ error: 'a IA não entendeu a foto — tente de novo' });
    }
    // MODO LIVE: devolve a figurinha identificada (code/num/tipo/name)
    if (sticker) {
      const code = typeof out.code === 'string' ? out.code.toUpperCase().slice(0, 4) : null;
      let num = parseInt(out.num, 10); if (!Number.isInteger(num) || num < 1 || num > 20) num = null;
      return res.status(200).json({
        code: code || null, num,
        tipo: typeof out.tipo === 'string' ? out.tipo.toLowerCase() : '',
        name: typeof out.name === 'string' ? out.name.slice(0, 60) : '',
        confianca: typeof out.confianca === 'string' ? out.confianca.toLowerCase() : 'media',
        note: typeof out.note === 'string' ? out.note.slice(0, 200) : '',
      });
    }
    // formato novo (por quadro) -> mapeia p/ filled/empty/uncertain; aceita o antigo tb
    const filled = [], empty = [], uncertain = [], weird = [];
    if (Array.isArray(out.slots)) {
      for (const s of out.slots) {
        const n = parseInt(s?.n, 10);
        if (!Number.isInteger(n)) continue;
        const e = String(s?.estado || '').toLowerCase();
        if (e.startsWith('col')) filled.push(n);
        else if (e.startsWith('vaz')) empty.push(n);
        else if (e.startsWith('estr')) weird.push(n);
        else uncertain.push(n);
      }
    } else {
      if (Array.isArray(out.filled)) filled.push(...out.filled);
      if (Array.isArray(out.empty)) empty.push(...out.empty);
      if (Array.isArray(out.uncertain)) uncertain.push(...out.uncertain);
    }
    return res.status(200).json({
      section: out.section || null,
      filled, empty, uncertain, weird,
      note: typeof out.note === 'string' ? out.note.slice(0, 400) : '',
    });
  } catch (e) {
    console.error('scan error:', e);   // detalhe só no log do servidor
    return res.status(500).json({ error: 'IA indisponível agora — tente de novo em instantes' });
  }
};

module.exports.config = { maxDuration: 60 };  // visão pode passar de 10s

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => { data += c; });
    req.on('end', () => resolve(data));
    req.on('error', () => resolve(''));
  });
}
