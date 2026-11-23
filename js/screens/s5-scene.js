// S5 장면 화면 (스토리보드 3·4장, docs/ARCHITECTURE.md 3.4)
// 단계: open(도입 3초) → read(읽기·듣기) → ask(묻기) → done(요약·카드·다음 장면). 마친 장면은 다시 보기.
// 묻기: 확인(c) · 예측(p, 두 번째 여행은 문장 고르기) · 관찰 일지(m). 장면 3·5·6은 열릴 때 Travis 한 줄이 먼저 나온다.
// 이전 장면: 지금 장면을 감춘 채 그대로 두고(고르던 상태·첫 시도 기록이 그대로 남는다) 그 위에 앞 장면을 다시 보기로 연다.
//   다시 보기 화면의 "지금 장면"(또는 맨 위 칸의 지금 장면)을 누르면 감춰 둔 지금 장면으로 돌아온다.
// 장비 점검: 첫 여행의 첫 접속에서 장면 1 위에 1~6단계, 장면 2 묻기 칸이 처음 열릴 때 7단계.
import { el, say, button, img, later, onLeave, preload, cardSrc, moodSrc, reducedMotion } from '../ui.js';
import { line } from '../text.js';
import { saveRecord } from '../state.js';
import { getScene, getStory } from '../content.js';
import { loadSceneAudio, dropSceneAudio, play, stop, hasSound } from '../player.js';
import { queueResult } from '../send.js';
import { SCENES, MOODS } from '../../data/scenes.js';
import { NOTEBOOK_LIMIT, LISTEN_PAUSE_MS, LISTEN_PAUSE_INLINE_MS, LISTEN_PAUSE_CHAIN_INLINE_MS, GUIDE_HINT_MS, GUIDE_CLUE_MS, GUIDE_DONE_MS } from '../../data/config.js';
import { makeReader } from '../parts/reader.js';
import { makeGuide } from '../parts/guide.js';
import { missionList } from '../parts/tasks.js';
import { signBox, signText, fitSign } from '../parts/sign.js';
import { checkAsk, checkReview, predictAsk, predictReview, moodAsk, moodReview, pickAsk, pickReview, doneView, reviewView } from '../parts/ask.js';
import { renderSoon } from './soon.js';

const READY = new Set([1, 2, 3, 4, 5, 6]); // 완성된 장면
const INTRO_MS = 3000;

export function renderScene(root, { go, app, opts, name }) {
  const n = Number(opts.n) || 1;
  if (!SCENES[n - 1] || !getScene(n) || !READY.has(n)) return renderSoon(root, { name: `${name}-${n}` });

  const rec = app.rec;
  const rewind = Boolean(opts.rewind) && rec.flags.ended; // 되감기: 묻기 없음, ☆ 있음, "길 지도"는 되감기 지도로
  const mode = rewind ? 'rewind' : rec.done.includes(n) ? 'replay' : 'live';
  // 되감기 길 지도에서 보고 뒤 장면 6 칸으로 온 다시 보기: ☆ 없이, "길 지도"는 되감기 길 지도로 돌아간다
  const backTo = opts.back === 's11' && mode === 'replay' ? 's11' : 's4';
  // 길 지도의 "사용법": 장면 1 위에서 장비 점검을 다시 본다("건너뛰기" 있음)
  const again = opts.guide === 'again' && n === 1 && !rewind;

  let past = null;  // 다시 보기로 연 앞 장면
  let back = null;  // 지금 장면으로 돌아올 때 포커스를 돌려줄 단추
  const now = buildScene(n, { app, go, mode, again, backTo, openPast: mode === 'live' ? openPast : null });
  root.append(now.box);

  function openPast(m, from) {
    if (past) { past.destroy(); past.box.remove(); }
    else { back = from || null; now.pause(); now.box.hidden = true; }
    past = buildScene(m, { app, go, mode: 'past', nowN: n, openPast, onNow: backToNow });
    root.append(past.box);
    past.focus.focus({ preventScroll: true });
  }
  function backToNow() {
    if (!past) return;
    past.destroy();
    past.box.remove();
    past = null;
    now.box.hidden = false;
    now.resume();
    const f = back && back.isConnected && !back.hidden && !back.closest('[hidden]') ? back : now.focus;
    if (!f.hasAttribute('tabindex') && f.tagName !== 'BUTTON') f.tabIndex = -1;
    f.focus({ preventScroll: true });
  }

  onLeave(() => {
    if (past) past.destroy();
    now.destroy();
    dropSceneAudio();
  });
  return now.focus;
}

