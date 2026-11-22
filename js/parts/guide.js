// 장비 점검 (사용법 안내, 스토리보드 3장): 화면을 어둡게 덮고, 누를 단추 자리만 밝게 남겨 흰 점선으로 두른다.
// 그 옆에 흰 글씨 [본부] 문구 한 줄을 두고 흰 점선 곡선으로 단추와 잇는다 (교사가 준 레퍼런스 모양).
// 학생이 그 단추를 직접 눌러야 다음 단계로 간다(장면 화면이 did(단계 번호)를 알린다).
// 따로 화면을 만들지 않고 화면(host) 위에 얹는다. 덮개는 누름을 막지 않는다. 움직이는 효과 없음.
import { el, button } from '../ui.js';
import { line } from '../text.js';

const SVG = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}) => {
  const n = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
};

// 마지막 조작이 키보드였는가. 키보드면 단계마다 가리키는 단추로 포커스를 옮긴다.
let keyboard = false;
document.addEventListener('keydown', (e) => { if (e.key === 'Tab' || e.key === 'Enter' || e.key === ' ') keyboard = true; }, true);
document.addEventListener('pointerdown', () => { keyboard = false; }, true);

// steps: [{ no, copy, target() → 가리킬 단추, hole() → 밝게 남길 곳(없으면 target), focus() → 포커스를 줄 요소(없으면 target),
//           skip() → true면 건너뜀, sides → 문구를 놓아 볼 자리 순서 ('right' | 'left' | 'below' | 'above'),
//           id → 화면에 적는 단계 이름(없으면 no), auto → 이 시간(밀리초)이 지나면 저절로 다음 단계, onShow() → 이 단계가 나올 때 }]
// skip: true면 문구 아래에 "건너뛰기" (길 지도의 "사용법"으로 다시 볼 때)
// onEnd(finished): 끝났을 때. 마지막 단계까지 갔으면 true, 건너뛰기·화면 떠남이면 false
// onStep(step): 단계가 바뀔 때마다 (예: 열려 있는 단어 뜻 말풍선을 닫는다)
// 단계의 also() → 테두리 없이 함께 밝게 남길 곳들 (예: 단서 2단계의 단서 기준 말풍선)
export function makeGuide(host, { steps, skip = false, onEnd, onStep }) {
  // 덮개: 어두운 막(가운데 구멍) + 흰 점선 테두리 + 흰 점선 곡선 + 끝점
  const veil = svgEl('path', { class: 'guide-veil-fill', 'fill-rule': 'evenodd' });
  const ring = svgEl('rect', { class: 'guide-ring', rx: 12, ry: 12 });
  const link = svgEl('path', { class: 'guide-link' });
  const dot = svgEl('circle', { class: 'guide-dot', r: 5 });
  const cover = svgEl('svg', { class: 'guide-cover', 'aria-hidden': 'true' });
  cover.append(veil, ring, link, dot);

  const text = el('p', { className: 'say say-hq guide-text' });
  const tip = el('div', { className: 'guide-tip' }, text);
  tip.setAttribute('role', 'status');
  if (skip) tip.append(button('btn.skip', () => end(false), 'small'));
  let at = -1;
  let over = false;
  let raf = 0;
  let autoTimer = 0;

  const shown = (t) => Boolean(t && t.isConnected && t.getClientRects().length);

  function begin(i) {
    while (i < steps.length && steps[i].skip && steps[i].skip()) i++;
    if (i >= steps.length) { end(true); return; }
    at = i;
    const s = steps[i];
    text.textContent = line(s.copy);
    text.dataset.copy = s.copy;
    host.dataset.guide = s.id || String(s.no);
    if (!cover.isConnected) host.append(cover, tip);
    clearTimeout(autoTimer);
    if (s.auto) autoTimer = setTimeout(() => { if (!over && at === i) begin(i + 1); }, s.auto);
    if (onStep) onStep(s);
    if (s.onShow) s.onShow();
    const t = s.target();
    if (t && t.closest('.reader-body')) t.scrollIntoView({ block: 'nearest' });
    if (keyboard) {
      const f = s.focus ? s.focus() : t;
      if (f && !f.disabled && shown(f)) f.focus({ preventScroll: true });
    }
    place();
  }

  // 가리키는 단추를 따라 덮개와 문구를 놓는다. 본문 칸 밖으로 굴러간 줄이면 잠시 감춘다.
  function place() {
    if (over || at < 0) return;
    const s = steps[at];
    const t = s.target();
    const hb = host.getBoundingClientRect();
    let visible = shown(t) && !host.hidden;
    let r = null;
    if (visible) {
      r = t.getBoundingClientRect();
      const scroller = t.closest('.reader-body');
      if (scroller) {
        const b = scroller.getBoundingClientRect();
        if (r.bottom < b.top + 4 || r.top > b.bottom - 4) visible = false;
      }
    }
    cover.style.display = visible ? '' : 'none';
    tip.hidden = !visible;
    if (!visible) return;

    const W = hb.width;
    const H = hb.height;
    cover.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const pad = 6;
    const box = (n, p) => { const q = n.getBoundingClientRect(); return { x: q.left - hb.left - p, y: q.top - hb.top - p, w: q.width + p * 2, h: q.height + p * 2 }; };
    // 밝게 남길 곳 (구멍)
    const holeEl = s.hole && shown(s.hole()) ? s.hole() : t;
    const h = box(holeEl, pad);
    // 구멍이 단추보다 넓으면(본문 칸, 묻기 칸) 테두리와 곡선은 밝은 곳 위에 그려지므로 파란색으로
    cover.classList.toggle('in-light', holeEl !== t);
    const rad = 12;
    const roundRect = (b) => `M${b.x + rad},${b.y} H${b.x + b.w - rad} Q${b.x + b.w},${b.y} ${b.x + b.w},${b.y + rad} V${b.y + b.h - rad} Q${b.x + b.w},${b.y + b.h} ${b.x + b.w - rad},${b.y + b.h} H${b.x + rad} Q${b.x},${b.y + b.h} ${b.x},${b.y + b.h - rad} V${b.y + rad} Q${b.x},${b.y} ${b.x + rad},${b.y} Z`;
    // 함께 밝게 남길 곳 (구멍끼리 겹치지 않게 여백을 작게)
    const extra = s.also ? s.also().filter(shown).map((e) => roundRect(box(e, 3))) : [];
    veil.setAttribute('d', `M0,0 H${W} V${H} H0 Z ${roundRect(h)} ${extra.join(' ')}`);
    // 흰 점선 테두리는 단추에
    const g = box(t, pad);
    Object.entries({ x: g.x, y: g.y, width: g.w, height: g.h }).forEach(([k, v]) => ring.setAttribute(k, v));

    // 문구 자리: 단계마다 정한 순서(sides)대로 놓아 보고, 화면 안에 들어가는 첫 자리에 둔다.
    // 곡선이 들어갈 틈(gap)을 두고, 옆이면 조금 위로, 위·아래면 조금 오른쪽으로 비켜 곡선이 휘게 한다.
    const gap = 44;
    const w = tip.offsetWidth;
    const th = tip.offsetHeight;
    // 문구는 밝게 남긴 곳(구멍) 바깥의 어두운 곳에 둔다
    const spots = {
      right: [h.x + h.w + gap, g.y + g.h / 2 - th - 10],
      left: [h.x - gap - w, g.y + g.h / 2 - th - 10],
      below: [g.x + 36, h.y + h.h + gap],
      above: [g.x + 36, h.y - gap - th],
    };
    const fit = (k) => {
      const [x, y] = spots[k];
      return k === 'below' || k === 'above' ? [Math.max(8, Math.min(x, W - w - 8)), y] : [x, Math.max(8, y)];
    };
    const inside = ([x, y]) => x >= 4 && y >= 4 && x + w <= W - 4 && y + th <= H - 4;
    const order = [...(s.sides || []), 'right', 'below', 'above', 'left'];
    const side = order.find((k) => inside(fit(k))) || 'below';
    const [x, y] = fit(side);
    tip.style.left = `${x}px`;
    tip.style.top = `${Math.max(4, y)}px`;
    tip.dataset.side = side;

    // 문구에서 단추로 가는 흰 점선 곡선
    let sx; let sy; let ex; let ey; let cx; let cy;
    const tx = x + 14;
    if (side === 'right' || side === 'left') {
      sx = side === 'right' ? x - 8 : x + w + 8;
      sy = y + th / 2;
      ex = side === 'right' ? g.x + g.w + 4 : g.x - 4;
      ey = g.y + g.h / 2;
      cx = ex + (sx - ex) * 0.15;
      cy = sy;
    } else {
      sx = Math.min(tx, x + w - 14);
      sy = side === 'below' ? y - 8 : y + th + 8;
      ex = Math.max(g.x + 14, Math.min(sx - 24, g.x + g.w - 14));
      ey = side === 'below' ? g.y + g.h + 4 : g.y - 4;
      cx = sx;
      cy = ey + (sy - ey) * 0.15;
    }
    link.setAttribute('d', `M${sx},${sy} Q${cx},${cy} ${ex},${ey}`);
    dot.setAttribute('cx', ex);
    dot.setAttribute('cy', ey);
  }

  // 화면이 바뀌어도(본문 굴림, 묻기 칸 열림) 덮개가 단추를 따라가게 한다.
  // 가리키던 단추가 없어지면(예: 뜻 보기 전에 답을 고름) 다음 단계로, 마지막이면 끝.
  function tick() {
    if (over) return;
    if (!host.isConnected) { end(false); return; }
    if (!host.hidden && at >= 0) {
      const s = steps[at];
      const t = s.target();
      if ((s.skip && s.skip()) || !(t && t.isConnected)) begin(at + 1);
      else place();
    }
    raf = requestAnimationFrame(tick);
  }

  function end(finished) {
    if (over) return;
    over = true;
    cancelAnimationFrame(raf);
    clearTimeout(autoTimer);
    cover.remove();
    tip.remove();
    delete host.dataset.guide;
    if (onEnd) onEnd(finished);
  }

  return {
    start() { if (over) return; begin(0); if (!over) raf = requestAnimationFrame(tick); },
    // 학생이 no 단계의 단추를 눌렀다. 지금 단계이거나 그 뒤 단계면 그다음으로 간다(앞 단계를 건너뛰고 눌러도 따라간다).
    did(no) {
      if (over || at < 0) return;
      if (no < steps[at].no) return;
      const i = steps.findIndex((s) => s.no === no);
      begin(i + 1);
    },
    end: () => end(false),
    get step() { return over || at < 0 ? 0 : steps[at].no; },
    get active() { return !over; },
  };
}
