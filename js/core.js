/* =========================================================
   NÚCLEO COMPARTILHADO: pontuação, registro e gráficos
   Usado pela pesquisa (app.js) e pelo painel (admin.js)
   ========================================================= */
window.Core = (function () {
  'use strict';
  const S = window.SURVEY;
  const DIM = Object.fromEntries(S.dimensions.map(d => [d.id, d]));
  const KEYS = { store: 'radarIA:respostas', draft: 'radarIA:rascunho', pending: 'radarIA:pendentes' };

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const store = {
    get(k, def) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sem armazenamento */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* noop */ } },
  };

  const uid = () => (window.crypto && crypto.randomUUID)
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 10);

  function isAnswered(q, a) {
    if (q.type === 'multi') return Array.isArray(a) && a.length > 0;
    if (q.type === 'text') return typeof a === 'string' && a.trim().length > 0;
    return a !== undefined && a !== null;
  }

  /** Pontuação 0–4 de uma pergunta, ou null se não pontua / não respondida */
  function questionScore(q, a) {
    if (!q.dimension || !isAnswered(q, a)) return null;
    if (q.type === 'single') return q.options[a].points || 0;
    if (q.type === 'scale') return a;
    if (q.type === 'multi') return Math.min(4, a.reduce((s, i) => s + (q.options[i].points || 0), 0));
    return null;
  }

  function levelFor(score) {
    return S.levels.slice().reverse().find(l => score >= l.min) || S.levels[0];
  }

  function band(v) {
    if (v < 40) return { id: 'low', label: 'Inicial' };
    if (v < 70) return { id: 'mid', label: 'Em desenvolvimento' };
    return { id: 'high', label: 'Forte' };
  }

  /** answers: { [questionId]: valor } → { dims, overall, level } */
  function computeResult(answers) {
    const dims = {};
    S.dimensions.forEach(d => {
      const scores = S.questions
        .filter(q => q.dimension === d.id)
        .map(q => questionScore(q, answers[q.id]))
        .filter(v => v !== null);
      dims[d.id] = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length / 4 * 100) : 0;
    });
    const vals = Object.values(dims);
    const overall = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    return { dims, overall, level: levelFor(overall), track: trackFor(overall), reforcos: reforcosFor(dims, overall), multiplicador: isMultiplicador(overall, dims) };
  }

  /** Turma da oficina pela faixa do score geral */
  function trackFor(score) {
    return S.tracks.slice().reverse().find(t => score >= t.min) || S.tracks[0];
  }
  /** Dimensões abaixo de 40 → módulos de reforço individuais.
      Na primeira turma o conteúdo já cobre o básico de tudo, então não há reforço. */
  function reforcosFor(dims, score) {
    if (trackFor(score).id === S.tracks[0].id) return [];
    return S.dimensions.filter(d => (dims[d.id] || 0) < 40).map(d => d.id);
  }
  /** Candidato a monitor/multiplicador: bom nível geral + forte mentalidade de inovação */
  function isMultiplicador(overall, dims) {
    return overall >= 65 && (dims.mentalidade || 0) >= 75;
  }

  function answerText(q, a) {
    if (!isAnswered(q, a)) return '';
    if (q.type === 'single') return q.options[a].label;
    if (q.type === 'multi') return a.map(i => q.options[i].label).join('; ');
    if (q.type === 'scale') return q.labels[a];
    return String(a).trim();
  }

  /** Registro "plano" (uma linha de planilha) */
  function buildRecord(answers, startedAt, result) {
    const r = result || computeResult(answers);
    const rec = {
      id: uid(),
      data: new Date().toISOString(),
      duracao_seg: startedAt ? Math.round((Date.now() - startedAt) / 1000) : '',
      score_geral: r.overall,
      nivel: r.level.n,
      nivel_nome: r.level.name,
      turma: r.track.id + ' · ' + r.track.name,
      reforcos: r.reforcos.map(id => DIM[id].short).join('; '),
      multiplicador: r.multiplicador ? 'Sim' : 'Não',
    };
    S.dimensions.forEach(d => { rec['dim_' + d.id] = r.dims[d.id]; });
    S.questions.forEach(q => { rec[q.id] = answerText(q, answers[q.id]); });
    return rec;
  }

  /* ---------------- Radar SVG ---------------- */
  function radar(series, opts) {
    const o = Object.assign({ size: 340, max: 100, showValues: true }, opts || {});
    const dims = S.dimensions, n = dims.length, size = o.size;
    const cx = size / 2, cy = size / 2, R = size * 0.36;
    const pt = (i, v) => {
      const ang = -Math.PI / 2 + i * 2 * Math.PI / n;
      const k = Math.max(0, Math.min(o.max, v)) / o.max;
      return [cx + Math.cos(ang) * R * k, cy + Math.sin(ang) * R * k];
    };
    const poly = vals => vals.map((v, i) => pt(i, v).map(x => x.toFixed(1)).join(',')).join(' ');

    let svg = `<svg class="radar" viewBox="-70 -20 ${size + 140} ${size + 40}" role="img" aria-label="Gráfico radar das dimensões">`;
    [25, 50, 75, 100].forEach(l => {
      svg += `<polygon class="radar-ring" points="${poly(dims.map(() => l))}"/>`;
    });
    dims.forEach((d, i) => {
      const [x, y] = pt(i, o.max);
      svg += `<line class="radar-axis" x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`;
    });
    series.forEach((s, si) => {
      const vals = dims.map(d => s.values[d.id] || 0);
      svg += `<g class="radar-series" style="--c:${s.color};transform-origin:${cx}px ${cy}px;animation-delay:${si * 120}ms">`;
      svg += `<polygon class="radar-shape ${s.dashed ? 'dashed' : ''}" points="${poly(vals)}"/>`;
      if (!s.dashed) vals.forEach((v, i) => { const [x, y] = pt(i, v); svg += `<circle class="radar-dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4"/>`; });
      svg += `</g>`;
    });
    dims.forEach((d, i) => {
      const ang = -Math.PI / 2 + i * 2 * Math.PI / n;
      const lx = cx + Math.cos(ang) * (R + 30), ly = cy + Math.sin(ang) * (R + 26);
      const anchor = Math.abs(Math.cos(ang)) < 0.2 ? 'middle' : (Math.cos(ang) > 0 ? 'start' : 'end');
      const v = series[0] ? (series[0].values[d.id] || 0) : 0;
      svg += `<text class="radar-label" x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="${anchor}">${d.icon} ${esc(d.short)}</text>`;
      if (o.showValues && series[0]) svg += `<text class="radar-val" x="${lx.toFixed(1)}" y="${(ly + 16).toFixed(1)}" text-anchor="${anchor}">${Math.round(v)}</text>`;
    });
    return svg + '</svg>';
  }

  return { S, DIM, KEYS, esc, store, uid, isAnswered, questionScore, levelFor, band, computeResult, trackFor, reforcosFor, isMultiplicador, answerText, buildRecord, radar };
})();
