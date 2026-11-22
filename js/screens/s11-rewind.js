// S11 되감기 (스토리보드 6장, docs/ARCHITECTURE.md 3.2·3.6)
// 길 지도(장면 1~5 강조) ⇄ 장면 다시 보기(묻기 없음, ☆ 있음) ⇄ 단서 수첩(최대 5칸, 문장 + 한 줄 메모) → "보고"
// 두 번째 여행은 엔딩 전에도 S4의 수첩 단추로 단서 수첩만 연다 (opts.view === 'notebook').
import { el, say, button, img, onLeave, later } from '../ui.js';
import { clueRule } from '../parts/cluerule.js';
import { makeGuide } from '../parts/guide.js';
import { line } from '../text.js';
import { saveRecord } from '../state.js';
import { getStory } from '../content.js';
import { queueResult } from '../send.js';
import { SCENES, MAP_SPOTS } from '../../data/scenes.js';
import { NOTEBOOK_LIMIT, REWIND_LINE_MS } from '../../data/config.js';

// 줄 번호 → 장면 번호와 문장
function findLine(d) {
  const story = getStory();
  for (const [n, sc] of Object.entries((story && story.scenes) || {})) {
    const ln = sc.lines.find((x) => x.d === d);
    if (ln) return { scene: Number(n), text: ln.chunks.map((c) => c.text).join(' ') };
  }
  return { scene: 0, text: '' };
}

const countText = (rec) => `★ ${rec.notes.length}/${NOTEBOOK_LIMIT}`;

export function renderRewind(root, { go, app, opts }) {
  const rec = app.rec;
  const open = rec.flags.ended; // 되감기가 열렸는가
  if (opts.view === 'notebook' || !open) return renderNotebook(root, { go, app, back: open ? 'rewind' : 's4' });
  // 첫 여행은 처음 들어올 때 설명을 먼저 본다 ("임무 시작"을 누르기 전에 끊기면 다음에 다시 본다)
  if (rec.trip === 1 && !rec.flags.why) return renderWhy(root, { go, app });
  return renderRewindMap(root, { go, app });
}

// 되감기 설명 (첫 여행만): [본부] 문구 → [Travis] 네 줄이 한 줄씩 → "임무 시작" → 길 지도와 단서 기준 말풍선
function renderWhy(root, { go, app }) {
  const rec = app.rec;
  const head = say('s11.open', {}, 'h1');
  const face = say('s11.why1').querySelector('.face'); // Travis 얼굴
  const list = el('ol', { className: 'why-lines' });
  list.setAttribute('aria-live', 'polite');
  const start = button('btn.missionStart', () => {
    rec.flags.why = true;
    saveRecord(rec);
    go('s11');
  }, 'primary');
  start.hidden = true;
  const box = el('section', { className: 'rewind-why' }, head, el('div', { className: 'say-travis why-travis' }, face, list), el('div', { className: 'btn-row' }, start));
  box.dataset.state = 'why';
  root.append(box);
  const ids = ['s11.why1', 's11.why2', 's11.why3', 's11.why4'];
  const show = (i) => {
    if (i >= ids.length) {
      start.hidden = false;
      box.dataset.state = 'ready';
      const a = document.activeElement;
      if (!a || a === document.body || a === head) start.focus({ preventScroll: true });
      return;
    }
    const li = el('li', { className: 'say-text', textContent: line(ids[i]) });
    li.dataset.copy = ids[i];
    list.append(li);
    box.dataset.lines = String(i + 1);
    later(i + 1 < ids.length ? REWIND_LINE_MS : 1000, () => show(i + 1));
  };
  later(1000, () => show(0));
  return head;
}

