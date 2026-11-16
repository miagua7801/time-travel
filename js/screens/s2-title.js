// S2 제목·나비·여행 선택 (스토리보드 2장)
// 0.3초 제목 → 0.8초 나비가 날아오고 본부 지령과 단추 → 2.6초 나비가 제목의 첫 줄 끝 글자 위에 앉음 → 날개를 3초 주기로 접었다 폄
// 움직임 줄이기를 켠 기기: 나비가 앉은 채로, 모두 바로 보인다. 엔딩을 본 기록이면 나비가 없다.
import { el, say, button, img, later, onLeave, reducedMotion } from '../ui.js';
import { line } from '../text.js';
import { saveRecord } from '../state.js';
import { getStory } from '../content.js';

const T_TITLE = 300;
const T_FLY = 800;
const FLY_MS = 1800; // 0.8초 → 2.6초
const WING_MS = 1500; // 접기·펴기 한 번씩 = 3초 주기
const SIZE = 76; // 나비 그림 크기(px)

function titleText() {
  const story = getStory();
  const first = story && story.scenes['1'] && story.scenes['1'].lines[0];
  return first && first.title ? first.chunks.map((c) => c.text).join(' ').trim() : '';
}

export function renderTitle(root, { go, app }) {
  const rec = app.rec;
  const calm = reducedMotion();
  const showButterfly = !rec.flags.ended;

  // 제목: 두 줄 (앞의 두 낱말 / 나머지). 첫 줄 끝 낱말 위에 나비가 앉는다.
  const words = titleText().split(/\s+/).filter(Boolean);
  const perch = el('span', { className: 'perch', textContent: words[1] || '' });
  const title = el('h1', { className: 'title', lang: 'en' },
    el('span', { className: 'title-line' }, (words[0] || '') + ' ', perch),
    el('span', { className: 'title-line' }, words.slice(2).join(' ')));

  // 본부 지령과 여행 단추
  const ask = say('s2.ask', {}, 'p');
  ask.classList.add('s2-ask');
  const hint = el('p', { className: 'trip-hint', id: 's2-hint' });
  hint.setAttribute('aria-live', 'polite');
  const depart = button('btn.depart', () => {
    if (!selected) return;
    rec.trip = selected;
    saveRecord(rec);
    go('s3');
  }, 'primary');
  depart.hidden = true;

  let selected = null;
  const trips = [1, 2].map((n) => {
    const b = button(`btn.trip${n}`, () => choose(n), 'trip');
    b.setAttribute('aria-pressed', 'false');
    b.setAttribute('aria-describedby', 's2-hint');
    b.dataset.trip = String(n);
    const show = () => { if (!selected) hint.textContent = line(`s2.trip${n}Hint`); };
    const hide = () => { if (!selected) hint.textContent = ''; };
    b.addEventListener('pointerenter', show);
    b.addEventListener('focus', show);
    b.addEventListener('pointerleave', hide);
    b.addEventListener('blur', hide);
    return b;
  });

  function choose(n) {
    selected = n;
    for (const b of trips) {
      const on = b.dataset.trip === String(n);
      b.setAttribute('aria-pressed', String(on));
      b.classList.toggle('dim', !on);
    }
    hint.textContent = line(`s2.trip${n}Hint`);
    depart.hidden = false;
    flutter();
  }

  // 숫자 키 1·2로도 고른다
  const onKey = (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if ((e.key === '1' || e.key === '2') && !panel.classList.contains('waiting')) {
      choose(Number(e.key));
      trips[Number(e.key) - 1].focus();
    }
  };
  document.addEventListener('keydown', onKey);
  onLeave(() => document.removeEventListener('keydown', onKey));

  const panel = el('div', { className: 'trip-panel' }, ask, el('div', { className: 'trip-row' }, ...trips), hint, depart);
  const stage = el('section', { className: 'title-stage' }, title, panel);
  root.append(stage);

  // ---------- 나비 ----------
  let butterfly = null;
  let wingTimer = null;
  let flutter = () => {};
  if (showButterfly) {
    const open = img('assets/img/butterfly_open.webp', 'wing wing-open media');
    const rest = img('assets/img/butterfly_rest.webp', 'wing wing-rest media');
    butterfly = el('div', { className: 'butterfly media' }, open, rest);
    butterfly.setAttribute('aria-hidden', 'true');
    butterfly.style.setProperty('--size', SIZE + 'px');
    stage.append(butterfly);

    const startWings = () => {
      if (calm || wingTimer) return;
      wingTimer = setInterval(() => butterfly.classList.toggle('folded'), WING_MS);
    };
    onLeave(() => clearInterval(wingTimer));

    // 단추를 누를 때 날개를 한 번 떤다 (날아가지 않음)
    flutter = () => {
      if (calm || !butterfly.classList.contains('landed')) return;
      butterfly.classList.remove('flutter');
      void butterfly.offsetWidth;
      butterfly.classList.add('flutter');
    };

    // 앉을 자리: 첫 줄 끝 글자 위
    const perchPoint = () => {
      const s = stage.getBoundingClientRect();
      const text = perch.firstChild;
      let r = perch.getBoundingClientRect();
      if (text && text.length) {
        const range = document.createRange();
        range.setStart(text, text.length - 1);
        range.setEnd(text, text.length);
        r = range.getBoundingClientRect();
      }
      // 끝 글자(소문자)의 윗면쯤: 글자 상자 위에서 1/3 아래
      return { x: r.left + r.width / 2 - s.left, y: r.top - s.top + r.height * 0.36 };
    };
    const place = () => {
      const p = perchPoint();
      butterfly.style.left = p.x - SIZE / 2 + 'px';
      butterfly.style.top = p.y - SIZE * 0.82 + 'px';
    };

    const land = () => {
      butterfly.classList.add('landed');
      startWings();
    };

    const fly = () => {
      place();
      butterfly.classList.add('flying');
      const s = stage.getBoundingClientRect();
      const b = butterfly.getBoundingClientRect();
      // 화면 오른쪽 위 밖에서 곡선으로 날아온다 (앉을 자리 기준 이동 거리)
      const dx = s.right + SIZE - b.left;
      const dy = s.top - SIZE * 1.5 - b.top;
      const frames = [
        { transform: `translate(${dx}px, ${dy}px) rotate(-18deg)` },
        { transform: `translate(${dx * 0.62}px, ${dy * 0.15}px) rotate(-6deg)`, offset: 0.35 },
        { transform: `translate(${dx * 0.28}px, ${dy * 0.55}px) rotate(10deg)`, offset: 0.7 },
        { transform: 'translate(0, 0) rotate(0deg)' },
      ];
      const anim = butterfly.animate(frames, { duration: FLY_MS, easing: 'ease-in-out', fill: 'backwards' });
      onLeave(() => anim.cancel());
      anim.finished.then(land).catch(() => {});
    };

    const ready = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    if (calm) {
      ready.then(() => { place(); land(); });
    } else {
      ready.then(() => later(Math.max(0, T_FLY - 50), fly));
    }
    const onResize = () => { if (butterfly.classList.contains('landed')) place(); };
    window.addEventListener('resize', onResize);
    onLeave(() => window.removeEventListener('resize', onResize));
  }

  // ---------- 나타나는 순서 ----------
  if (calm) {
    title.classList.add('shown');
    panel.classList.add('shown');
  } else {
    panel.classList.add('waiting');
    later(T_TITLE, () => title.classList.add('shown'));
    later(T_FLY, () => { panel.classList.remove('waiting'); panel.classList.add('shown'); });
  }

  return ask;
}
