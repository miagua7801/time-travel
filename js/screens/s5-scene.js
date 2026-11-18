// S5 장면 화면 (스토리보드 3·4장, docs/ARCHITECTURE.md 3.4)
// 단계: open(도입 3초) → read(읽기·듣기) → ask(묻기) → done(요약·카드·다음 장면). 마친 장면은 다시 보기.
// 묻기: 확인(c) · 예측(p, 두 번째 여행은 문장 고르기) · 관찰 일지(m). 장면 3·5·6은 열릴 때 Travis 한 줄이 먼저 나온다.
import { el, say, button, img, later, onLeave, preload, cardSrc, moodSrc } from '../ui.js';
import { line } from '../text.js';
import { saveRecord } from '../state.js';
import { getScene, getStory } from '../content.js';
import { loadSceneAudio, dropSceneAudio, play, stop, hasSound } from '../player.js';
import { queueResult } from '../send.js';
import { SCENES, MOODS } from '../../data/scenes.js';
import { NOTEBOOK_LIMIT, LISTEN_PAUSE_MS, LISTEN_PAUSE_INLINE_MS, LISTEN_PAUSE_CHAIN_INLINE_MS } from '../../data/config.js';
import { makeReader } from '../parts/reader.js';
import { signBox, signText } from '../parts/sign.js';
import { checkAsk, checkReview, predictAsk, predictReview, moodAsk, moodReview, pickAsk, pickReview, doneView, reviewView } from '../parts/ask.js';
import { renderSoon } from './soon.js';

const READY = new Set([1, 2, 3, 4, 5, 6]); // 완성된 장면
const INTRO_MS = 3000;

