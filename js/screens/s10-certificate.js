// S10 수료증 (스토리보드 6장 S10 · 수료증 시안 B, docs/ARCHITECTURE.md 3.2·3.5·3.6)
// 위에 [본부] 문구. 왼쪽 이중 테두리 증서: 나비, TIME TRAVEL, 견습 가이드 수료증, 반·번호, 수료 문장, 장면 카드 3×2, 수료한 날짜.
// 오른쪽 '훈련 기록': 연회색 상자 3개 — 위 예측(두 번째 여행은 예측 자리에서 고른 문장), 아래 왼쪽 관찰 일지, 아래 오른쪽 ★ 도전.
// 기록이 없는 상자는 숨긴다. 단추는 "되감기" 하나. 여기서 엔딩을 본 것으로 저장하고 결과를 보낸다.
import { el, say, button, img } from '../ui.js';
import { line } from '../text.js';
import { saveRecord, today } from '../state.js';
import { getScene, getStory } from '../content.js';
import { queueResult } from '../send.js';
import { SCENES, MOODS, PREDICTS } from '../../data/scenes.js';
import { openCards } from '../parts/cardview.js';

function lineText(sceneNo, d) {
  const data = getScene(sceneNo);
  const ln = data && data.lines.find((x) => x.d === d);
  return ln ? ln.chunks.map((c) => c.text).join(' ') : '';
}

// 'YYYY-MM-DD' → '2026. 11. 24.'
function dateText(day) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day || '');
  return m ? `${m[1]}. ${Number(m[2])}. ${Number(m[3])}.` : '';
}

const label = (tag, id, values, className) => {
  const n = el(tag, { className: className || '', textContent: line(id, values) });
  n.dataset.copy = id;
  return n;
};

