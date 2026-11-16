// S7 지난 이야기 (스토리보드 5장, docs/ARCHITECTURE.md 3.2·3.3)
// 2차시(S3에서 보고한 날과 다른 날)에 재접속했고 장면 1~4를 마쳤고 암호를 아직 안 풀었을 때만 온다.
// 장면 1~4 카드 4장, 카드 아래 Travis 한 줄 요약, 내 예측 ①②(기록이 있는 것만) → "이어서 출발"(S8)
import { el, say, button } from '../ui.js';
import { line } from '../text.js';
import { getScene } from '../content.js';
import { SCENES, PREDICTS } from '../../data/scenes.js';
import { makeCard } from '../parts/cardview.js';

// 고른 줄의 글 (두 번째 여행). 기기에는 D 번호만 있으므로 잠긴 본문에서 찾는다.
function lineText(sceneNo, d) {
  const data = getScene(sceneNo);
  const ln = data && data.lines.find((x) => x.d === d);
  return ln ? ln.chunks.map((c) => c.text).join(' ') : '';
}

export function renderRecap(root, { go, app }) {
  const rec = app.rec;
  const head = say('s7.recap', {}, 'h1');

  const cards = el('ol', { className: 'recap-cards' }, ...SCENES.slice(0, 4).map((s) => el('li', {},
    makeCard(s.n, false),
    el('p', { className: 'recap-sum', textContent: line(`scene.${s.n}.summary`) }))));

  // 내 예측 ①②: 기록이 있는 것만. 두 번째 여행은 예측 자리에서 고른 줄.
  const rows = [];
  for (const id of ['p1', 'p2']) {
    let mine = null;
    if (rec.trip === 2) {
      const p = rec.picks[id];
      if (p) mine = el('dd', { lang: p.d === null ? 'ko' : 'en', textContent: p.d === null ? line('btn.none') : lineText(PREDICTS[id].scene, p.d) });
    } else if (rec.predict[id]) {
      mine = el('dd', { textContent: line(`${id}.${rec.predict[id]}`) });
    }
    if (mine) rows.push(el('dt', { textContent: line(`s10.${id}`) }), mine);
  }
  const predicts = rows.length ? el('dl', { className: 'recap-predicts' }, ...rows) : null;

  const resume = button('btn.resume', () => go('s8'), 'primary');
  root.append(el('section', { className: 'recap' }, head, cards, predicts, el('div', { className: 'btn-row' }, resume)));
  return head;
}
