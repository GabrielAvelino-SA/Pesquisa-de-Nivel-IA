/* =========================================================
   PAINEL DE RESULTADOS (visão consolidada da empresa)
   Fontes: Google Sheets (Apps Script) · arquivo CSV/JSON · este navegador · demonstração
   ========================================================= */
(function () {
  'use strict';
  const C = window.Core, S = C.S, esc = C.esc;
  const CFG = Object.assign({ webhookUrl: '', adminToken: '' }, window.SURVEY_CONFIG || {});
  const root = document.getElementById('root');
  const fileIn = document.getElementById('fileIn');
  const QBY = Object.fromEntries(S.questions.map(q => [q.id, q]));

  const state = { rows: [], source: '', filter: { area: '', cargo: '' }, sort: { key: 'score_geral', dir: -1 } };

  function toast(msg) {
    const t = document.getElementById('toast');
    t.innerHTML = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2800);
  }

  /* ---------------- Normalização ---------------- */
  function normalize(r) {
    const o = Object.assign({}, r);
    ['score_geral', 'nivel', 'duracao_seg'].concat(S.dimensions.map(d => 'dim_' + d.id))
      .forEach(k => { o[k] = Number(String(o[k] == null ? '' : o[k]).replace(',', '.')) || 0; });
    if (!o.nivel_nome) o.nivel_nome = C.levelFor(o.score_geral).name;
    const dims = Object.fromEntries(S.dimensions.map(d => [d.id, o['dim_' + d.id]]));
    const m = /^(T\d)/.exec(String(o.turma || ''));
    o._t = m ? m[1] : C.trackFor(o.score_geral).id;
    o._ref = C.reforcosFor(dims, o.score_geral);
    o._mult = o.multiplicador ? String(o.multiplicador).toLowerCase().startsWith('s') : C.isMultiplicador(o.score_geral, dims);
    return o;
  }
  const setRows = (rows, source) => {
    const seen = new Set();
    state.rows = rows.filter(r => !r.id || (seen.has(r.id) ? false : seen.add(r.id))).map(normalize);
    state.source = source; render();
  };

  /* ---------------- Fontes de dados ---------------- */
  const API = () => CFG.apiUrl ? CFG.apiUrl.replace(/\/?$/, '/') : '';
  const TOKEN_KEY = 'radarIA:adminToken';
  function getToken(ask) {
    let t = ''; try { t = sessionStorage.getItem(TOKEN_KEY) || ''; } catch (e) { /* noop */ }
    if (!t && ask) { t = (prompt('Senha do painel (definida em api/config.php):') || '').trim(); }
    return t;
  }
  function saveToken(t) { try { t ? sessionStorage.setItem(TOKEN_KEY, t) : sessionStorage.removeItem(TOKEN_KEY); } catch (e) { /* noop */ } }

  async function apiFetch(qs) {
    const token = getToken(true);
    if (!token) throw new Error('Senha não informada');
    const res = await fetch(API() + 'respostas.php' + (qs || ''), { headers: { 'X-Admin-Token': token }, cache: 'no-store' });
    if (res.status === 401) { saveToken(''); throw new Error('Senha inválida'); }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    saveToken(token);
    return res;
  }

  async function loadServer() {
    toast('<span class="spinner"></span> Carregando respostas do servidor…');
    try {
      const data = await (await apiFetch()).json();
      if (!data.ok) throw new Error(data.error || 'erro');
      setRows(data.rows || [], 'Servidor (CSV)');
      toast(`✅ ${state.rows.length} respostas carregadas`);
    } catch (e) { toast('⚠️ ' + esc(e.message)); }
  }

  async function downloadServerCSV() {
    try {
      const blob = await (await apiFetch('?formato=csv')).blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `respostas-radar-ia-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch (e) { toast('⚠️ ' + esc(e.message)); }
  }
  async function loadSheets() {
    if (!CFG.webhookUrl) { toast('Configure <b>webhookUrl</b> em js/config.js'); return; }
    toast('<span class="spinner"></span> Carregando do Google Sheets…');
    try {
      const url = CFG.webhookUrl + (CFG.webhookUrl.includes('?') ? '&' : '?') + 'token=' + encodeURIComponent(CFG.adminToken || '');
      const res = await fetch(url);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'erro');
      setRows(data.rows || [], 'Google Sheets');
      toast(`✅ ${state.rows.length} respostas carregadas`);
    } catch (e) {
      toast('⚠️ Não foi possível carregar: ' + esc(e.message));
    }
  }

  function loadLocal() {
    const rows = C.store.get(C.KEYS.store, []);
    setRows(rows, 'Este navegador');
    toast(rows.length ? `${rows.length} respostas deste navegador` : 'Nenhuma resposta salva neste navegador');
  }

  function parseCSV(text) {
    text = text.replace(/^﻿/, '');
    const firstLine = text.split(/\r?\n/)[0];
    const delim = (firstLine.split(';').length > firstLine.split(',').length) ? ';' : ',';
    const rows = []; let row = [], f = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c;
      } else if (c === '"') q = true;
      else if (c === delim) { row.push(f); f = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(f); f = ''; if (row.some(x => x !== '')) rows.push(row); row = [];
      } else f += c;
    }
    row.push(f); if (row.some(x => x !== '')) rows.push(row);
    const [h, ...data] = rows;
    return data.map(r => Object.fromEntries(h.map((k, i) => [k.trim(), r[i] == null ? '' : r[i]])));
  }

  async function loadFiles(files) {
    const all = [];
    for (const f of files) {
      const txt = await f.text();
      try {
        if (/\.json$/i.test(f.name) || /^\s*[\[{]/.test(txt)) {
          const j = JSON.parse(txt);
          all.push(...(Array.isArray(j) ? j : (j.rows || [j])));
        } else all.push(...parseCSV(txt));
      } catch (e) { toast('⚠️ Falha ao ler ' + esc(f.name)); }
    }
    setRows(all, files.length === 1 ? files[0].name : files.length + ' arquivos');
    toast(`✅ ${all.length} respostas importadas`);
  }

  /* Dados fictícios para visualizar o painel */
  function demo() {
    const areaQ = QBY.area, cargoQ = QBY.cargo;
    const areaBias = [-.05, 0, -.1, .05, -.02, .08, .3, 0];
    const desejos = ['Montar o relatório semanal de vendas automaticamente', 'Conferir notas fiscais de fornecedores', 'Responder dúvidas frequentes de clientes',
      'Gerar escalas de trabalho', 'Analisar quebras e perdas por loja', 'Resumir reuniões e gerar atas', 'Criar descrições de produtos para o site',
      'Prever demanda para compras', 'Conciliar extratos bancários', 'Triar currículos', 'Criar artes de ofertas'];
    const rows = [];
    for (let n = 0; n < 140; n++) {
      const a = {}, ai = Math.floor(Math.random() * areaQ.options.length), ci = Math.min(4, Math.floor(Math.pow(Math.random(), 1.6) * 5));
      const skill = Math.max(0, Math.min(1, .2 + Math.random() * .5 + areaBias[ai] + ci * .04));
      S.questions.forEach(q => {
        const noise = () => (Math.random() - .5) * 1.6;
        if (q.id === 'area') a.area = ai;
        else if (q.id === 'cargo') a.cargo = ci;
        else if (q.type === 'single' && q.dimension) {
          const target = skill * 4 + noise();
          let best = 0; q.options.forEach((o, i) => { if (Math.abs(o.points - target) < Math.abs(q.options[best].points - target)) best = i; });
          a[q.id] = best;
        } else if (q.type === 'single') a[q.id] = Math.floor(Math.random() * q.options.length);
        else if (q.type === 'scale') a[q.id] = Math.max(0, Math.min(4, Math.round(skill * 4 + noise())));
        else if (q.type === 'multi') {
          let sel = q.options.map((o, i) => i).filter(i => !q.options[i].exclusive && Math.random() < (q.dimension ? skill * .8 : .35));
          if (q.max) sel = sel.slice(0, q.max);
          const ex = q.options.findIndex(o => o.exclusive);
          a[q.id] = sel.length ? sel : (ex >= 0 ? [ex] : [0]);
        } else if (q.id === 'desejo_ia' && Math.random() < .6) a[q.id] = desejos[Math.floor(Math.random() * desejos.length)];
      });
      const rec = C.buildRecord(a, Date.now() - (180 + Math.random() * 300) * 1000);
      rec.data = new Date(Date.now() - Math.random() * 14 * 864e5).toISOString();
      rows.push(rec);
    }
    setRows(rows, 'Demonstração (dados fictícios)');
    toast('🧪 140 respostas fictícias geradas');
  }

  function exportCSV(rowsArg, suffix) {
    const rows = rowsArg || filtered();
    if (!rows.length) { toast('Nada para exportar'); return; }
    const keys = Array.from(rows.reduce((s, r) => { Object.keys(r).forEach(k => { if (k[0] !== '_') s.add(k); }); return s; }, new Set()));
    const cell = v => { const s = String(v == null ? '' : v); return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const csv = '﻿' + [keys.join(';')].concat(rows.map(r => keys.map(k => cell(r[k])).join(';'))).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `radar-ia-${suffix || 'respostas'}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function clearLocal() {
    if (!confirm('Apagar todas as respostas salvas NESTE navegador? Esta ação não pode ser desfeita.')) return;
    C.store.del(C.KEYS.store);
    if (state.source === 'Este navegador') setRows([], 'Este navegador');
    toast('Respostas locais apagadas');
  }

  /* ---------------- Agregações ---------------- */
  const filtered = () => state.rows.filter(r =>
    (!state.filter.area || r.area === state.filter.area) && (!state.filter.cargo || r.cargo === state.filter.cargo));
  const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const dimAvg = rows => Object.fromEntries(S.dimensions.map(d => [d.id, Math.round(avg(rows.map(r => r['dim_' + d.id])))]));
  const countBy = (rows, fn) => rows.reduce((m, r) => { [].concat(fn(r)).forEach(k => { if (k) m[k] = (m[k] || 0) + 1; }); return m; }, {});
  const uniq = key => Array.from(new Set(state.rows.map(r => r[key]).filter(Boolean))).sort();

  function hbars(items, total, colorFn) {
    const max = Math.max(1, ...items.map(i => i.v));
    return `<div class="hbars">` + items.map((it, i) => `
      <div class="hbar"><span class="hbar-label" title="${esc(it.label)}">${it.label}</span>
        <div class="hbar-track"><div class="hbar-fill" style="width:${it.v / max * 100}%;--c:${colorFn ? colorFn(it, i) : 'var(--a1)'};animation-delay:${i * 60}ms"></div></div>
        <span class="hbar-num">${it.v}${total ? ` · ${Math.round(it.v / total * 100)}%` : ''}</span></div>`).join('') + '</div>';
  }

  const heatColor = v => `hsl(${Math.round(v * 1.45)} 70% 45% / ${0.25 + v / 100 * 0.5})`;

  /* ---------------- Renderização ---------------- */
  function toolbar() {
    return `<div class="toolbar">
      ${API() ? '<button class="btn sm primary" data-a="server">🗄️ Servidor (CSV)</button>' : ''}
      ${CFG.webhookUrl ? '<button class="btn sm" data-a="sheets">☁️ Google Sheets</button>' : ''}
      <button class="btn sm" data-a="file">📂 Importar CSV/JSON</button>
      <button class="btn sm" data-a="local">💾 Este navegador</button>
      <button class="btn sm ghost" data-a="demo">🧪 Demonstração</button>
    </div>`;
  }

  function render() {
    const rows = filtered();
    if (!state.rows.length) {
      root.innerHTML = `<div class="empty card">
        <h2>📡 Painel do Radar IA</h2>
        <p>Carregue as respostas para ver o nível de IA e automação da empresa por área, cargo e dimensão.
          ${state.source ? `<br><br>Fonte atual: <b>${esc(state.source)}</b>, sem respostas.` : ''}</p>
        ${toolbar()}
      </div>`;
      return;
    }

    const total = rows.length;
    const overall = Math.round(avg(rows.map(r => r.score_geral)));
    const dims = dimAvg(rows), dimsAll = dimAvg(state.rows);
    const filteredOn = state.filter.area || state.filter.cargo;
    const lvlCount = countBy(rows, r => String(r.nivel));
    const topLvl = S.levels.slice().sort((a, b) => (lvlCount[b.n] || 0) - (lvlCount[a.n] || 0))[0];
    const mults = rows.filter(r => r._mult).length;

    // Turmas da oficina
    const turmas = `<div class="turmas">` + S.tracks.map(t => {
      const rs = rows.filter(r => r._t === t.id);
      const refCount = countBy(rs, r => r._ref);
      const topRef = S.dimensions.filter(d => refCount[d.id]).sort((a, b) => refCount[b.id] - refCount[a.id]).slice(0, 3);
      const areaCount = countBy(rs, r => r.area);
      const topAreas = Object.keys(areaCount).sort((a, b) => areaCount[b] - areaCount[a]).slice(0, 3);
      const m = rs.filter(r => r._mult).length;
      return `<div class="turma" style="--tc:${t.color}">
        <div class="turma-head"><span class="t-emoji">${t.emoji}</span><div><b>${t.id} · ${esc(t.name)}</b><small>${esc(t.duracao)}</small></div>
          <span class="turma-count">${rs.length}</span></div>
        <p class="muted">${Math.round(rs.length / total * 100)}% dos respondentes${rs.length ? ` · score médio ${Math.round(avg(rs.map(r => r.score_geral)))}` : ''}${m ? ` · ${m} multiplicador(es)` : ''}</p>
        <div class="turma-sec">Conteúdo</div>
        <ul>${t.conteudos.map(c => `<li>${esc(c)}</li>`).join('')}</ul>
        ${topRef.length ? `<div class="turma-sec">Reforçar nesta turma</div><div>${topRef.map(d => `<span class="mini-tag" style="--c:${d.color}">${d.icon} ${esc(d.short)} · ${refCount[d.id]}</span>`).join(' ')}</div>` : ''}
        ${topAreas.length ? `<div class="turma-sec">Principais áreas</div><p class="muted">${topAreas.map(a => `${esc(a)} (${areaCount[a]})`).join(' · ')}</p>` : ''}
        <button class="btn sm" data-turma="${t.id}" ${rs.length ? '' : 'disabled'}>⬇️ Lista da turma</button>
      </div>`;
    }).join('') + '</div>';

    // Módulos de reforço transversais
    const refAll = countBy(rows, r => r._ref);
    const refBars = hbars(S.dimensions.map(d => ({ label: `${d.icon} ${esc(d.label)}`, v: refAll[d.id] || 0, c: d.color }))
      .sort((a, b) => b.v - a.v), total, it => it.c);
    const rep = QBY.tempo_repetitivo;
    const heavy = rows.filter(r => rep.options.findIndex(o => o.label === r.tempo_repetitivo) >= 2).length;

    // Nível
    const lvlBars = hbars(S.levels.map(l => ({ label: `${l.emoji} ${l.n} · ${esc(l.name)}`, v: lvlCount[l.n] || 0, c: l.color })), total, it => it.c);

    // Heatmap área × dimensão
    const areas = uniq('area');
    const heat = `<div class="table-wrap"><table class="heat"><thead><tr><th>Área</th><th>n</th>${S.dimensions.map(d => `<th title="${esc(d.label)}">${d.icon} ${esc(d.short)}</th>`).join('')}<th>Geral</th></tr></thead><tbody>
      ${areas.map(a => {
        const rs = state.rows.filter(r => r.area === a && (!state.filter.cargo || r.cargo === state.filter.cargo));
        if (!rs.length) return '';
        const da = dimAvg(rs), g = Math.round(avg(rs.map(r => r.score_geral)));
        return `<tr><td class="rowh">${esc(a)}</td><td style="color:var(--muted)">${rs.length}</td>${S.dimensions.map(d => `<td style="background:${heatColor(da[d.id])}">${da[d.id]}</td>`).join('')}<td style="background:${heatColor(g)}">${g}</td></tr>`;
      }).join('')}</tbody></table></div>`;

    // Prioridades
    const prio = S.dimensions.slice().sort((a, b) => dims[a.id] - dims[b.id]).map((d, i) => {
      const low = rows.filter(r => r['dim_' + d.id] < 40).length;
      return `<div class="prio"><span class="prio-rank">${i + 1}</span><span style="font-size:22px">${d.icon}</span>
        <div class="prio-info"><b>${esc(d.label)}</b><small>${Math.round(low / total * 100)}% das pessoas em nível inicial</small></div>
        <span class="pill" style="--lc:${d.color}">${dims[d.id]}</span></div>`;
    }).join('');

    // Oportunidade / ferramentas
    const repCount = countBy(rows, r => r.tempo_repetitivo);
    const repBars = hbars(rep.options.map((o, i) => ({ label: `${o.emoji} ${esc(o.label)}`, v: repCount[o.label] || 0 })), total,
      (it, i) => ['#34d399', '#fbbf24', '#fb923c', '#fb7185'][i]);
    const fCount = countBy(rows, r => String(r.ferramentas_usadas || '').split(';').map(s => s.trim()));
    const fBars = hbars(QBY.ferramentas_usadas.options.map(o => ({ label: `${o.emoji} ${esc(o.label)}`, v: fCount[o.label] || 0 }))
      .sort((a, b) => b.v - a.v), total, () => '#a78bfa');

    // Ideias
    const quotes = rows.filter(r => String(r.desejo_ia || '').trim());
    const quotesHtml = quotes.length
      ? `<div class="quotes">${quotes.map(r => `<div class="quote">“${esc(r.desejo_ia)}”<small>${esc(r.area || '—')} · ${esc(r.cargo || '—')}</small></div>`).join('')}</div>`
      : '<p class="muted">Nenhuma sugestão ainda.</p>';

    // Tabela
    const sk = state.sort.key, sd = state.sort.dir;
    const sorted = rows.slice().sort((a, b) => {
      const x = a[sk], y = b[sk];
      return (typeof x === 'number' ? x - y : String(x || '').localeCompare(String(y || ''))) * sd;
    });
    const th = (k, label) => `<th class="sortable" data-sort="${k}">${label}${sk === k ? (sd > 0 ? ' ▲' : ' ▼') : ''}</th>`;
    const table = `<div class="table-wrap" style="max-height:480px;overflow:auto"><table class="list"><thead><tr>
      ${th('nome', 'Nome')}${th('area', 'Área')}${th('cargo', 'Cargo')}${th('score_geral', 'Score')}${th('nivel', 'Nível')}${th('_t', 'Turma')}
      ${S.dimensions.map(d => th('dim_' + d.id, d.icon)).join('')}${th('data', 'Data')}</tr></thead><tbody>
      ${sorted.map(r => {
        const l = S.levels.find(x => x.n === r.nivel) || C.levelFor(r.score_geral);
        return `<tr><td>${esc(r.nome || '—')}</td><td>${esc(r.area)}</td><td>${esc(r.cargo)}</td><td><b>${r.score_geral}</b></td>
        <td><span class="pill" style="--lc:${l.color}">${l.emoji} ${esc(l.name)}</span></td>
        <td>${esc(r._t)}${r._mult ? ' 🌟' : ''}</td>
        ${S.dimensions.map(d => `<td style="color:${heatColor(r['dim_' + d.id]).replace(/\/ [\d.]+\)/, ')')}">${r['dim_' + d.id]}</td>`).join('')}
        <td style="color:var(--muted)">${r.data ? new Date(r.data).toLocaleDateString('pt-BR') : ''}</td></tr>`;
      }).join('')}</tbody></table></div>`;

    const opt = (list, cur) => list.map(v => `<option ${v === cur ? 'selected' : ''}>${esc(v)}</option>`).join('');

    root.innerHTML = `
      <div class="admin-head">
        <div><h1>Panorama de IA & Automação</h1><p>Visão consolidada da pesquisa de nivelamento.</p></div>
        ${toolbar()}
      </div>
      <div class="filters">
        <select data-f="area"><option value="">Todas as áreas</option>${opt(uniq('area'), state.filter.area)}</select>
        <select data-f="cargo"><option value="">Todos os cargos</option>${opt(uniq('cargo'), state.filter.cargo)}</select>
        <button class="btn sm ghost" data-a="csv">⬇️ Exportar CSV (filtro)</button>
        ${state.source === 'Servidor (CSV)' ? '<button class="btn sm ghost" data-a="rawcsv">🗄️ Baixar CSV completo</button>' : ''}
        ${state.source === 'Este navegador' ? '<button class="btn sm ghost" data-a="clear">🗑️ Limpar dados locais</button>' : ''}
        <span class="src-badge">Fonte: <b>${esc(state.source)}</b></span>
      </div>

      <div class="kpis">
        <div class="card kpi"><div class="k-label">Respondentes</div><div class="k-val">${total}</div><div class="k-sub">${filteredOn ? `de ${state.rows.length} no total` : 'total'}</div></div>
        <div class="card kpi"><div class="k-label">Score médio</div><div class="k-val">${overall}<small style="font-size:16px;color:var(--muted)">/100</small></div><div class="k-sub">${C.levelFor(overall).emoji} média no nível ${esc(C.levelFor(overall).name)}</div></div>
        <div class="card kpi"><div class="k-label">🌟 Multiplicadores</div><div class="k-val">${mults}</div><div class="k-sub">podem ser monitores da oficina</div></div>
        <div class="card kpi"><div class="k-label">+1h/dia em tarefas repetitivas</div><div class="k-val">${Math.round(heavy / total * 100)}%</div><div class="k-sub">potencial de automação</div></div>
      </div>

      <div class="a-grid"><div class="card span-12"><h3>🎓 Turmas da Oficina de IA & Automação</h3>
        <p class="muted" style="margin:-6px 0 16px;font-size:14px">Cada pessoa entra em uma turma pelo score geral. Dimensões abaixo de 40 viram módulos de reforço.</p>${turmas}</div></div>

      <div class="a-grid">
        <div class="card span-5"><h3>Mapa de competências</h3>
          ${C.radar(filteredOn ? [{ values: dims, color: '#22d3ee' }, { values: dimsAll, color: '#a78bfa', dashed: true }] : [{ values: dims, color: '#a78bfa' }])}
          ${filteredOn ? '<div class="legend"><span><i style="--c:#22d3ee"></i>Filtro atual</span><span><i class="dash" style="--c:#a78bfa"></i>Empresa</span></div>' : ''}
        </div>
        <div class="card span-7"><h3>Distribuição por nível</h3>${lvlBars}
          <p class="muted" style="margin:16px 0 0;font-size:14px">Nível mais comum: <b style="color:var(--text)">${topLvl.emoji} ${esc(topLvl.name)}</b></p>
          <h3 style="margin-top:24px">🎯 Prioridades de capacitação</h3><div class="priorities">${prio}</div>
        </div>
      </div>

      <div class="a-grid"><div class="card span-12"><h3>Área × Dimensão</h3>${heat}</div></div>

      <div class="a-grid">
        <div class="card span-4"><h3>⏳ Tempo em tarefas repetitivas</h3>${repBars}</div>
        <div class="card span-4"><h3>🛠️ Ferramentas já usadas</h3>${fBars}</div>
        <div class="card span-4"><h3>➕ Pessoas que precisam de reforço</h3>${refBars}</div>
      </div>

      <div class="a-grid"><div class="card span-12"><h3>💡 O que as pessoas querem que a IA faça (${quotes.length})</h3>${quotesHtml}</div></div>
      <div class="a-grid"><div class="card span-12"><h3>Respondentes</h3>${table}</div></div>`;
  }

  /* ---------------- Eventos ---------------- */
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-a]');
    if (b) {
      ({ server: loadServer, rawcsv: downloadServerCSV, sheets: loadSheets, file: () => fileIn.click(), local: loadLocal, demo,
        csv: () => exportCSV(), clear: clearLocal })[b.dataset.a]();
      return;
    }
    const tb = e.target.closest('[data-turma]');
    if (tb) {
      const t = S.tracks.find(x => x.id === tb.dataset.turma);
      const rs = filtered().filter(r => r._t === t.id).map(r => Object.assign({
        turma: `${t.id} · ${t.name}`, reforcos: r._ref.map(id => C.DIM[id].short).join('; '), multiplicador: r._mult ? 'Sim' : 'Não',
      }, r));
      exportCSV(rs, 'turma-' + t.id);
      return;
    }
    const th = e.target.closest('[data-sort]');
    if (th) {
      const k = th.dataset.sort;
      state.sort = { key: k, dir: state.sort.key === k ? -state.sort.dir : -1 };
      render();
    }
  });
  root.addEventListener('change', e => {
    const s = e.target.closest('[data-f]');
    if (s) { state.filter[s.dataset.f] = s.value; render(); }
  });
  fileIn.addEventListener('change', () => { if (fileIn.files.length) loadFiles(Array.from(fileIn.files)); fileIn.value = ''; });

  // Inicial: servidor (se já autenticado nesta sessão) → Sheets → dados do navegador
  if (/[?&]demo\b/.test(location.search)) demo();
  else if (API() && getToken(false)) loadServer();
  else if (CFG.webhookUrl && CFG.adminToken) loadSheets();
  else {
    const local = C.store.get(C.KEYS.store, []);
    if (local.length) setRows(local, 'Este navegador'); else render();
  }
})();
