// 수료증 저장 (스토리보드 S10 '수료증 저장'): 수료증(시안 B)을 canvas에 직접 그려 PNG 한 장으로 내려받는다.
// 1366×768 기준의 2배(2732×1536). 외부 라이브러리 없음. 색은 :root 토큰, 글꼴은 앱과 같은 시스템 글꼴.
// 넣는 것: 증서(나비, TIME TRAVEL, 견습 가이드 수료증, 반·번호, 마쳤다 문장, 장면 카드 앞면 6장, 날짜·본부),
//   훈련 기록(예측 표, 관찰 일지 정답 카드와 단어·뜻·장면, ★ 도전 답), "단서 수첩 n개 보고", 맨 아래 출처·수업 목적 문구.
// 넣지 않는 것: 단추, 카드 뒷면 문장, 단서 문장 등 교과서 문장.
//   두 번째 여행의 '내 예측'은 본문 문장이므로 그 열을 빼고 질문과 실제로 일어난 일만 그린다.
// 기록이 없는 상자는 화면과 같이 뺀다.
import { line } from '../text.js';
import { SCENES, MOODS } from '../../data/scenes.js';

const W = 1366;
const H = 768;
const SCALE = 2;

export function certFileName(rec) {
  return `TIME_TRAVEL_수료증_${rec.cls}반_${rec.num}번.png`;
}

// 'YYYY-MM-DD' → '2026. 11. 24.'
function dateText(day) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day || '');
  return m ? `${m[1]}. ${Number(m[2])}. ${Number(m[3])}.` : '';
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error('그림을 받지 못함'));
    im.src = src;
  });
}
// 한 번 실패하면 한 번 더 받아 본다
const loadRetry = (src) => loadImage(src).catch(() => loadImage(src + (src.includes('?') ? '&' : '?') + 'r=1'));

// 그릴 내용을 기록에서 모은다 (S10 화면과 같은 규칙)
export function certData(rec) {
  const predicts = [];
  for (const id of ['p1', 'p2', 'p3']) {
    let mine = null;
    if (rec.trip === 2) {
      if (!rec.picks || !rec.picks[id]) continue; // 화면에서도 기록 없는 줄은 뺀다
    } else {
      if (!rec.predict || !rec.predict[id]) continue;
      mine = line(`${id}.${rec.predict[id]}`);
    }
    predicts.push({ q: line(`s10.${id}`), mine, real: line(`s10.${id}Real`) });
  }
  const moods = [];
  for (const id of ['m1', 'm2', 'm3']) {
    if (!rec.mood || !rec.mood[id]) continue;
    const key = MOODS[id].answer;
    moods.push({ key, word: key, ko: line(`mood.${key}`), scene: line('s10.sceneNo', { n: MOODS[id].scene }) });
  }
  const stars = SCENES.filter((s) => s.star && rec.star && rec.star[s.star])
    .map((s) => ({ scene: line('s10.sceneNo', { n: s.n }), text: String(rec.star[s.star]) }));
  return {
    trip: rec.trip === 2 ? 2 : 1,
    who: line('s0.who', { cls: rec.cls, num: rec.num }),
    sign: line('s10.sign', { date: dateText(rec.endDay) }),
    predicts,
    moods,
    stars,
    notes: line('s10.notes', { n: (rec.notes || []).length }),
  };
}

// ---------- 그리기 도구 ----------
function roundPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// 너비에 맞게 줄을 나눈다. 띄어쓰기에서 먼저 나누고, 한 낱말이 너무 길면 글자 단위로 나눈다.
function wrap(ctx, text, maxW) {
  const out = [];
  for (const para of String(text).split(/\r?\n/)) {
    let cur = '';
    for (const word of para.split(/(\s+)/)) {
      if (!word) continue;
      const next = cur + word;
      if (ctx.measureText(next).width <= maxW) { cur = next; continue; }
      if (cur.trim()) out.push(cur.trimEnd());
      cur = word.trimStart();
      while (ctx.measureText(cur).width > maxW && cur.length > 1) {
        let i = cur.length - 1;
        while (i > 1 && ctx.measureText(cur.slice(0, i)).width > maxW) i--;
        out.push(cur.slice(0, i));
        cur = cur.slice(i);
      }
    }
    if (cur.trim() || !out.length) out.push(cur.trimEnd());
  }
  return out;
}