export function renderScene(root, { go, app, opts, name }) {
  const n = Number(opts.n) || 1;
  const scene = SCENES[n - 1];
  const data = getScene(n);
  if (!scene || !data || !READY.has(n)) return renderSoon(root, { name: `${name}-${n}` });

  const rec = app.rec;
  const story = getStory();
  const rewind = Boolean(opts.rewind) && rec.flags.ended; // 되감기: 묻기 없음, ☆ 있음, "길 지도"는 되감기 지도로
  const replay = rewind || rec.done.includes(n);
  let alive = true;
  let mode = null;      // 'all' | 'line' | 'tv'
  let lineD = null;     // 문장 듣기로 재생 중인 줄
  let liveAsk = null;   // 숫자 키를 받을 묻기

  // ----- 맨 위 띠: 길 지도 칸 6개 + 장면 이름 -----
  const steps = el('ol', { className: 'steps' }, ...SCENES.map((s) => {
    const li = el('li', { className: 'step', textContent: String(s.n) });
    if (rec.done.includes(s.n)) li.classList.add('is-done');
    if (s.n === n) { li.classList.add('is-now'); li.setAttribute('aria-current', 'step'); }
    return li;
  }));
  const title = el('h1', { className: 'scene-name', textContent: line(`scene.${n}.name`) });
  const top = el('header', { className: 'scene-top' }, steps, title);

  // ----- 장면 그림 + TV 단추 + 도입 문구 -----
  const pic = el('figure', { className: 'scene-pic media' }, img(`assets/img/cards/${scene.img}.webp`, 'scene-img', line(`card.${scene.card}`)));
  // 빈 간판 자리에 올바른 간판 문구를 얹어 쓴다. 같은 문장이 본문에 있으므로 화면 읽기에서는 뺀다.
  if (scene.sign) {
    const sign = signBox(signText());
    sign.setAttribute('aria-hidden', 'true');
    pic.classList.add('sign-host');
    pic.append(sign);
  }
  let tv = null;
  if (scene.tv) {
    tv = el('button', { type: 'button', className: 'tv', textContent: 'TV' });
    tv.setAttribute('aria-pressed', 'false');
    tv.disabled = true;
    tv.addEventListener('click', () => {
      if (mode === 'tv') { stop(); return; }
      if (play([scene.tv], { onEnd: resetSound })) { mode = 'tv'; tv.setAttribute('aria-pressed', 'true'); tv.textContent = 'TV ▶'; }
    });
    pic.append(tv);
  }
  if (!replay) {
    // 여는 문구: (장면 3·5·6) Travis 한 줄 3초 → 내레이션 도입 3초. 그림 위에 나타났다 사라진다.
    const lines = [];
    if (scene.echo) {
      if (rec.trip === 2) lines.push(say('trip2.read'));
      else if (rec.predict[scene.echo]) lines.push(say('echo.predict', { pick: line(`${scene.echo}.${rec.predict[scene.echo]}`) }));
    }
    lines.push(say(`scene.${n}.intro`));
    const showLine = (i) => {
      const node = lines[i];
      node.classList.add('intro-line');
      node.setAttribute('role', 'status');
      pic.append(node);
      later(INTRO_MS, () => { node.remove(); if (i + 1 < lines.length) showLine(i + 1); });
    };
    showLine(0);
  }

  // ----- 본문 칸 -----
  const order = [];                 // 이어 듣기 순서: [덩어리 id, 줄 번호]
  const chunksOf = new Map();       // 줄 번호 → 덩어리 id들
  for (const ln of data.lines) {
    chunksOf.set(ln.d, ln.chunks.map((c) => c.id));
    for (const c of ln.chunks) order.push([c.id, ln.d]);
  }
  const noteAt = (d) => rec.notes.findIndex((x) => x.d === d);
  const reader = makeReader(data, {
    sceneNo: n,
    stars: rec.trip === 2 || rewind,
    starLimit: NOTEBOOK_LIMIT,
    starCount: () => rec.notes.length,
    isStarred: (d) => noteAt(d) >= 0,
    onStar(d) {
      const at = noteAt(d);
      if (at >= 0) rec.notes.splice(at, 1);
      else if (rec.notes.length >= NOTEBOOK_LIMIT) return 'full';
      else rec.notes.push({ d, memo: '' });
      saveRecord(rec);
      return at >= 0 ? 'off' : 'on';
    },
    onLine(d) {
      if (!ready) return;
      if (mode === 'line' && lineD === d) { stop(); return; }
      const ids = chunksOf.get(d) || [];
      if (play(ids, { pause: () => LISTEN_PAUSE_INLINE_MS, onStep: () => reader.setPlaying(d, false), onEnd: resetSound })) { mode = 'line'; lineD = d; }
    },
    onReadEnd() { readDone.disabled = false; },
  });

  let ready = false;
  reader.setSound(false);
  function resetSound() {
    mode = null;
    lineD = null;
    reader.setPlaying(null);
    reader.listen.textContent = line('btn.listen');
    reader.listen.dataset.copy = 'btn.listen';
    if (tv) { tv.setAttribute('aria-pressed', 'false'); tv.textContent = 'TV'; }
  }
  reader.listen.addEventListener('click', () => {
    if (mode === 'all') { stop(); return; }
    const started = play(order.map((o) => o[0]), {
      pause: (i) => (order[i][1] === order[i - 1][1] ? LISTEN_PAUSE_CHAIN_INLINE_MS : LISTEN_PAUSE_MS), // 같은 문장 안이면 짧게
      onStep: (i) => reader.setPlaying(order[i][1], true),
      onEnd: resetSound,
    });
    if (started) {
      mode = 'all';
      reader.listen.textContent = line('btn.stop');
      reader.listen.dataset.copy = 'btn.stop';
    }
  });
  // 소리 묶음을 못 받으면 듣기 단추는 흐린 채로 두고 읽기는 그대로 진행한다
  loadSceneAudio(n).then((ok) => {
    if (!alive) return;
    ready = ok;
    reader.setSound(ok);
    if (tv) tv.disabled = !(ok && hasSound(scene.tv));
    box.dataset.sound = ok ? 'ok' : 'none';
  });

  // ----- 묻기 칸 -----
  const panel = el('div', { className: 'ask-panel' });
  panel.hidden = true;
  const readDone = button('btn.readDone', startAsks, 'primary');
  readDone.disabled = true;
  if (!replay) reader.el.append(el('div', { className: 'reader-foot' }, readDone));

  // 이 장면의 묻기 순서. 두 번째 여행의 장면 4는 끝에 예측 ②(문장 고르기)가 붙는다.
  const asks = [...scene.asks];
  if (n === 4 && rec.trip === 2) asks.push('p2');
  const answered = (a) => {
    if (a[0] === 'c') return Boolean(rec.checks[a]);
    if (a[0] === 'm') return Boolean(rec.mood[a]);
    return rec.trip === 2 ? a in rec.picks : Boolean(rec.predict[a]);
  };
  const textOf = (d) => { const ln = data.lines.find((x) => x.d === d); return ln ? ln.chunks.map((c) => c.text).join(' ') : ''; };

  const star = scene.star ? {
    id: scene.star,
    values: scene.star === 's2' && story.quotes ? { quote: story.quotes.star2 } : {},
    saved: () => rec.star[scene.star] || '',
    onSubmit(text) {
      rec.star[scene.star] = text;
      saveRecord(rec);
      queueResult(rec);
    },
  } : null;

  function show(view, phase) {
    panel.hidden = false;
    panel.replaceChildren(view.el);
    box.dataset.phase = phase;
    if (view.focus) {
      if (!view.focus.hasAttribute('tabindex') && view.focus.tagName !== 'BUTTON') view.focus.tabIndex = -1;
      view.focus.focus({ preventScroll: true });
    }
  }

  function startAsks() {
    readDone.parentElement.hidden = true;
    nextAsk();
  }

  // 아직 답하지 않은 묻기를 차례로. 이미 답한 묻기는 다시 묻지 않는다.
  function nextAsk() {
    liveAsk = null;
    reader.setPicking(null);
    const id = asks.find((a) => !answered(a));
    if (!id) { finish(); return; }
    const onDone = () => { if (alive) nextAsk(); };
    let ask;
    if (id[0] === 'c') {
      ask = checkAsk(id, story.checks[id], {
        onFirst(pick, right) {
          rec.checks[id] = { first: right, pick };
          saveRecord(rec);
        },
        onEvidence: (d) => reader.underline(d),
        onDone,
      });
    } else if (id[0] === 'm') {
      ask = moodAsk(id, MOODS[id], {
        onPick(key) {
          rec.mood[id] = key;
          saveRecord(rec);
          reader.flash(MOODS[id].flash);
        },
        onDone,
      });
    } else if (rec.trip === 2) {
      ask = pickAsk(id, {
        startPicking: (fn) => reader.setPicking(fn),
        stopPicking(d) { reader.setPicking(null); if (d !== null) reader.markPicked(d); },
        textOf,
        onSave(d, why) {
          rec.picks[id] = { d, why };
          saveRecord(rec);
        },
        onDone,
      });
    } else {
      ask = predictAsk(id, {
        onPick(key) {
          rec.predict[id] = key;
          saveRecord(rec);
        },
        onDone,
      });
    }
    liveAsk = ask;
    box.dataset.ask = id;
    show(ask, 'ask');
  }

  // 장면 완료: 기록하고 결과 대기열에 올린다
  function finish() {
    if (!rec.done.includes(n)) {
      rec.done.push(n);
      rec.done.sort((a, b) => a - b);
      saveRecord(rec);
      queueResult(rec);
    }
    steps.children[n - 1].classList.add('is-done');
    show(doneView(scene, { onNext: () => go(scene.next || 's4'), star }), 'done');
  }

  const onKey = (e) => {
    if (!liveAsk || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target instanceof Element && e.target.closest('input, textarea')) return;
    if (e.key >= '1' && e.key <= '3') liveAsk.key(Number(e.key));
  };
  document.addEventListener('keydown', onKey);

  const box = el('section', { className: 'scene' }, top, el('div', { className: 'scene-mid' }, pic, reader.el), panel);
  box.dataset.scene = String(n);
  box.dataset.phase = 'read';
  box.dataset.sound = 'loading';
  root.append(box);

  if (rewind) {
    panel.hidden = false;
    panel.replaceChildren(reviewView([], { onMap: () => go('s11') }).el);
    box.dataset.phase = 'rewind';
  } else if (replay) {
    // "장면 5부터"로 온 학생의 장면 1~4에는 고른 답이 없다
    const reviews = asks.filter(answered).map((a) => {
      if (a[0] === 'c') return checkReview(a, story.checks[a], rec.checks[a]);
      if (a[0] === 'm') return moodReview(a, MOODS[a], rec.mood[a]);
      if (rec.trip === 2) { if (rec.picks[a].d !== null) reader.markPicked(rec.picks[a].d); return pickReview(rec.picks[a], textOf); }
      return predictReview(a, rec.predict[a]);
    });
    panel.hidden = false;
    panel.replaceChildren(reviewView(reviews, { onMap: () => go('s4'), star }).el);
    box.dataset.phase = 'replay';
  }
  // 수첩이 처음 열릴 때(두 번째 여행의 장면 1) 단서 기준을 한 번 4초 보여 준다
  if (reader.rule && !rec.flags.rule) {
    rec.flags.rule = true;
    saveRecord(rec);
    later(300, () => reader.rule.show(4000));
  }
  // 이 장면의 관찰 일지 그림과 다음 장면 그림, (장면 6이면) 수료증에 쓸 그림을 미리 받아 둔다
  const soon = [];
  for (const a of asks) if (a[0] === 'm') soon.push(...MOODS[a].options.map(moodSrc));
  if (SCENES[n]) soon.push(cardSrc(SCENES[n].img));
  if (n === 6) soon.push(...SCENES.map((s) => cardSrc(s.img)));
  preload(soon);
  // 본문이 한 화면에 다 들어오면 "다 읽었다"가 바로 켜진다
  requestAnimationFrame(() => reader.checkEnd());

  onLeave(() => {
    alive = false;
    document.removeEventListener('keydown', onKey);
    reader.destroy();
    dropSceneAudio();
  });
  return title;
}
