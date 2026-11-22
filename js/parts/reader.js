// 본문 칸: 문장(학습지 D 번호 단위), 제목 줄, 핵심 문장 옆줄, 단어 뜻, 재생 표시, ☆ (docs/ARCHITECTURE.md 3.4)
// 영어 문장은 잠긴 파일에서 받은 것을 그대로 보여 준다. 기기에는 D 번호만 저장한다.
import { el, button } from '../ui.js';
import { line as copy } from '../text.js';
import { clueRule } from './cluerule.js';

const GLOSS_GAP = 4; // 낱말과 뜻 풍선 사이(px). css .gloss의 margin과 같게

// scene: getScene(n)   opts: { sceneNo, stars, isStarred(d), onStar(d) → 'on' | 'off' | 'full', onLine(d), onReadEnd() }
export function makeReader(scene, opts) {
  const listen = button('btn.listen', null, '');
  listen.classList.add('listen');
  const note = el('p', { className: 'reader-note' });
  note.setAttribute('role', 'status');
  // ★ n/5: 단서 기준 말풍선을 여는 단추. 말풍선은 본문 칸 위 줄에 끼어 들어가 본문을 가리지 않는다.
  const rule = opts.stars ? clueRule({
    mode: 'inline',
    text: () => `★ ${opts.starCount()}/${opts.starLimit}`,
    label: () => `${copy('notebook.name')} ${opts.starCount()}/${opts.starLimit}`,
  }) : null;
  const head = el('div', { className: 'reader-head' }, listen, note, rule ? rule.wrap : null);

  const body = el('div', { className: 'reader-body' });
  const rows = new Map(); // d → { row, play, star }
  let openGloss = null; // 지금 열린 뜻 풍선의 낱말 { word, close }
  let picking = null; // 문장 고르기 중이면 고른 줄을 받을 함수

  const closeGloss = () => { if (openGloss) openGloss.close(); };

  // 단어 뜻: 낱말 위에 한국어 뜻만 말풍선으로(위에 자리가 없으면 아래). 한 번에 하나.
  //   가리키기(마우스): 올리면 열리고 떼면 닫힘 · 키보드 포커스: 가 있는 동안 열림
  //   누르기(마우스·터치·Enter): 열린 채로 고정, 다시 누르면 닫힘 · Esc나 다른 곳을 누르면 닫힘
  const vocabButton = (text, meaning) => {
    const word = el('button', { type: 'button', className: 'vocab', textContent: text });
    word.setAttribute('aria-expanded', 'false');
    const wrap = el('span', { className: 'vocab-wrap' }, word);
    const bubble = el('span', { className: 'gloss', lang: 'ko', textContent: meaning });
    bubble.setAttribute('role', 'status');
    let hover = false;
    let focus = false;
    let sticky = false;
    let shut = false; // 눌러서 닫은 뒤에는 포커스·가리키기가 떠날 때까지 다시 열지 않는다
    const me = { word, close() { hover = focus = sticky = false; shut = true; sync(); } };
    function sync() {
      const on = !shut && (hover || focus || sticky);
      if (on && !bubble.isConnected) {
        if (openGloss && openGloss !== me) openGloss.close();
        wrap.append(bubble);
        // 오른쪽 끝의 낱말은 풍선을 왼쪽으로 붙인다
        const w = wrap.getBoundingClientRect();
        const b = body.getBoundingClientRect();
        bubble.classList.toggle('to-left', w.left - b.left > b.width / 2);
        // 풍선은 낱말 위에 띄운다. 본문 칸 안에서 위에 자리가 없을 때만 아래로.
        bubble.classList.remove('below');
        const room = w.top - Math.max(b.top, 0);
        bubble.classList.toggle('below', room < bubble.offsetHeight + GLOSS_GAP);
        openGloss = me;
      } else if (!on && bubble.isConnected) {
        bubble.remove();
        if (openGloss === me) openGloss = null;
      }
      word.setAttribute('aria-expanded', String(on));
    }
    word.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { hover = true; sync(); } });
    word.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { hover = false; if (!focus) shut = false; sync(); } });
    word.addEventListener('focus', () => { focus = true; sync(); });
    word.addEventListener('blur', () => { focus = false; sticky = false; if (!hover) shut = false; sync(); });
    word.addEventListener('click', (e) => {
      e.stopPropagation(); // 문장 듣기로 번지지 않게
      if (sticky) { me.close(); return; }
      shut = false;
      sticky = true;
      sync();
    });
    return wrap;
  };

  // 덩어리 글을 단어 뜻 자리로 잘라 넣는다
  const chunkNodes = (d, c, text) => {
    const spans = [];
    for (const v of scene.vocab || []) for (const s of v.spans) if (s.d === d && s.c === c) spans.push({ s: s.s, e: s.e, meaning: v.meaning });
    spans.sort((a, b) => a.s - b.s);
    const out = [];
    let at = 0;
    for (const sp of spans) {
      if (sp.s < at) continue;
      if (sp.s > at) out.push(text.slice(at, sp.s));
      out.push(vocabButton(text.slice(sp.s, sp.e), sp.meaning));
      at = sp.e;
    }
    if (at < text.length) out.push(text.slice(at));
    return out;
  };

  for (const ln of scene.lines) {
    const id = `ln-${opts.sceneNo}-${ln.d}`;
    const text = el('p', { className: 'line-text', id, lang: 'en' });
    // 근거 밑줄은 이 span의 아래 테두리로 긋는다. 단어 뜻 단추를 지나도 끊기지 않는다.
    const inner = el('span', { className: 'line-inner' });
    ln.chunks.forEach((ch, c) => {
      if (c) inner.append(' ');
      inner.append(...chunkNodes(ln.d, c, ch.text));
    });
    text.append(inner);
    const play = el('button', { type: 'button', className: 'line-play', textContent: '▷' });
    play.setAttribute('aria-labelledby', id);
    const row = el('div', { className: 'line' + (ln.key ? ' key' : '') + (ln.title ? ' title-line' : '') }, play, text);
    row.dataset.d = String(ln.d);
    const hear = () => { closeGloss(); opts.onLine(ln.d); };
    play.addEventListener('click', hear);
    text.addEventListener('click', hear);

    let star = null;
    if (opts.stars && !ln.title) { // 제목 줄에는 ☆를 붙이지 않는다
      star = el('button', { type: 'button', className: 'clue' });
      star.setAttribute('aria-labelledby', id);
      const paint = () => {
        const on = opts.isStarred(ln.d);
        star.textContent = on ? '★' : '☆';
        star.setAttribute('aria-pressed', String(on));
      };
      star.addEventListener('click', () => {
        // 예측 자리에서 문장을 고르는 중이면 수첩에 담지 않고 그 줄을 고른다
        if (picking) { picking(ln.d); return; }
        const r = opts.onStar(ln.d);
        paint();
        showNote(r === 'full' ? 's11.full' : r === 'on' ? 's11.added' : null);
        if (r === 'full') rule.show(4000); // 한도 문구와 함께 단서 기준을 보여 준다
        paintCount();
      });
      paint();
      row.append(star);
    }
    rows.set(ln.d, { row, play, star });
    body.append(row);
  }

  function showNote(id) {
    note.textContent = id ? copy(id) : '';
    if (id) note.dataset.copy = id; else delete note.dataset.copy;
  }
  function paintCount() {
    if (rule) rule.refresh();
  }
  paintCount();

  // 본문 칸의 마지막 줄이 보이면 한 번 알린다
  let readEnd = false;
  const checkEnd = () => {
    if (readEnd || !body.isConnected) return;
    const last = body.lastElementChild;
    if (!last) return;
    const b = body.getBoundingClientRect();
    if (b.height === 0) return;
    if (last.getBoundingClientRect().bottom <= b.bottom + 2) {
      readEnd = true;
      if (opts.onReadEnd) opts.onReadEnd();
    }
  };
  body.addEventListener('scroll', checkEnd, { passive: true });
  // Tab으로 줄 안의 단추에 오면 단추만이 아니라 그 줄 전체가 보이게 굴린다.
  // 그러지 않으면 마지막 줄 아래가 조금 가려진 채 멈춰 키보드로는 "다 읽었다"가 열리지 않을 때가 있다.
  body.addEventListener('focusin', (e) => {
    const row = e.target instanceof Element ? e.target.closest('.line') : null;
    if (row && body.contains(row)) row.scrollIntoView({ block: 'nearest' });
    checkEnd();
  });

  const onDocClick = (e) => { if (openGloss && !(e.target instanceof Element && e.target.closest('.vocab-wrap'))) closeGloss(); };
  const onDocKey = (e) => { if (e.key === 'Escape') closeGloss(); };
  document.addEventListener('click', onDocClick);
  document.addEventListener('keydown', onDocKey);

  let playingD = null;
  return {
    el: el('section', { className: 'reader' }, head, rule ? rule.panel : null, body),
    body,
    rule,
    listen,
    checkEnd,
    closeGloss,
    // 재생 중인 줄 표시 (색 + ▶). null이면 지운다.
    setPlaying(d, follow) {
      if (playingD === d) return;
      if (playingD !== null && rows.has(playingD)) {
        const r = rows.get(playingD);
        r.row.classList.remove('playing');
        r.play.textContent = '▷';
      }
      playingD = d;
      if (d !== null && rows.has(d)) {
        const r = rows.get(d);
        r.row.classList.add('playing');
        r.play.textContent = '▶';
        if (follow) r.row.scrollIntoView({ block: 'nearest' });
      }
    },
    // 근거 줄 밑줄
    underline(d) {
      const r = rows.get(d);
      if (!r) return;
      r.row.classList.add('evidence');
      r.row.scrollIntoView({ block: 'nearest' });
    },
    // 관찰 일지를 고른 뒤 그 줄이 잠깐 빛난다 (1초)
    flash(d) {
      const r = rows.get(d);
      if (!r) return;
      r.row.classList.add('flash');
      r.row.scrollIntoView({ block: 'nearest' });
      setTimeout(() => r.row.classList.remove('flash'), 1000);
    },
    // 문장 고르기: fn이 있으면 ☆가 fn(d)를 부른다. null이면 끝.
    setPicking(fn) {
      picking = fn;
      body.classList.toggle('picking', Boolean(fn));
    },
    // 예측 자리에서 고른 줄 표시
    markPicked(d) {
      const r = rows.get(d);
      if (!r) return;
      r.row.classList.add('picked');
      r.row.scrollIntoView({ block: 'nearest' });
    },
    setSound(ok) {
      body.classList.toggle('no-sound', !ok);
      listen.disabled = !ok;
      for (const r of rows.values()) r.play.disabled = !ok;
    },
    destroy() {
      if (rule) rule.destroy();
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onDocKey);
    },
  };
}
