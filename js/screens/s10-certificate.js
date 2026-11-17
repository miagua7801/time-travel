// S10 수료증 (스토리보드 6장, docs/ARCHITECTURE.md 3.2·3.5·3.6)
// 반·번호, 장면 카드 6장(누르면 뒤집힘), 내 예측과 실제로 일어난 일(두 번째 여행은 예측 자리에서 고른 문장 3개),
// 관찰 일지 3장(장면 3 → 4 → 6), ★ 답. 기록이 없는 칸은 숨긴다. 여기서 엔딩을 본 것으로 저장하고 결과를 보낸다.
import { el, say, button, img } from '../ui.js';
import { line } from '../text.js';
import { saveRecord } from '../state.js';
import { getScene, getStory } from '../content.js';
import { queueResult } from '../send.js';
import { SCENES, MOODS, PREDICTS } from '../../data/scenes.js';
import { makeCard } from '../parts/cardview.js';

function lineText(sceneNo, d) {
  const data = getScene(sceneNo);
  const ln = data && data.lines.find((x) => x.d === d);
  return ln ? ln.chunks.map((c) => c.text).join(' ') : '';
}

export function renderCertificate(root, { go, app }) {
  const rec = app.rec;
  const story = getStory();
  if (!rec.flags.ended) {
    rec.flags.ended = true;
    saveRecord(rec);
  }
  queueResult(rec);

  const head = say('s10.done', {}, 'h1');
  const title = el('p', { className: 'cert-title' },
    el('span', { textContent: line('s10.title') }),
    el('span', { className: 'cert-who', textContent: line('s0.who', { cls: rec.cls, num: rec.num }) }));

  const cards = el('ol', { className: 'cert-cards' }, ...SCENES.map((s) => el('li', {}, makeCard(s.n, false))));

  // 내 예측과 실제로 일어난 일 (맞았다 틀렸다는 표시하지 않는다)
  const rows = [];
  for (const id of ['p1', 'p2', 'p3']) {
    const n = id.slice(1);
    if (rec.trip === 2) {
      const p = rec.picks[id];
      if (!p) continue;
      const text = p.d === null ? line('btn.none') : lineText(PREDICTS[id].scene, p.d);
      rows.push(el('tr', {},
        el('th', { scope: 'row', textContent: '①②③'[n - 1] }),
        el('td', { className: 'cert-mine', lang: p.d === null ? 'ko' : 'en', colSpan: 2, textContent: text })));
    } else {
      if (!rec.predict[id]) continue;
      rows.push(el('tr', {},
        el('th', { scope: 'row', textContent: line(`s10.${id}`) }),
        el('td', { className: 'cert-mine', textContent: line(`${id}.${rec.predict[id]}`) }),
        el('td', { className: 'cert-real', textContent: line(`s10.${id}Real`) })));
    }
  }
  const predicts = rows.length ? el('table', { className: 'cert-predicts' }, el('tbody', {}, ...rows)) : null;

  // 관찰 일지: 고른 그림 카드가 화살표로 이어진다
  const moods = [];
  for (const id of ['m1', 'm2', 'm3']) {
    const key = rec.mood[id];
    if (!key) continue;
    if (moods.length) moods.push(el('li', { className: 'cert-arrow', textContent: '→' }));
    moods.push(el('li', { className: 'cert-mood' },
      img(`assets/img/mood/mood_${key}.webp`, 'cert-mood-img', ''),
      el('span', { className: 'cert-mood-word', lang: 'en', textContent: key }),
      el('span', { className: 'cert-mood-scene', textContent: line(`scene.${MOODS[id].scene}.name`) })));
  }
  const moodRow = moods.length ? el('ol', { className: 'cert-moods' }, ...moods) : null;

  // ★ 답: 쓴 것만
  const stars = SCENES.filter((s) => s.star && rec.star[s.star]).map((s) => el('div', { className: 'cert-star' },
    el('dt', { textContent: '★ ' + line(`scene.${s.n}.name`) }),
    el('dd', { textContent: rec.star[s.star] })));
  const starList = stars.length ? el('dl', { className: 'cert-stars' }, ...stars) : null;

  const rewind = button('btn.rewind', () => go('s11'), 'primary');
  const map = button('btn.map', () => go('s4'), '');

  const lower = el('div', { className: 'cert-lower' },
    predicts || moodRow ? el('div', { className: 'cert-grid' + (predicts && moodRow ? '' : ' single') }, predicts, moodRow) : null,
    starList);
  const box = el('section', { className: 'cert' }, head, title, cards, lower, el('div', { className: 'btn-row' }, rewind, map));
  box.dataset.trip = String(rec.trip);
  root.append(box);
  if (!story) box.dataset.empty = 'true';
  return head;
}
