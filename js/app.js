/* =========================================================
   PESQUISA INTERATIVA: fluxo, interações e resultado
   ========================================================= */
(function () {
  'use strict';
  const C = window.Core, S = C.S, Q = S.questions, esc = C.esc;
  const CFG = Object.assign({ empresa: 'Nossa Empresa', webhookUrl: '' }, window.SURVEY_CONFIG || {});
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const state = { idx: -1, answers: {}, startedAt: null, busy: false };
  let advanceTimer = null;

  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const stage = $('#stage');

  /* ---------------- Utilidades de UI ---------------- */
  function toast(msg) {
    const t = $('#toast');
    t.innerHTML = msg;
    t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('show'), 2600);
  }

  function swap(html, dir, onMount) {
    state.busy = true;
    const old = stage.firstElementChild;
    const mount = () => {
      stage.innerHTML = '';
      const el = document.createElement('div');
      el.className = 'screen ' + (dir < 0 ? 'enter-back' : 'enter');
      el.innerHTML = html;
      stage.appendChild(el);
      if (onMount) onMount(el);
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
      state.busy = false;
    };
    if (old && !reduceMotion) { old.classList.add(dir < 0 ? 'leave-back' : 'leave'); setTimeout(mount, 200); }
    else mount();
  }

  function saveDraft() {
    C.store.set(C.KEYS.draft, { idx: state.idx, answers: state.answers, startedAt: state.startedAt });
  }

  function firstName() {
    const n = (state.answers.nome || '').trim().split(/\s+/)[0];
    return n ? n.charAt(0).toUpperCase() + n.slice(1) : '';
  }

  /* ---------------- Barra de progresso ---------------- */
  function updateChrome() {
    const wrap = $('#progressWrap'), counter = $('#counter');
    if (state.idx < 0 || state.idx >= Q.length) { wrap.hidden = true; counter.textContent = ''; return; }
    wrap.hidden = false;
    $('#progressFill').style.width = (state.idx / Q.length * 100) + '%';
    counter.textContent = `${state.idx + 1} / ${Q.length}`;
    const cur = Q[state.idx].dimension;
    $('#dimTrack').innerHTML = S.dimensions.map(d => {
      const qs = Q.filter(q => q.dimension === d.id);
      const done = qs.every(q => C.isAnswered(q, state.answers[q.id]));
      return `<span class="dim-pill ${cur === d.id ? 'active' : ''} ${done ? 'done' : ''}" style="--c:${d.color}" title="${esc(d.label)}">${d.icon}</span>`;
    }).join('');
  }

  /* ---------------- Tela inicial ---------------- */
  function renderIntro(dir) {
    state.idx = -1;
    updateChrome();
    const draft = C.store.get(C.KEYS.draft, null);
    const hasDraft = draft && draft.idx > 0 && draft.idx < Q.length;
    swap(`
      <section class="intro">
        <div class="eyebrow"><span class="pulse"></span> Pesquisa de Nivelamento · ${esc(CFG.empresa)}</div>
        <h1>Qual é o seu<br><span class="grad">nível em IA</span> e automação?</h1>
        <p class="lead">Responda algumas perguntas rápidas, inclusive situações do dia a dia, e descubra na hora seu nível,
          seu mapa de competências e os próximos passos para evoluir.</p>
        <div class="intro-dims">
          ${S.dimensions.map((d, i) => `<span class="intro-dim" style="--c:${d.color};animation-delay:${i * 70}ms">${d.icon} ${esc(d.label)}</span>`).join('')}
        </div>
        <div class="intro-meta">
          <span>⏱️ ~3 minutos</span><span>🎯 Resultado na hora</span><span>🔒 Sem respostas certas ou erradas</span>
        </div>
        <div class="intro-cta">
          <button class="btn primary big" data-action="start">Começar agora <span class="arrow">→</span></button>
          ${hasDraft ? `<button class="btn ghost" data-action="resume">Continuar de onde parei (pergunta ${draft.idx + 1})</button>` : ''}
        </div>
        <p class="kbd-hint">Dica: use o teclado. <kbd>1</kbd>–<kbd>8</kbd> escolhem a opção e <kbd>Enter</kbd> avança.</p>
      </section>`, dir || 1);
  }

  /* ---------------- Perguntas ---------------- */
  function bodyFor(q, a) {
    if (q.type === 'single') {
      const many = q.options.length > 5;
      return `<div class="opts ${many ? 'two-col' : ''}">` + q.options.map((o, i) => `
        <button class="opt ${a === i ? 'selected' : ''}" data-i="${i}" style="animation-delay:${i * 45}ms">
          <span class="key">${i + 1}</span>
          ${o.emoji ? `<span class="opt-emoji">${o.emoji}</span>` : ''}
          <span class="opt-text">${esc(o.label)}</span>
          <span class="opt-check">✓</span>
        </button>`).join('') + '</div>';
    }
    if (q.type === 'multi') {
      const sel = a || [];
      return `<div class="chips">` + q.options.map((o, i) => `
        <button class="chip ${sel.includes(i) ? 'selected' : ''} ${o.exclusive ? 'exclusive' : ''}" data-i="${i}" style="animation-delay:${i * 40}ms">
          <span class="chip-box">✓</span>${o.emoji ? `<span>${o.emoji}</span>` : ''}<span>${esc(o.label)}</span>
        </button>`).join('') + '</div>';
    }
    if (q.type === 'scale') {
      const v = a == null ? 2 : a;
      return `
        <div class="scale ${a == null ? 'untouched' : ''}" style="--v:${v}">
          <div class="scale-face"><span class="scale-emoji">${q.emojis[v]}</span><span class="scale-label">${a == null ? 'Arraste ou clique para responder' : esc(q.labels[v])}</span></div>
          <div class="scale-track">
            <div class="scale-fill"></div>
            <input type="range" min="0" max="4" step="1" value="${v}" aria-label="${esc(q.title)}">
          </div>
          <div class="scale-ticks">${q.labels.map((l, i) => `<button data-tick="${i}" class="${a === i ? 'on' : ''}"><span>${i + 1}</span>${esc(l)}</button>`).join('')}</div>
        </div>`;
    }
    // text
    const val = esc(a || '');
    return q.input === 'line'
      ? `<input class="text-in" type="text" maxlength="80" placeholder="${esc(q.placeholder)}" value="${val}" autocomplete="given-name">`
      : `<textarea class="text-in" rows="4" maxlength="600" placeholder="${esc(q.placeholder)}">${val}</textarea><div class="char-count"><span>${(a || '').length}</span>/600</div>`;
  }

  function canProceed(q) { return q.optional || C.isAnswered(q, state.answers[q.id]); }

  function renderQuestion(dir) {
    clearTimeout(advanceTimer);
    const q = Q[state.idx], a = state.answers[q.id];
    const d = q.dimension ? C.DIM[q.dimension] : null;
    const tag = d
      ? `<span class="tag" style="--c:${d.color}">${d.icon} ${esc(d.label)}</span>`
      : `<span class="tag neutral">${esc(q.section || 'Sobre você')}</span>`;
    const last = state.idx === Q.length - 1;
    const greet = (q.id === 'area' && firstName()) ? `<p class="greet">Prazer, ${esc(firstName())}! 👋</p>` : '';
    const nextLabel = last ? 'Ver meu resultado ✨' : (q.optional && !C.isAnswered(q, a) ? 'Pular →' : 'Continuar →');

    updateChrome();
    swap(`
      <section class="question" data-type="${q.type}">
        <div class="q-head">${tag}<span class="q-num">Pergunta ${state.idx + 1} de ${Q.length}</span></div>
        ${greet}
        ${q.scenario ? `<div class="scenario"><span class="scenario-ico">🎬</span><div><b>Situação</b><p>${esc(q.scenario)}</p></div></div>` : ''}
        <h2>${esc(q.title)}</h2>
        ${q.subtitle ? `<p class="sub">${esc(q.subtitle)}</p>` : ''}
        <div class="q-body">${bodyFor(q, a)}</div>
        <div class="q-foot">
          <button class="btn ghost" data-action="back">← Voltar</button>
          <button class="btn primary" data-action="next" ${canProceed(q) ? '' : 'disabled'}>${nextLabel}</button>
        </div>
      </section>`, dir, el => mountQuestion(el, q));
  }

  function mountQuestion(el, q) {
    if (q.type === 'scale') {
      const range = $('input[type=range]', el);
      range.addEventListener('input', () => setScale(+range.value));
    }
    if (q.type === 'text') {
      const inp = $('.text-in', el);
      inp.addEventListener('input', () => {
        state.answers[q.id] = inp.value;
        const cc = $('.char-count span', el); if (cc) cc.textContent = inp.value.length;
        refreshNext(); saveDraft();
      });
      setTimeout(() => inp.focus(), 250);
    }
  }

  function refreshNext() {
    const q = Q[state.idx], btn = $('[data-action=next]', stage);
    if (!btn) return;
    btn.disabled = !canProceed(q);
    if (q.optional && state.idx < Q.length - 1) btn.textContent = C.isAnswered(q, state.answers[q.id]) ? 'Continuar →' : 'Pular →';
  }

  function pickSingle(i) {
    const q = Q[state.idx];
    if (!q.options[i]) return;
    state.answers[q.id] = i;
    $$('.opt', stage).forEach(b => b.classList.toggle('selected', +b.dataset.i === i));
    refreshNext(); saveDraft();
    clearTimeout(advanceTimer);
    advanceTimer = setTimeout(goNext, 420);
  }

  function toggleMulti(i) {
    const q = Q[state.idx], opt = q.options[i];
    if (!opt) return;
    let arr = (state.answers[q.id] || []).slice();
    if (opt.exclusive) arr = arr.includes(i) ? [] : [i];
    else {
      arr = arr.filter(x => !q.options[x].exclusive);
      if (arr.includes(i)) arr = arr.filter(x => x !== i);
      else {
        if (q.max && arr.length >= q.max) { toast(`Escolha no máximo ${q.max} opções`); return; }
        arr.push(i);
      }
    }
    state.answers[q.id] = arr;
    $$('.chip', stage).forEach(b => b.classList.toggle('selected', arr.includes(+b.dataset.i)));
    refreshNext(); saveDraft();
  }

  function setScale(v) {
    const q = Q[state.idx];
    state.answers[q.id] = v;
    const sc = $('.scale', stage);
    sc.classList.remove('untouched');
    sc.style.setProperty('--v', v);
    $('.scale-emoji', sc).textContent = q.emojis[v];
    $('.scale-label', sc).textContent = q.labels[v];
    $('input[type=range]', sc).value = v;
    $$('[data-tick]', sc).forEach(b => b.classList.toggle('on', +b.dataset.tick === v));
    const emo = $('.scale-emoji', sc);
    emo.classList.remove('pop'); void emo.offsetWidth; emo.classList.add('pop');
    refreshNext(); saveDraft();
  }

  function goNext() {
    if (state.busy) return;
    clearTimeout(advanceTimer);
    const q = Q[state.idx];
    if (!canProceed(q)) return;
    const nextQ = Q[state.idx + 1];
    if (q.dimension && (!nextQ || nextQ.dimension !== q.dimension)) {
      const d = C.DIM[q.dimension];
      toast(`<span class="toast-ico" style="--c:${d.color}">${d.icon}</span> <b>${esc(d.label)}</b> concluído!`);
    }
    state.idx++;
    if (state.idx >= Q.length) { finish(); return; }
    saveDraft();
    renderQuestion(1);
  }

  function goBack() {
    if (state.busy) return;
    clearTimeout(advanceTimer);
    if (state.idx <= 0) { renderIntro(-1); return; }
    state.idx--;
    saveDraft();
    renderQuestion(-1);
  }

  /* ---------------- Resultado ---------------- */
  function finish() {
    const result = C.computeResult(state.answers);
    const record = C.buildRecord(state.answers, state.startedAt, result);
    const all = C.store.get(C.KEYS.store, []); all.push(record); C.store.set(C.KEYS.store, all);
    C.store.del(C.KEYS.draft);
    updateChrome();
    renderResult(result);
    send(record);
  }

  function renderResult(r) {
    const lvl = r.level, name = firstName();
    const sorted = S.dimensions.slice().sort((a, b) => r.dims[a.id] - r.dims[b.id]);
    const weakest = sorted.slice(0, 2), strongest = sorted[sorted.length - 1];
    const circ = 2 * Math.PI * 54;

    const bars = S.dimensions.map((d, i) => {
      const v = r.dims[d.id], b = C.band(v);
      return `<div class="dbar" style="--c:${d.color};--w:${v}%;animation-delay:${i * 80}ms">
        <div class="dbar-head"><span>${d.icon} ${esc(d.label)}</span><span class="dbar-val">${v}<small>/100</small></span></div>
        <div class="dbar-track"><div class="dbar-fill"></div></div>
        <span class="dbar-band ${b.id}">${b.label}</span>
      </div>`;
    }).join('');

    const tips = weakest.map(d => {
      const b = C.band(r.dims[d.id]);
      return `<div class="tip" style="--c:${d.color}">
        <div class="tip-head">${d.icon} <b>${esc(d.label)}</b><span class="tip-band ${b.id}">${b.label}</span></div>
        <ul>${S.tips[d.id][b.id].map(t => `<li>${esc(t)}</li>`).join('')}</ul>
      </div>`;
    }).join('');

    swap(`
      <section class="result">
        <div class="res-hero card">
          <div class="ring" style="--lc:${lvl.color}">
            <svg viewBox="0 0 120 120"><circle class="ring-bg" cx="60" cy="60" r="54"/>
              <circle class="ring-fg" cx="60" cy="60" r="54" stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${circ.toFixed(1)}"/></svg>
            <div class="ring-num"><span id="scoreNum">0</span><small>de 100</small></div>
          </div>
          <div class="res-info">
            <div class="eyebrow">${name ? esc(name) + ', seu' : 'Seu'} nível em IA & automação</div>
            <h1 class="lvl-title"><span class="lvl-emoji">${lvl.emoji}</span> Nível ${lvl.n} · <span style="color:${lvl.color}">${esc(lvl.name)}</span></h1>
            <p>${esc(lvl.desc)}</p>
            <div class="lvl-steps">
              ${S.levels.map(l => `<div class="lvl-step ${l.n === lvl.n ? 'on' : ''} ${l.n < lvl.n ? 'past' : ''}" style="--lc:${l.color}"><span>${l.emoji}</span><small>${esc(l.name)}</small></div>`).join('')}
            </div>
          </div>
        </div>

        <div class="card track-card" style="--tc:${r.track.color}">
          <div class="track-badge">${r.track.emoji}</div>
          <div class="track-info">
            <div class="eyebrow">Sua turma na Oficina de IA & Automação</div>
            <h2>${esc(r.track.id)} · ${esc(r.track.name)}</h2>
            <p>${esc(r.track.objetivo)} <span class="muted">(${esc(r.track.duracao)})</span></p>
            <ul class="track-list">${r.track.conteudos.map(c => `<li>${esc(c)}</li>`).join('')}</ul>
            ${r.reforcos.length ? `<div class="track-extra">➕ Módulos de reforço para você: ${r.reforcos.map(id => `<span class="mini-tag" style="--c:${C.DIM[id].color}">${C.DIM[id].icon} ${esc(C.DIM[id].short)}</span>`).join(' ')}</div>` : ''}
            ${r.multiplicador ? `<div class="track-extra">🌟 Você tem perfil de <b>multiplicador</b> e pode apoiar colegas como monitor na oficina.</div>` : ''}
          </div>
        </div>

        <div class="res-grid">
          <div class="card"><h3>Seu mapa de competências</h3>${C.radar([{ values: r.dims, color: lvl.color }])}</div>
          <div class="card"><h3>Por dimensão</h3><div class="dbars">${bars}</div>
            <div class="strength">💎 Seu ponto forte: <b>${strongest.icon} ${esc(strongest.label)}</b></div></div>
        </div>

        <div class="card">
          <h3>🎯 Próximos passos para você evoluir</h3>
          <p class="muted">Focamos nas duas dimensões com maior potencial de crescimento.</p>
          <div class="tips">${tips}</div>
        </div>

        <div class="res-actions no-print">
          <button class="btn primary" data-action="print">📄 Salvar resultado em PDF</button>
          <button class="btn ghost" data-action="restart">↺ Responder novamente</button>
        </div>
        <p id="sendStatus" class="send-status"></p>
      </section>`, 1, el => {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        $('.ring-fg', el).style.strokeDashoffset = (circ * (1 - r.overall / 100)).toFixed(1);
      }));
      countUp($('#scoreNum', el), r.overall, 1400);
      if (!reduceMotion) setTimeout(confetti, 400);
    });
  }

  function countUp(el, to, ms) {
    if (reduceMotion) { el.textContent = to; return; }
    const t0 = performance.now();
    const step = t => {
      const p = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(to * e);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ---------------- Envio ---------------- */
  const hasRemote = () => !!(CFG.apiUrl || CFG.webhookUrl);

  async function post(record) {
    if (CFG.apiUrl) {
      // API PHP → grava no CSV do servidor
      const res = await fetch(CFG.apiUrl.replace(/\/?$/, '/') + 'salvar.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) throw new Error(j.error || 'HTTP ' + res.status);
    }
    if (CFG.webhookUrl) {
      // Google Sheets (opcional)
      await fetch(CFG.webhookUrl, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(record),
      });
    }
  }

  async function send(record) {
    const el = () => $('#sendStatus');
    const set = html => { const e = el(); if (e) e.innerHTML = html; };
    if (!hasRemote()) { set('💾 Resultado salvo neste navegador.'); return; }
    set('<span class="spinner"></span> Registrando suas respostas…');
    try {
      await post(record);
      set('✅ Respostas registradas. Obrigado pela participação!');
    } catch (e) {
      const pend = C.store.get(C.KEYS.pending, []); pend.push(record); C.store.set(C.KEYS.pending, pend);
      set('⚠️ Sem conexão agora. Suas respostas ficaram salvas e serão enviadas automaticamente depois.');
    }
  }

  async function flushPending() {
    if (!hasRemote()) return;
    const pend = C.store.get(C.KEYS.pending, []);
    if (!pend.length) return;
    const left = [];
    for (const r of pend) { try { await post(r); } catch (e) { left.push(r); } }
    C.store.set(C.KEYS.pending, left);
  }

  /* ---------------- Ações e teclado ---------------- */
  const actions = {
    start() { state.answers = {}; state.startedAt = Date.now(); state.idx = 0; C.store.del(C.KEYS.draft); renderQuestion(1); },
    resume() {
      const d = C.store.get(C.KEYS.draft, null); if (!d) return;
      state.answers = d.answers || {}; state.startedAt = d.startedAt || Date.now(); state.idx = d.idx; renderQuestion(1);
    },
    next: goNext,
    back: goBack,
    print() { window.print(); },
    restart() { renderIntro(-1); },
  };

  stage.addEventListener('click', e => {
    if (state.busy) return;
    const a = e.target.closest('[data-action]');
    if (a) { if (!a.disabled && actions[a.dataset.action]) actions[a.dataset.action](); return; }
    const opt = e.target.closest('.opt'); if (opt) { pickSingle(+opt.dataset.i); return; }
    const chip = e.target.closest('.chip'); if (chip) { toggleMulti(+chip.dataset.i); return; }
    const tick = e.target.closest('[data-tick]'); if (tick) setScale(+tick.dataset.tick);
  });

  document.addEventListener('keydown', e => {
    if (state.busy || e.altKey || e.ctrlKey && e.key !== 'Enter') return;
    const t = e.target;
    if (state.idx < 0 || state.idx >= Q.length) return;
    const q = Q[state.idx];
    const typing = (t.tagName === 'TEXTAREA') || (t.tagName === 'INPUT' && t.type !== 'range');
    if (typing) {
      if (e.key === 'Enter' && (t.tagName === 'INPUT' || e.ctrlKey || e.metaKey)) { e.preventDefault(); goNext(); }
      return;
    }
    const n = parseInt(e.key, 10);
    if (!isNaN(n) && n >= 1) {
      e.preventDefault();
      if (q.type === 'single') pickSingle(n - 1);
      else if (q.type === 'multi') toggleMulti(n - 1);
      else if (q.type === 'scale' && n <= 5) setScale(n - 1);
      return;
    }
    if (e.key === 'Enter') {
      if (t.tagName === 'BUTTON' && t.dataset.action) return; // o próprio botão trata
      e.preventDefault(); goNext();
    } else if (e.key === 'Backspace' || (e.key === 'ArrowLeft' && q.type !== 'scale')) {
      e.preventDefault(); goBack();
    }
  });

  /* ---------------- Fundo animado (rede neural) ---------------- */
  function neuralBackground() {
    const cv = $('#fx'), ctx = cv.getContext('2d');
    let w, h, nodes = [], raf;
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = cv.width = innerWidth * dpr; h = cv.height = innerHeight * dpr;
      cv.style.width = innerWidth + 'px'; cv.style.height = innerHeight + 'px';
      const count = Math.round(Math.min(70, innerWidth * innerHeight / 22000));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - .5) * .25 * dpr, vy: (Math.random() - .5) * .25 * dpr,
      }));
      cv._dpr = dpr;
    };
    const draw = () => {
      const dpr = cv._dpr, maxD = 140 * dpr;
      ctx.clearRect(0, 0, w, h);
      for (const p of nodes) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
      }
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j], dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy);
          if (d < maxD) {
            ctx.strokeStyle = `rgba(150,140,255,${(1 - d / maxD) * .18})`;
            ctx.lineWidth = dpr;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
        ctx.fillStyle = 'rgba(190,200,255,.5)';
        ctx.beginPath(); ctx.arc(nodes[i].x, nodes[i].y, 1.6 * dpr, 0, Math.PI * 2); ctx.fill();
      }
      if (!reduceMotion) raf = requestAnimationFrame(draw);
    };
    resize(); draw();
    addEventListener('resize', () => { cancelAnimationFrame(raf); resize(); draw(); });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) cancelAnimationFrame(raf); else if (!reduceMotion) draw();
    });
  }

  /* ---------------- Confete ---------------- */
  function confetti() {
    const cv = $('#confetti'), ctx = cv.getContext('2d');
    cv.width = innerWidth; cv.height = innerHeight;
    const colors = S.dimensions.map(d => d.color);
    const parts = Array.from({ length: 140 }, () => ({
      x: innerWidth / 2 + (Math.random() - .5) * 200, y: innerHeight * .35,
      vx: (Math.random() - .5) * 14, vy: -Math.random() * 14 - 4,
      s: 4 + Math.random() * 6, r: Math.random() * Math.PI, vr: (Math.random() - .5) * .3,
      c: colors[Math.floor(Math.random() * colors.length)],
    }));
    const t0 = performance.now();
    const step = t => {
      ctx.clearRect(0, 0, cv.width, cv.height);
      const alive = t - t0 < 3200;
      parts.forEach(p => {
        p.vy += .35; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.globalAlpha = Math.max(0, 1 - (t - t0) / 3200);
        ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
        ctx.restore();
      });
      if (alive) requestAnimationFrame(step); else ctx.clearRect(0, 0, cv.width, cv.height);
    };
    requestAnimationFrame(step);
  }

  /* ---------------- Início ---------------- */
  neuralBackground();
  renderIntro(1);
  flushPending();
})();
