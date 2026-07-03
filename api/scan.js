// ===== /api/scan — identifica figurinhas coladas numa foto de página do álbum =====
// Função serverless do Vercel. A CHAVE DA IA fica em variável de ambiente
// (Settings > Environment Variables no Vercel) — nunca no navegador.
// Suporta automaticamente: ANTHROPIC_API_KEY (Claude) > OPENAI_API_KEY > GEMINI_API_KEY.

const PROMPT = (teams) => `Você está vendo a FOTO de uma página de um álbum de figurinhas Panini da Copa do Mundo 2026.
Cada página tem espaços numerados. Espaço PREENCHIDO = figurinha colada (imagem colorida colada por cima). Espaço VAZIO = mostra apenas o número impresso e um desenho claro/placeholder.

Sua tarefa:
1. Identifique a SEÇÃO da página pelo cabeçalho/nome do time. Use o código de 3 letras desta lista: ${teams}
2. Liste os números dos espaços PREENCHIDOS (figurinha colada) e os VAZIOS que você consegue ver.

Responda SOMENTE com JSON válido, sem texto extra:
{"section":"BRA","filled":[1,2,5],"empty":[3,4],"note":"observação curta em português se necessário"}
Se não conseguir identificar a página, responda {"section":null,"filled":[],"empty":[],"note":"motivo curto"}.`;

function parseDataUrl(image) {
  const m = /^data:(image\/\w+);base64,(.+)$/.exec(image || '');
  if (m) return { mediaType: m[1], b64: m[2] };
  return { mediaType: 'image/jpeg', b64: image };
}

function extractJson(text) {
  const m = /\{[\s\S]*\}/.exec(text || '');
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch (e) { return null; }
}

async function callAnthropic(key, b64, mediaType, prompt) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: process.env.SCAN_MODEL || 'claude-sonnet-5',
      max_tokens: 700,
      messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: b64 } },
        { type: 'text', text: prompt },
      ] }],
    }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || `Anthropic ${r.status}`);
  return (j.content || []).map((c) => c.text || '').join('');
}

async function callOpenAI(key, b64, mediaType, prompt) {
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: process.env.SCAN_MODEL || 'gpt-4o-mini',
      max_tokens: 700,
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
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [
      { inline_data: { mime_type: mediaType, data: b64 } },
      { text: prompt },
    ] }] }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || `Gemini ${r.status}`);
  return j.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'use POST' });

  try {
    const body = typeof req.body === 'object' && req.body ? req.body : JSON.parse(await readBody(req) || '{}');
    const { image, teams } = body;
    if (!image) return res.status(400).json({ error: 'faltou a imagem' });

    const { mediaType, b64 } = parseDataUrl(image);
    if (!b64 || b64.length > 8_000_000) return res.status(400).json({ error: 'imagem muito grande' });
    const prompt = PROMPT(teams || '');

    let text;
    if (process.env.ANTHROPIC_API_KEY) text = await callAnthropic(process.env.ANTHROPIC_API_KEY, b64, mediaType, prompt);
    else if (process.env.OPENAI_API_KEY) text = await callOpenAI(process.env.OPENAI_API_KEY, b64, mediaType, prompt);
    else if (process.env.GEMINI_API_KEY) text = await callGemini(process.env.GEMINI_API_KEY, b64, mediaType, prompt);
    else return res.status(500).json({ error: 'IA não configurada: adicione ANTHROPIC_API_KEY (ou OPENAI_API_KEY / GEMINI_API_KEY) nas variáveis de ambiente do Vercel.' });

    const out = extractJson(text);
    if (!out) return res.status(502).json({ error: 'resposta da IA inválida' });
    return res.status(200).json({
      section: out.section || null,
      filled: Array.isArray(out.filled) ? out.filled : [],
      empty: Array.isArray(out.empty) ? out.empty : [],
      note: typeof out.note === 'string' ? out.note.slice(0, 300) : '',
    });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e).slice(0, 300) });
  }
};

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => { data += c; });
    req.on('end', () => resolve(data));
    req.on('error', () => resolve(''));
  });
}