export function renderCertificate(root, { go, app }) {
  const rec = app.rec;
  const story = getStory();
  // 엔딩을 본 것으로 저장한다. 수료한 날짜는 처음 수료한 날로 한 번만 정한다(다시 열어도 같음).
  if (!rec.flags.ended || !rec.endDay) {
    rec.flags.ended = true;
    if (!rec.endDay) rec.endDay = today();
    saveRecord(rec);
  }
  queueResult(rec);

  const head = say('s10.done', {}, 'h1');

  // ----- 왼쪽: 증서 -----
  const box = el('section', { className: 'cert' });
  // 장면 카드: 누르면 카드 보기 창에서 뒤집힌 카드(핵심 문장)가 크게 보인다
  const cards = el('ol', { className: 'cert-cards' }, ...SCENES.map((s) => {
    const b = el('button', { type: 'button', className: 'cert-card media' }, img(`assets/img/cards/${s.img}.webp`, '', line(`card.${s.card}`)));
    b.dataset.scene = String(s.n);
    b.addEventListener('click', () => openCards(box, SCENES.map((x) => x.n), { focusCard: s.n, onClose: () => { if (b.isConnected) b.focus(); } }));
    return el('li', {}, b);
  }));
  const paper = el('section', { className: 'cert-paper' },
    img('assets/img/butterfly_rest.webp', 'cert-butterfly media', ''),
    label('span', 's10.brand', {}, 'cert-brand'),
    label('h2', 's10.name', {}, 'cert-name'),
    el('p', { className: 'cert-who', textContent: line('s0.who', { cls: rec.cls, num: rec.num }) }),
    label('p', 's10.passed', {}, 'cert-passed'),
    cards,
    label('p', 's10.sign', { date: dateText(rec.endDay) }, 'cert-sign'));
  paper.querySelector('.cert-brand').lang = 'en';
  paper.setAttribute('aria-label', line('s10.name'));

  // ----- 오른쪽: 훈련 기록 -----
  // 내 예측과 실제로 일어난 일 (맞았다 틀렸다는 표시하지 않는다). 두 번째 여행은 '내 예측' 칸에 예측 자리에서 고른 문장.
  const rows = [];
  for (const id of ['p1', 'p2', 'p3']) {
    let mine = null;
    if (rec.trip === 2) {
      const p = rec.picks[id];
      if (p) mine = el('td', { className: 'cert-mine', lang: p.d === null ? 'ko' : 'en', textContent: p.d === null ? line('btn.none') : lineText(PREDICTS[id].scene, p.d) });
    } else if (rec.predict[id]) {
      mine = el('td', { className: 'cert-mine', textContent: line(`${id}.${rec.predict[id]}`) });
    }
    if (!mine) continue;
    rows.push(el('tr', {},
      el('th', { scope: 'row', textContent: line(`s10.${id}`) }),
      mine,
      el('td', { className: 'cert-real', textContent: line(`s10.${id}Real`) })));
  }
  const predictBox = rows.length ? el('section', { className: 'cert-box cert-predict-box' },
    label('h3', 's10.predictTitle'),
    el('table', { className: 'cert-predicts' },
      el('thead', {}, el('tr', {}, ...['s10.colQ', 's10.colMine', 's10.colReal'].map((id) => { const th = label('th', id); th.scope = 'col'; return th; }))),
      el('tbody', {}, ...rows))) : null;

  // 관찰 일지: 정답 카드가 화살표로 이어진다. 처음에 다른 카드를 고른 기록(예전 방식 포함)이어도 정답 카드를 보인다.
  // 기록이 없는 칸("장면 5부터"로 온 학생의 ①②)은 숨긴다.
  const moods = [];
  for (const id of ['m1', 'm2', 'm3']) {
    if (!rec.mood[id]) continue;
    const key = MOODS[id].answer;
    if (moods.length) {
      const arrow = el('li', { className: 'cert-arrow', textContent: '→' });
      arrow.setAttribute('aria-hidden', 'true');
      moods.push(arrow);
    }
    moods.push(el('li', { className: 'cert-mood' },
      img(`assets/img/mood/mood_${key}.webp`, 'cert-mood-img', ''),
      el('span', { className: 'cert-mood-word', lang: 'en', textContent: key }),
      el('span', { className: 'cert-mood-ko', textContent: line(`mood.${key}`) }),
      el('span', { className: 'cert-mood-scene', textContent: line('s10.sceneNo', { n: MOODS[id].scene }) })));
  }
  const moodBox = moods.length ? el('section', { className: 'cert-box cert-mood-box' + (moods.length === 1 ? ' single-mood' : '') },
    label('h3', 's10.moodTitle'),
    el('ol', { className: 'cert-moods' }, ...moods)) : null;

  // ★ 도전: 쓴 답만. 제목 옆에 "(n)개 보고"
  const stars = SCENES.filter((s) => s.star && rec.star[s.star]).map((s) => el('div', { className: 'cert-star' },
    el('dt', { textContent: line('s10.sceneNo', { n: s.n }) }),
    el('dd', { textContent: rec.star[s.star] })));
  const starBox = stars.length ? el('section', { className: 'cert-box cert-star-box' },
    el('h3', {}, label('span', 's10.starTitle'), ' ', label('span', 's10.starCount', { n: stars.length }, 'cert-star-count')),
    el('dl', { className: 'cert-stars' }, ...stars)) : null;

  const lowerBoxes = [moodBox, starBox].filter(Boolean);
  const lower = lowerBoxes.length ? el('div', { className: 'cert-lower' + (lowerBoxes.length === 1 ? ' single' : '') }, ...lowerBoxes) : null;
  // 답이 길면 이 칸 안에서만 굴러가고 아래 단추를 덮지 않는다
  const record = el('section', { className: 'cert-record' }, label('h2', 's10.record', {}, 'cert-record-title'), predictBox, lower);

  // 단추는 "되감기" 하나. 길 지도로 가는 단추는 없다(되감기에 들어간 뒤 길 지도가 열린다).
  const rewind = button('btn.rewind', () => go('s11'), 'primary');

  box.append(head, el('div', { className: 'cert-body' }, paper, record), el('div', { className: 'btn-row cert-buttons' }, rewind));
  box.dataset.trip = String(rec.trip);
  root.append(box);
  if (!story) box.dataset.empty = 'true';
  return head;
}