// 줄 수를 넘으면 마지막 줄 끝을 '…'로 줄인다
function clip(ctx, lines, maxLines, maxW) {
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, Math.max(1, maxLines));
  let last = kept[kept.length - 1];
  while (last.length && ctx.measureText(last + '…').width > maxW) last = last.slice(0, -1);
  kept[kept.length - 1] = last + '…';
  return kept;
}

function drawCover(ctx, im, x, y, w, h) {
  const s = Math.max(w / im.naturalWidth, h / im.naturalHeight);
  const sw = w / s;
  const sh = h / s;
  ctx.drawImage(im, (im.naturalWidth - sw) / 2, (im.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
}
function drawContain(ctx, im, x, y, w, h) {
  const s = Math.min(w / im.naturalWidth, h / im.naturalHeight);
  const dw = im.naturalWidth * s;
  const dh = im.naturalHeight * s;
  ctx.drawImage(im, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

// 둥근 모서리 카드 그림 + 2px 테두리 (화면의 .cert-card, .cert-mood-img와 같은 모양)
function drawCard(ctx, im, x, y, size, C) {
  ctx.save();
  roundPath(ctx, x, y, size, size, 8);
  ctx.fillStyle = C.bg;
  ctx.fill();
  ctx.clip();
  drawCover(ctx, im, x, y, size, size);
  ctx.restore();
  roundPath(ctx, x + 1, y + 1, size - 2, size - 2, 7);
  ctx.lineWidth = 2;
  ctx.strokeStyle = C.text;
  ctx.stroke();
}

// 수료증 그림을 만든다. 그림을 모두 받은 뒤에 그린다. 실패하면 오류를 던진다.
// scale: 1366×768의 몇 배, type·quality: canvas.toBlob과 같다. 내려받기는 PNG 2배, 교사용 복사본은 JPEG 1배.
export async function makeCertificateImage(rec, { scale = SCALE, type = 'image/png', quality } = {}) {
  const data = certData(rec);
  const root = getComputedStyle(document.documentElement);
  const tok = (n) => root.getPropertyValue(n).trim();
  const C = { bg: tok('--bg'), surface: tok('--surface'), text: tok('--text'), muted: tok('--muted'), accent: tok('--accent'), line: tok('--line') };
  const FAM = getComputedStyle(document.body).fontFamily || tok('--font');
  const font = (weight, size) => `${weight} ${size}px ${FAM}`;

  const [butterfly, cards, moodImgs] = await Promise.all([
    loadRetry('assets/img/butterfly_rest.webp'),
    Promise.all(SCENES.map((s) => loadRetry(`assets/img/cards/${s.img}.webp`))),
    Promise.all(data.moods.map((m) => loadRetry(`assets/img/mood/mood_${m.key}.webp`))),
  ]);
  try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch (e) { /* 글꼴 대기 실패는 무시 */ }

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(W * scale);
  canvas.height = Math.round(H * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 없음');
  ctx.scale(scale, scale);
  ctx.textBaseline = 'middle';
  const spacing = (px) => { if ('letterSpacing' in ctx) ctx.letterSpacing = px; };
  const text = (t, x, y, { weight = 400, size = 18, color = C.text, align = 'left' } = {}) => {
    ctx.font = font(weight, size);
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.fillText(t, x, y);
  };

  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);

  const TOP = 24;
  const BOTTOM = 690; // 증서와 훈련 기록의 아래 끝

  // ----- 왼쪽: 이중 테두리 증서 (폭 470) -----
  const px = 32;
  const pw = 470;
  const ph = BOTTOM - TOP;
  const cx = px + pw / 2;
  ctx.strokeStyle = C.accent;
  ctx.lineWidth = 2;
  roundPath(ctx, px + 1, TOP + 1, pw - 2, ph - 2, 8);
  ctx.stroke();
  roundPath(ctx, px + 5, TOP + 5, pw - 10, ph - 10, 5);
  ctx.stroke();

  drawContain(ctx, butterfly, cx - 32, TOP + 26, 64, 64);
  spacing('6px');
  text(line('s10.brand'), cx + 3, TOP + 116, { weight: 700, size: 16, color: C.accent, align: 'center' });
  spacing('2px');
  text(line('s10.name'), cx + 1, TOP + 152, { weight: 900, size: 34, align: 'center' });
  spacing('0px');
  text(data.who, cx, TOP + 200, { weight: 700, size: 26, color: C.accent, align: 'center' });
  ctx.font = font(400, 18);
  const passed = wrap(ctx, line('s10.passed'), pw - 60);
  passed.forEach((l, i) => text(l, cx, TOP + 240 + i * 27, { size: 18, color: C.muted, align: 'center' }));
  const cardsTop = TOP + 240 + passed.length * 27 + 12;
  cards.forEach((im, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    drawCard(ctx, im, cx - 154 + col * 106, cardsTop + row * 106, 96, C);
  });
  text(data.sign, cx, BOTTOM - 38, { weight: 700, size: 18, align: 'center' });

  // ----- 오른쪽: 훈련 기록 -----
  const rx = px + pw + 28;
  const rw = W - 32 - rx;
  text(line('s10.record'), rx, TOP + 18, { weight: 700, size: 22 });
  ctx.fillStyle = C.text;
  ctx.fillRect(rx, TOP + 40, rw, 2);
  let y = TOP + 56;
  const GAP = 14;
  const box = (x, top, w, h) => { ctx.fillStyle = C.surface; roundPath(ctx, x, top, w, h, 8); ctx.fill(); };

  // 예측 표
  if (data.predicts.length) {
    const ix = rx + 20;
    const iw = rw - 40;
    ctx.font = font(400, 18);
    const qW = Math.max(...data.predicts.map((p) => ctx.measureText(p.q).width));
    ctx.font = font(700, 18);
    const mW = data.trip === 1 ? Math.max(ctx.measureText(line('s10.colMine')).width, ...data.predicts.map((p) => ctx.measureText(p.mine).width)) : 0;
    const colMine = ix + qW + 24;
    const colReal = data.trip === 1 ? colMine + mW + 24 : colMine;
    const realW = ix + iw - colReal;
    ctx.font = font(400, 18);
    const rows = data.predicts.map((p) => ({ ...p, realLines: wrap(ctx, p.real, realW) }));
    const bodyH = rows.reduce((s, r) => s + r.realLines.length * 27 + 12, 0);
    const h = 14 + 26 + 8 + 26 + bodyH + 10;
    box(rx, y, rw, h);
    let yy = y + 14 + 13;
    // 두 번째 여행은 '내 예측' 열이 없으므로 상자 제목도 "실제로 일어난 일"
    text(line(data.trip === 1 ? 's10.predictTitle' : 's10.colReal'), ix, yy, { weight: 700, size: 18, color: C.accent });
    yy += 13 + 8 + 12;
    text(line('s10.colQ'), ix, yy, { size: 16, color: C.muted });
    if (data.trip === 1) text(line('s10.colMine'), colMine, yy, { size: 16, color: C.muted });
    text(line('s10.colReal'), colReal, yy, { size: 16, color: C.muted });
    yy += 14;
    for (const r of rows) {
      ctx.fillStyle = C.line;
      ctx.fillRect(ix, yy, iw, 1);
      const mid = yy + 6 + 13.5;
      text(r.q, ix, mid, { size: 18, color: C.muted });
      if (data.trip === 1) text(r.mine, colMine, mid, { weight: 700, size: 18 });
      r.realLines.forEach((l, i) => text(l, colReal, mid + i * 27, { size: 18 }));
      yy += r.realLines.length * 27 + 12;
    }
    y += h + GAP;
  }

  // 아래: 관찰 일지 · ★ 도전
  const lowerH = BOTTOM - y;
  const lowers = [data.moods.length ? 'mood' : null, data.stars.length ? 'star' : null].filter(Boolean);
  const lw = lowers.length === 2 ? (rw - GAP) / 2 : rw;
  lowers.forEach((kind, k) => {
    const bx = rx + k * (lw + GAP);
    box(bx, y, lw, lowerH);
    const ix = bx + 20;
    const iw = lw - 40;
    const titleY = y + 14 + 13;
    if (kind === 'mood') {
      text(line('s10.moodTitle'), ix, titleY, { weight: 700, size: 18, color: C.accent });
      const itemH = 84 + 4 + 30 + 27 + 24;
      const areaTop = titleY + 13 + 8;
      const top = areaTop + Math.max(0, (y + lowerH - 14 - areaTop - itemH) / 2);
      const n = data.moods.length;
      const itemW = 100;
      const centers = data.moods.map((_, i) => (n === 1 ? ix + iw / 2 : ix + itemW / 2 + i * (iw - itemW) / (n - 1)));
      data.moods.forEach((m, i) => {
        const c = centers[i];
        drawCard(ctx, moodImgs[i], c - 42, top, 84, C);
        text(m.word, c, top + 84 + 4 + 15, { weight: 700, size: 20, align: 'center' });
        text(m.ko, c, top + 84 + 4 + 30 + 13.5, { size: 18, align: 'center' });
        text(m.scene, c, top + 84 + 4 + 30 + 27 + 12, { size: 16, color: C.muted, align: 'center' });
        if (i > 0) text('→', (centers[i - 1] + c) / 2, top + 42, { size: 24, color: C.muted, align: 'center' });
      });
    } else {
      text(line('s10.starTitle'), ix, titleY, { weight: 700, size: 18, color: C.accent });
      ctx.font = font(700, 18);
      const tw = ctx.measureText(line('s10.starTitle')).width;
      text(line('s10.starCount', { n: data.stars.length }), ix + tw + 6, titleY + 1, { size: 16, color: C.muted });
      let yy = titleY + 13 + 8;
      const limit = y + lowerH - 14;
      const ddX = ix + 64 + 12;
      const ddW = ix + iw - ddX;
      for (const s of data.stars) {
        const room = Math.floor((limit - yy - 12) / 27);
        if (room < 1) break;
        ctx.font = font(700, 18);
        const ls = clip(ctx, wrap(ctx, s.text, ddW), room, ddW);
        ctx.fillStyle = C.line;
        ctx.fillRect(ix, yy, iw, 1);
        const mid = yy + 6 + 13.5;
        text(s.scene, ix, mid + 1, { size: 16, color: C.muted });
        ls.forEach((l, i) => text(l, ddX, mid + i * 27, { weight: 700, size: 18 }));
        yy += ls.length * 27 + 12;
      }
    }
  });

  // 단서 수첩 n개 보고
  text(data.notes, rx, BOTTOM + 22, { weight: 700, size: 18 });

  // 맨 아래 출처·수업 목적 문구 (화면 아래 문구와 같은 자리)
  ctx.fillStyle = C.line;
  ctx.fillRect(0, H - 30, W, 1);
  text(line('notice'), W / 2, H - 15, { size: 14, color: C.muted, align: 'center' });

  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('그림을 만들지 못함'))), type, quality);
    } catch (e) { reject(e); }
  });
}
export function makeCertificatePng(rec) {
  return makeCertificateImage(rec);
}

// 기기에 내려받는다. 막혀서 앱이 알아챈 실패는 오류로 던진다.
export async function saveCertificate(rec) {
  const blob = await makeCertificatePng(rec);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = certFileName(rec);
  a.hidden = true;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return blob;
}