// 되감기 길 지도: 장면 1~5 칸이 빛나고 누르면 그 장면을 ☆와 함께 다시 본다
function renderRewindMap(root, { go, app }) {
  const rec = app.rec;
  const head = say('s11.open');
  const status = el('div', { className: 'map-status', role: 'status' }, head);
  const cells = SCENES.map((s, i) => {
    const card = img(`assets/img/cards/${s.img}.webp`, 'cell-card', line(`card.${s.card}`));
    const no = el('span', { className: 'cell-no', textContent: String(s.n) });
    let cell;
    if (s.n <= 5) {
      cell = el('button', { type: 'button', className: 'cell is-done is-rewind', title: line(`scene.${s.n}.name`) }, card, no);
      cell.addEventListener('click', () => go('s5', { n: s.n, rewind: true }));
    } else {
      // 장면 6: 모든 장면을 마쳤으므로 1~5와 같은 파란 윤곽선. 단서는 장면 1~5에서만 찾는다.
      // 보고 전에는 누르면 잠금 문구, 보고 뒤에는 장면 6을 다시 보기로 연다(☆·묻기 없음). 돌아오면 이 지도로.
      cell = el('button', { type: 'button', className: 'cell is-done is-rewind is-end', title: line(`scene.${s.n}.name`) }, card, no);
      cell.addEventListener('click', () => {
        if (rec.flags.reported) { go('s5', { n: s.n, back: 's11' }); return; }
        const msg = say('s11.scene6Locked');
        status.replaceChildren(msg);
      });
    }
    cell.dataset.scene = String(s.n);
    const li = el('li', { className: 'map-spot' }, cell);
    li.style.left = MAP_SPOTS[i][0] + '%';
    li.style.top = MAP_SPOTS[i][1] + '%';
    return cell;
  });
  const mapImg = img('assets/img/map.webp', 'map-img', '');
  mapImg.decoding = 'sync';
  const stage = el('div', { className: 'map-stage media' }, mapImg, el('ol', { className: 'map-cells' }, ...cells.map((c) => c.parentElement)));

  const rule = clueRule({
    mode: 'float',
    text: () => countText(rec),
    label: () => `${line('notebook.name')} ${rec.notes.length}/${NOTEBOOK_LIMIT}`,
    onClick: () => go('s11', { view: 'notebook' }),
  });
  rule.button.classList.add('notebook');
  onLeave(() => rule.destroy());
  const notebook = rule.wrap;
  // 수첩이 처음 열릴 때(첫 여행은 되감기에 들어올 때) 단서 기준을 한 번 4초 보여 준다
  const ruleShown = !rec.flags.rule;
  if (!rec.flags.rule) {
    rec.flags.rule = true;
    saveRecord(rec);
    later(300, () => rule.show(4000));
  }
  const cert = button('btn.certificate', () => go('s10'), 'small');
  // 보고 뒤에는 평소 길 지도(S4)로 가는 단추 (카드 보기·영상 다시 보기·사용법)
  const toMap = rec.flags.reported ? button('btn.map', () => go('s4'), 'small') : null;
  const bar = el('div', { className: 'map-bar' }, status, el('div', { className: 'btn-row map-buttons' }, notebook, cert, toMap));
  const box = el('section', { className: 'map rewind' }, stage, bar);
  box.dataset.state = 'rewind';
  root.append(box);
  // 수첩이 다 찼는데 아직 보고하지 않았으면 단서 수첩 단추를 가리킨다 (장비 점검과 같은 모양).
  // 단서 기준 말풍선이 처음 뜨는 때면 그것이 사라진 뒤에.
  if (rec.notes.length >= NOTEBOOK_LIMIT && !rec.flags.reported) {
    const hint = makeGuide(box, { steps: [{ no: 0, copy: 's11.goNotebook', target: () => rule.button, sides: ['above', 'left'] }] });
    later(ruleShown ? 4300 : 300, () => hint.start());
    onLeave(() => hint.end());
  }
  return cells[0];
}

// 단서 수첩: 담은 문장이 장면 번호와 함께 목록으로. 문장마다 "나중에 일어난 일" 한 줄(비워도 됨). ★를 누르면 뺀다.
function renderNotebook(root, { go, app, back }) {
  const rec = app.rec;
  const head = el('h1', { className: 'nb-title', textContent: line('notebook.name') });
  const rule = clueRule({ mode: 'inline', text: () => countText(rec), label: () => `${line('notebook.name')} ${rec.notes.length}/${NOTEBOOK_LIMIT}` });
  onLeave(() => rule.destroy());
  const count = rule.button;
  const list = el('ol', { className: 'nb-list' });
  const status = el('div', { className: 'status nb-status', role: 'status' });

  const save = () => { saveRecord(rec); };
  function draw() {
    const items = rec.notes.map((note) => ({ note, ...findLine(note.d) }))
      .sort((a, b) => a.scene - b.scene || a.note.d - b.note.d);
    list.replaceChildren(...items.map(({ note, scene, text }) => {
      const id = `nb-${note.d}`;
      const sentence = el('p', { className: 'nb-line', id, lang: 'en', textContent: text });
      const memoLabel = el('label', { className: 'nb-memo-label', htmlFor: `${id}-memo`, textContent: line('s11.memo') });
      const memo = el('input', { type: 'text', id: `${id}-memo`, className: 'nb-memo', maxLength: 100, autocomplete: 'off', value: note.memo || '' });
      memo.addEventListener('input', () => { note.memo = memo.value; status.replaceChildren(); save(); });
      const remove = el('button', { type: 'button', className: 'clue', textContent: '★' });
      remove.setAttribute('aria-pressed', 'true');
      remove.setAttribute('aria-labelledby', id);
      remove.addEventListener('click', () => {
        const at = rec.notes.indexOf(note);
        if (at >= 0) rec.notes.splice(at, 1);
        save();
        draw();
        const first = list.querySelector('input, button');
        (first || report).focus();
      });
      const li = el('li', { className: 'nb-item' },
        el('span', { className: 'nb-scene', textContent: line(`scene.${scene}.name`) }),
        el('div', { className: 'nb-body' }, sentence, el('div', { className: 'nb-memo-row' }, memoLabel, memo)),
        remove);
      li.dataset.d = String(note.d);
      return li;
    }));
    rule.refresh();
  }

  const report = button('btn.report', () => {
    for (const n of rec.notes) n.memo = String(n.memo || '').trim();
    rec.flags.reported = true;
    saveRecord(rec);
    queueResult(rec);
    status.replaceChildren(say('s11.reported'));
    box.dataset.state = 'reported';
  }, 'primary');
  const map = button('btn.map', () => go(back === 'rewind' ? 's11' : 's4'), '');

  draw();
  const box = el('section', { className: 'notebook-view' },
    el('header', { className: 'nb-head' }, head, rule.wrap),
    rule.panel,
    list,
    el('div', { className: 'nb-foot' }, status, el('div', { className: 'btn-row' }, report, map)));
  box.dataset.state = 'notebook';
  root.append(box);
  return head;
}
