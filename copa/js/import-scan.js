// ===== Importação de SNAPSHOT da folha física de controle (scan por IA) =====
// Regras (do pedido):
//  - MERGE NÃO-DESTRUTIVO: o scan NUNCA rebaixa. COLADA existente continua COLADA.
//    O scan só preenche vazios ou promove FALTA→ANTIGA/COLADA.
//  - REPETIDAS: zeradas. O scan não importa nenhuma repetida (marcas Ⓝ eram erro).
//  - REVISAR: entra na fila de confirmação (não conta em nenhum total até confirmar).
//  - METADADOS por registro: source, importedAt, confidence.
//  - IDEMPOTENTE: cada fonte roda uma vez só (state.imports[source]); assim itens
//    que a criança já resolveu na fila não voltam numa reabertura do app.
import { state, save } from './state.js';

// aplica um seed já carregado (objeto). Retorna um resumo do que mudou.
export function applyScanSeed(seed) {
  if (!seed || !seed.source) return { ok: false, error: 'seed_invalido' };
  if (state.imports[seed.source]) return { ok: false, error: 'ja_importado', prev: state.imports[seed.source] };

  const importedAt = new Date().toISOString();
  const meta = { src: seed.source, at: importedAt, conf: seed.confidence || 'media' };
  const res = { ok: true, colada: 0, antiga: 0, revisar: 0, mantidas: 0 };

  const isGlued = (id) => Array.isArray(state.st[id]) && state.st[id][0] === 1;

  // 1) COLADAS do scan — promove FALTA/ANTIGA/REVISAR → COLADA (nunca mexe em repetidas)
  for (const id of seed.colada || []) {
    if (isGlued(id)) { res.mantidas++; continue; }         // já colada: nada muda
    const d = (Array.isArray(state.st[id]) && state.st[id][1]) || 0;
    state.st[id] = [1, d];                                  // repetidas preservadas, mas NUNCA vindas do scan
    delete state.antigas[id];
    delete state.review[id];
    res.colada++;
  }
  // 2) ANTIGAS do scan — só se ainda não for colada (não rebaixa)
  for (const id of seed.antiga || []) {
    if (isGlued(id)) { res.mantidas++; continue; }
    state.antigas[id] = { ...meta };
    delete state.review[id];
    res.antiga++;
  }
  // 3) REVISAR do scan — só entra na fila se ainda for indefinido (não sobrescreve colada/antiga)
  for (const id of seed.revisar || []) {
    if (isGlued(id) || state.antigas[id]) { res.mantidas++; continue; }
    state.review[id] = { ...meta };
    res.revisar++;
  }

  state.imports[seed.source] = {
    at: importedAt, confidence: meta.conf,
    colada: (seed.colada || []).length,
    antiga: (seed.antiga || []).length,
    revisar: (seed.revisar || []).length,
    applied: { colada: res.colada, antiga: res.antiga, revisar: res.revisar, mantidas: res.mantidas },
  };
  save();
  return res;
}

// busca o seed no disco (fica em cache do SW pra funcionar offline) e aplica.
// `file` é o nome do arquivo em /data (sem .json); a chave de idempotência vem
// do campo `source` DENTRO do seed, então o nome do arquivo pode diferir do tag.
export async function runScanImport(file = 'seed-scan-2026-07-20') {
  let seed = null;
  try {
    const r = await fetch(`./data/${file}.json`, { cache: 'no-cache' });
    if (r.ok) seed = await r.json();
  } catch (e) { /* offline / sem arquivo */ }
  if (!seed) return { ok: false, error: 'seed_indisponivel' };
  if (state.imports[seed.source]) return { ok: false, error: 'ja_importado' };
  return applyScanSeed(seed);
}