// 장면 하나. mode: 'live'(풀고 있는 장면) · 'replay'(길 지도에서 연 마친 장면) · 'rewind'(되감기) · 'past'(이전 장면 다시 보기)
function buildScene(n, { app, go, mode, again = false, backTo = 's4', openPast = null, onNow = null, nowN = 0 }) {
  const scene = SCENES[n - 1];
  const data = getScene(n);
  const rec = app.rec;
  const story = getStory();
  const live = mode === 'live';
  let alive = true;
  let paused = false;
  let playing = null;   // 'all' | 'line' | 'tv'
  let lineD = null;     // 문장 듣기로 재생 중인 줄
  let liveAsk = null;   // 숫자 키를 받을 묻기
  let guide = null;     // 장비 점검
  let hint = null;      // 장비 점검 6단계(장면 1 묻기 칸의 뜻 보기)·7단계(장면 2의 "이전 장면")
  let guidedHere = false; // 이번에 장비 점검을 보았다 → 장면 1 묻기 칸이 처음 열릴 때 6단계
  let shown6 = false;

  // ----- 맨 위 띠: 길 지도 칸 6개 + 장면 이름 -----
  // 풀고 있는 장면과 이전 장면 다시 보기에서는 마친 장면 칸을 눌러 그 장면을 다시 볼 수 있다.
  const steps = el('ol', { className: 'steps' }, ...SCENES.map((s) => {
    const done = rec.done.includes(s.n);
    const canGo = openPast && s.n !== n && (done || s.n === nowN);
    const step = canGo ? el('button', { type: 'button', className: 'step', textContent: String(s.n) }) : el('span', { className: 'step', textContent: String(s.n) });
    if (done) step.classList.add('is-done');
    if (s.n === n) { step.classList.add('is-now'); step.setAttribute('aria-current', 'step'); }
    if (canGo) {
      step.setAttribute('aria-label', line(`scene.${s.n}.name`));
      step.dataset.go = String(s.n);
      step.addEventListener('click', () => { if (s.n === nowN) onNow(); else openPast(s.n, step); });
    }
    return el('li', {}, step);
  }));
  const title = el('h1', { className: 'scene-name', textContent: line(`scene.${n}.name`) });
  // 되감기: 위쪽에 임무 목록 (☐ 단서 담기 (n/5) · ☐ 단서 수첩 보고)
  const tasks = mode === 'rewind' ? missionList(rec) : null;
  const top = el('header', { className: 'scene-top' }, steps, tasks ? tasks.el : null, title);

  // ----- 장면 그림 + TV 단추 + 도입 문구 -----
  const pic = el('figure', { className: 'scene-pic media' }, img(`assets/img/cards/${scene.img}.webp`, 'scene-img', line(`card.${scene.card}`)));
  // 빈 간판 자리에 올바른 간판 문구를 얹어 쓴다. 같은 문장이 본문에 있으므로 화면 읽기에서는 뺀다.
  if (scene.sign) {
    const sign = signBox(signText());
    sign.setAttribute('aria-hidden', 'true');
    pic.classList.add('sign-host');
    pic.append(sign);
    // 그림 칸이 낮아져 그림 위아래가 잘려도 간판 자리에 맞게
    onLeave(fitSign(pic, pic.querySelector('.scene-img'), sign));
  }
  // 뉴스 TV 단추(장면 1·6): 장면 그림 아래 여백에 그림 너비만큼. TV 그림표 + "뉴스". 나오는 동안 "멈춤".
  // 장면이 열릴 때 테두리가 한 번 1초 빛난다.
  let tv = null;
  let tvText = null;
  const setTv = (id) => { tvText.textContent = line(id); tv.dataset.copy = id; };
  if (scene.tv) {
    tvText = el('span', { className: 'tv-label' });
    const icon = el('span', { className: 'tv-icon' });
    icon.setAttribute('aria-hidden', 'true');
    tv = el('button', { type: 'button', className: 'tv' }, icon, tvText);
    setTv('btn.news');
    tv.setAttribute('aria-pressed', 'false');
    tv.disabled = true;
    tv.addEventListener('click', () => {
      if (playing === 'tv') { stop(); return; }
      if (play([scene.tv], { onEnd: resetSound })) { playing = 'tv'; tv.setAttribute('aria-pressed', 'true'); setTv('btn.stop'); }
    });
    if (!reducedMotion()) {
      tv.classList.add('glow');
      later(1000, () => tv.classList.remove('glow'));
    }
  }
  const left = tv ? el('div', { className: 'scene-left' }, pic, tv) : pic;
  if (live) {
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
    stars: (rec.trip === 2 && backTo !== 's11') || mode === 'rewind',
    starLimit: NOTEBOOK_LIMIT,
    starCount: () => rec.notes.length,
    isStarred: (d) => noteAt(d) >= 0,
    onStar(d) {
      const at = noteAt(d);
      if (at >= 0) rec.notes.splice(at, 1);
      else if (rec.notes.length >= NOTEBOOK_LIMIT) return 'full';
      else rec.notes.push({ d, memo: '' });
      saveRecord(rec);
      if (tasks) tasks.refresh();
      if (mode === 'rewind') afterStar();
      return at >= 0 ? 'off' : 'on';
    },
    // 되감기에서 수첩이 찼고 보고 전이면 ★ 5/5를 누르면 단서 수첩으로 간다 (그 밖에는 단서 기준 말풍선)
    onCount: mode === 'rewind' ? () => {
      if (rec.notes.length >= NOTEBOOK_LIMIT && !rec.flags.reported) { go('s11', { view: 'notebook' }); return true; }
      return false;
    } : undefined,
    onLine(d) {
      if (!ready) return;
      if (playing === 'line' && lineD === d) { stop(); return; }
      const ids = chunksOf.get(d) || [];
      if (play(ids, { pause: () => LISTEN_PAUSE_INLINE_MS, onStep: () => reader.setPlaying(d, false), onEnd: resetSound })) { playing = 'line'; lineD = d; }
    },
    onReadEnd() { readDone.disabled = false; },
  });

  let ready = false;
  function resetSound() {
    playing = null;
    lineD = null;
    reader.setPlaying(null);
    reader.listen.textContent = line('btn.listen');
    reader.listen.dataset.copy = 'btn.listen';
    if (tv) { tv.setAttribute('aria-pressed', 'false'); setTv('btn.news'); }
  }
  reader.listen.addEventListener('click', () => {
    if (playing === 'all') { stop(); return; }
    const started = play(order.map((o) => o[0]), {
      pause: (i) => (order[i][1] === order[i - 1][1] ? LISTEN_PAUSE_CHAIN_INLINE_MS : LISTEN_PAUSE_MS), // 같은 문장 안이면 짧게
      onStep: (i) => reader.setPlaying(order[i][1], true),
      onEnd: resetSound,
    });
    if (started) {
      playing = 'all';
      reader.listen.textContent = line('btn.stop');
      reader.listen.dataset.copy = 'btn.stop';
    }
  });
  // 소리 묶음을 못 받으면 듣기 단추는 흐린 채로 두고 읽기는 그대로 진행한다
  function loadSound() {
    ready = false;
    reader.setSound(false);
    if (tv) tv.disabled = true;
    box.dataset.sound = 'loading';
    loadSceneAudio(n).then((ok) => {
      if (!alive || paused) return;
      ready = ok;
      reader.setSound(ok);
      if (tv) tv.disabled = !(ok && hasSound(scene.tv));
      box.dataset.sound = ok ? 'ok' : 'none';
    });
  }

  // ----- 묻기 칸 -----
  // 풀고 있는 장면 2부터는 묻기 칸 왼쪽 아래에 "이전 장면" (묻는 동안).
  // 선지 줄의 맨 앞에 넣어, 같은 줄 맨 오른쪽의 "뜻 보기"와 높이를 맞춘다.
  const slot = el('div', { className: 'ask-slot' });
  let prevWrap = null;
  let prev = null;
  if (live && openPast && n >= 2 && rec.done.includes(n - 1)) {
    prev = button('btn.prevScene', () => { endHint(); openPast(n - 1, prev); }, 'small');
    prevWrap = el('div', { className: 'ask-prev' }, prev);
  }
  const panel = el('div', { className: 'ask-panel' }, slot);
  panel.hidden = true;
  // 선지를 고르면 7단계 안내를 지운다.
  slot.addEventListener('click', (e) => {
    if (!(e.target instanceof Element)) return;
    if (e.target.closest('.opt')) endHint();
  });

  // "사용법"으로 마친 장면 1을 다시 볼 때는 "다 읽었다"와 묻기 칸(내가 고른 답)으로 5·6단계를 해 본다
  const demo = again && mode === 'replay';
  const readDone = button('btn.readDone', () => {
    if (demo) readFoot.hidden = true; else startAsks();
  }, 'primary');
  readDone.disabled = true;
  const readFoot = el('div', { className: 'reader-foot' }, readDone);
  if (live || demo) reader.el.append(readFoot);

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
    slot.replaceChildren(view.el);
    box.dataset.phase = phase;
    if (prevWrap) {
      const row = phase === 'ask' ? view.el.querySelector('.ask-line') : null;
      if (row) row.prepend(prevWrap); else prevWrap.remove();
    }
    if (view.focus) {
      if (!view.focus.hasAttribute('tabindex') && view.focus.tagName !== 'BUTTON') view.focus.tabIndex = -1;
      view.focus.focus({ preventScroll: true });
    }
  }

  function startAsks() {
    readFoot.hidden = true;
    nextAsk();
    // 장비 점검 6단계: 장비 점검을 본 이번 접속에서 장면 1의 묻기 칸이 처음 열릴 때. '뜻 보기'를 누르면 설명만 닫힌다(뜻은 바뀌지 않음).
    if (n === 1 && guidedHere && !shown6 && box.dataset.phase === 'ask' && slot.querySelector('.meaning')) {
      shown6 = true;
      hint = makeGuide(box, { block: 'target', steps: [{ no: 6, copy: 'guide.6', target: () => slot.querySelector('.meaning'), hole: () => panel, sides: ['above'] }], onEnd: () => { hint = null; } });
      hint.start();
    }
    // 장비 점검 7단계: 첫 접속에서 장면 2 묻기 칸이 처음 열릴 때 한 번. 누르면 설명만 닫히고(이전 장면으로 가지 않음), 누르지 않아도 사라진다.
    if (prev && n === 2 && app.fresh && !rec.flags.guide7 && box.dataset.phase === 'ask') {
      rec.flags.guide7 = true;
      saveRecord(rec);
      hint = makeGuide(box, { block: 'target', steps: [{ no: 7, copy: 'guide.7', target: () => prev, hole: () => panel, sides: ['above'] }], onEnd: () => { hint = null; } });
      hint.start();
      later(GUIDE_HINT_MS, endHint);
    }
  }
  function endHint() { if (hint) hint.end(); }

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
      // 처음 고른 카드를 기록한다 (결과 시트의 관찰 일지 칸). 수료증에는 정답 카드가 나온다.
      ask = moodAsk(id, MOODS[id], {
        onFirst(pick) {
          rec.mood[id] = MOODS[id].options[pick];
          saveRecord(rec);
        },
        onRight: () => reader.flash(MOODS[id].evidence),
        onEvidence: (d) => reader.underline(d),
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
    endHint();
    if (!rec.done.includes(n)) {
      rec.done.push(n);
      rec.done.sort((a, b) => a - b);
      saveRecord(rec);
      queueResult(rec);
    }
    steps.children[n - 1].firstChild.classList.add('is-done');
    show(doneView(scene, { onNext: () => go(scene.next || 's4'), star }), 'done');
  }

  // 다시 보기: 그 장면의 Travis 요약 + 내가 고른 답. "장면 5부터"로 온 학생의 장면 1~4에는 고른 답이 없다.
  function showReview() {
    const reviews = asks.filter(answered).map((a) => {
      if (a[0] === 'c') return checkReview(a, story.checks[a], rec.checks[a]);
      if (a[0] === 'm') return moodReview(a, MOODS[a]);
      if (rec.trip === 2) { if (rec.picks[a].d !== null) reader.markPicked(rec.picks[a].d); return pickReview(rec.picks[a], textOf); }
      return predictReview(a, rec.predict[a]);
    });
    const view = mode === 'past'
      ? reviewView(reviews, { onMain: onNow, mainId: 'btn.nowScene', summaryN: n })
      : reviewView(reviews, { onMain: () => go(backTo), star, summaryN: n });
    panel.hidden = false;
    slot.replaceChildren(view.el);
    box.dataset.phase = mode === 'past' ? 'past' : 'replay';
    return view;
  }

  const onKey = (e) => {
    if (paused || !liveAsk || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target instanceof Element && e.target.closest('input, textarea')) return;
    if (e.key >= '1' && e.key <= '3') { endHint(); liveAsk.key(Number(e.key)); }
  };
  document.addEventListener('keydown', onKey);

  const box = el('section', { className: 'scene' }, top, el('div', { className: 'scene-mid' }, left, reader.el), panel);
  box.dataset.scene = String(n);
  box.dataset.phase = 'read';
  box.dataset.mode = mode;
  loadSound();

  // 되감기: 다섯 번째 단서를 담는 순간 ★ 5/5 단추를 장비 점검 모양으로 가리킨다. 하나를 빼면 사라진다.
  let fullHint = null;
  function afterStar() {
    const full = rec.notes.length >= NOTEBOOK_LIMIT && !rec.flags.reported;
    if (full && !fullHint && reader.rule) {
      fullHint = makeGuide(box, { steps: [{ no: 0, copy: 's11.goNotebook', target: () => reader.rule.button, sides: ['below', 'left'] }], onEnd: () => { fullHint = null; } });
      fullHint.start();
    } else if (!full && fullHint) {
      fullHint.end();
    }
  }

  let focus = title;
  if (mode === 'rewind') {
    panel.hidden = false;
    const prevBtn = n > 1 ? button('btn.prevScene', () => go('s5', { n: n - 1, rewind: true }), '') : null;
    const nextBtn = n < 5
      ? button('btn.nextScene', () => go('s5', { n: n + 1, rewind: true }), 'primary')
      : button('btn.notebook', () => go('s11', { view: 'notebook' }), 'primary');
    const mapBtn = button('btn.map', () => go('s11'), '');
    slot.replaceChildren(el('div', { className: 'rewind-nav' },
      el('div', { className: 'rewind-nav-left' }, prevBtn),
      el('div', { className: 'rewind-nav-right' }, mapBtn, nextBtn)));
    box.dataset.phase = 'rewind';
  } else if (mode === 'past') {
    focus = showReview().focus;
  } else if (mode === 'replay') {
    showReview();
  }
  // 수첩이 처음 열릴 때(두 번째 여행의 장면 1) 단서 기준을 한 번 4초 보여 준다
  const firstGuide = live && n === 1 && app.fresh && !rec.flags.guide;
  // 6단계를 실제 묻기 칸에서 띄울 접속: 처음 장비 점검을 본 접속, 또는 아직 마치지 않은 장면 1에서 "사용법"으로 다시 본 때
  guidedHere = firstGuide || (again && live);
  if (mode !== 'past' && reader.rule && !rec.flags.rule) {
    rec.flags.rule = true;
    saveRecord(rec);
    // 장비 점검이 나오는 때는 단서 2단계(★ n/5를 가리킬 때) 함께 보여 준다
    if (!(firstGuide || again)) later(300, () => reader.rule.show(4000));
  }

  // 장비 점검 1~6단계: 첫 접속에서 장면 1을 열 때 한 번(두 여행 모두). 두 번째 여행은 3단계 뒤에 단서 1·2단계가 더 나온다.
  // 길 지도의 "사용법"으로 다시 볼 때는 "건너뛰기"가 있고, 여행 종류에 맞는 단계를 보여 준다.
  if (firstGuide || again) {
    const noSound = () => box.dataset.sound === 'none';
    const exampleLine = () => reader.body.querySelector('.line:not(.title-line)');
    guide = makeGuide(box, {
      skip: again,
      // 가리킨 단추를 누르면 설명만 넘어가고 원래 동작(소리·뉴스·단어 뜻·☆·묻기 칸)은 막는다. 다른 단추도 막는다.
      block: 'all',
      done: { copy: 'guide.end', ms: GUIDE_DONE_MS },
      steps: [
        { no: 1, copy: 'guide.1', target: () => reader.listen, skip: noSound, sides: ['right'] },
        // 2: 문장 하나 (문장 글이나 ▷ 아무것이나. 점선 단어·☆는 빼고)
        { no: 2, copy: 'guide.2', target: exampleLine, focus: () => exampleLine() && exampleLine().querySelector('.line-play'), skip: noSound, sides: ['below', 'above'],
          accept: (t) => Boolean(t.closest('.reader-body .line-play') || (t.closest('.reader-body .line-text') && !t.closest('.vocab'))) },
        // 3: 점선 단어 하나 (아무 점선 단어나)
        { no: 3, copy: 'guide.3', target: () => reader.body.querySelector('.vocab'), sides: ['below', 'above'], accept: (t) => Boolean(t.closest('.reader-body .vocab')) },
        ...(reader.rule ? [
          // 단서 1: 문장 끝 ☆ 하나를 가리킨다. 아무 ☆나 눌러야 다음으로
          { no: 3.1, id: 'c1', copy: 'guide.c1', target: () => { const l = exampleLine(); return l && l.querySelector('.clue'); }, sides: ['below', 'left'], accept: (t) => Boolean(t.closest('.reader-body .clue')) },
          // 단서 2: ★ n/5를 가리키고 단서 기준 말풍선을 함께 보인다. 4초 뒤 저절로 4단계로
          { no: 3.2, id: 'c2', copy: 'guide.c2', target: () => reader.rule.button, auto: GUIDE_CLUE_MS, onShow: () => reader.rule.show(GUIDE_CLUE_MS), also: () => [reader.rule.panel], sides: ['left', 'below'] }, // 말풍선도 밝게
        ] : []),
        { no: 4, copy: 'guide.4', target: () => tv, skip: () => noSound() || (box.dataset.sound === 'ok' && !hasSound(scene.tv)), sides: ['above', 'right'] },
        { no: 5, copy: 'guide.5', target: () => readDone, hole: () => reader.el, sides: ['left', 'above'] }, // 본문을 읽고 끝까지 내려야 하므로 본문 칸 전체를 밝게
        // 6: "사용법"으로 마친 장면 1을 다시 볼 때만 이어서. 내가 고른 답 줄의 '뜻 보기'를 가리킨다(없으면 묻기 칸 자리)
        ...(demo ? [{ no: 6, copy: 'guide.6', target: () => slot.querySelector('.meaning') || panel, hole: () => panel, sides: ['above'] }] : []),
      ],
      // 다음 단계로 넘어갈 때 열려 있는 단어 뜻 말풍선을 닫는다. 점선 단어를 누른 그 클릭이 말풍선을 연 뒤에 닫히도록 한 박자 늦춘다.
      onStep: () => setTimeout(() => reader.closeGloss(), 0),
      onEnd() {
        guide = null;
        reader.setGlossBlocked(false);
        if (demo) readFoot.hidden = true; // 다시 보기에서 5단계용으로 보인 "다 읽었다"는 거둔다
        if (firstGuide && !rec.flags.guide) { rec.flags.guide = true; saveRecord(rec); }
      },
    });
    // 첫 화면이 그려진 뒤에 시작한다 (테두리 자리를 재려면)
    reader.setGlossBlocked(true); // 장비 점검 중에는 단어 뜻 말풍선을 열지 않는다
    requestAnimationFrame(() => { if (alive && guide) guide.start(); });
  }

  // 이 장면의 관찰 일지 그림과 다음 장면 그림, (장면 6이면) 수료증에 쓸 그림을 미리 받아 둔다
  if (live) {
    const soon = [];
    for (const a of asks) if (a[0] === 'm') soon.push(...MOODS[a].options.map(moodSrc));
    if (SCENES[n]) soon.push(cardSrc(SCENES[n].img));
    if (n === 6) soon.push(...SCENES.map((s) => cardSrc(s.img)));
    if (prev) soon.push(cardSrc(SCENES[n - 2].img));
    preload(soon);
  }
  // 본문이 한 화면에 다 들어오면 "다 읽었다"가 바로 켜진다
  requestAnimationFrame(() => reader.checkEnd());

  let savedTop = 0;
  return {
    box,
    focus,
    // 이전 장면을 보러 갈 때: 소리를 멈추고 감춘다. 묻기·타이머는 그대로 둔다.
    pause() {
      paused = true;
      stop();
      reader.closeGloss();
      savedTop = reader.body.scrollTop;
    },
    // 돌아왔을 때: 본문 위치를 되돌리고 이 장면의 소리를 다시 받는다
    resume() {
      paused = false;
      reader.body.scrollTop = savedTop;
      loadSound();
    },
    destroy() {
      alive = false;
      document.removeEventListener('keydown', onKey);
      if (guide) guide.end();
      if (fullHint) fullHint.end();
      endHint();
      reader.destroy();
    },
  };
}
