/**
 * Lesson 8 견습 가이드 훈련 - 결과 수신
 * 학생 기기가 보낸 결과를 반별 시트(2-1 ~ 2-6)에 한 학생 한 줄로 적는다.
 *
 * 사용법: 결과용 스프레드시트를 새로 만들고 [확장 프로그램] → [Apps Script]에 이 코드를 통째로 붙여 넣는다.
 * 배포: [배포] → [새 배포] → 유형 '웹 앱' / 실행: 나 / 액세스 권한: 모든 사용자
 *   (학생 기기는 GitHub Pages에서 로그인 정보 없이 보내므로 '모든 사용자'여야 받을 수 있다)
 * 나온 웹 앱 주소(…/exec)를 웹앱의 data/config.js RESULT_URL에 넣는다. 자세한 순서는 apps-script/README.md.
 *
 * - 덮어쓰기는 칸 단위다. 같은 반·번호의 줄을 찾아 이번에 온 칸만 바꾸고 오지 않은 칸은 그대로 둔다.
 * - 반 목록에 없는 반, 1~40 밖의 번호는 받지 않는다('rejected').
 * - 칸마다 글 길이를 자르고, = + - @로 시작하는 글은 수식으로 실행되지 않게 앞에 '를 붙인다.
 * - 여러 명이 동시에 보내도 줄이 엉키지 않게 잠금(LockService)을 건다.
 * - 이름·이메일·기기 정보는 받지도 적지도 않는다. 단서 칸에는 교과서 문장이 들어가므로 시트를 공개로 공유하지 않는다.
 */

// 담당 반 목록. 웹앱 data/config.js의 CLASSES와 같게
var ALLOWED_CLASSES = ['2-1', '2-2', '2-3', '2-4', '2-5', '2-6'];
var NUMBER_MIN = 1;
var NUMBER_MAX = 40;

// [보내는 칸 이름, 시트 열 제목, 글 길이 한도]. 순서가 곧 열 순서다. 맨 앞 '번호', 맨 뒤 '받은 시각'은 따로 둔다.
var COLUMNS = [
  ['trip', '여행', 20],
  ['done', '마친 장면', 5],
  ['c1', '확인1', 5], ['c2', '확인2', 5], ['c4', '확인4', 5], ['c5', '확인5', 5], ['c6', '확인6', 5],
  ['p1', '예측①', 300], ['p2', '예측②', 300], ['p3', '예측③', 300],
  ['m1', '관찰①', 20], ['m2', '관찰②', 20], ['m3', '관찰③', 20],
  ['s1', '★1', 200], ['s2', '★2', 200], ['s5', '★5', 200], ['s6', '★6', 200],
  ['signWrong', '간판 오답', 5],
  ['ended', '엔딩', 5],
  ['n1', '단서1', 300], ['n2', '단서2', 300], ['n3', '단서3', 300], ['n4', '단서4', 300], ['n5', '단서5', 300]
];

function header_() {
  return ['번호'].concat(COLUMNS.map(function (c) { return c[1]; })).concat(['받은 시각']);
}

// 배포가 살아 있는지 브라우저 주소창에서 확인할 때 'ok'가 보인다
function doGet() {
  return ContentService.createTextOutput('ok');
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    return ContentService.createTextOutput('busy');
  }
  try {
    var data = JSON.parse(e && e.postData ? e.postData.contents : '');
    var check = checkPayload_(data);
    if (!check.ok) return ContentService.createTextOutput('rejected');
    writeResult_(SpreadsheetApp.getActiveSpreadsheet(), check.cls, check.num, data.fields || {}, new Date());
    return ContentService.createTextOutput('ok');
  } catch (err) {
    return ContentService.createTextOutput('error');
  } finally {
    lock.releaseLock();
  }
}

// 반·번호 검사
function checkPayload_(data) {
  if (!data || typeof data !== 'object') return { ok: false };
  var cls = String(data.cls || '').trim();
  var num = Number(data.num);
  if (ALLOWED_CLASSES.indexOf(cls) === -1) return { ok: false };
  if (!(num === Math.floor(num) && num >= NUMBER_MIN && num <= NUMBER_MAX)) return { ok: false };
  if (!data.fields || typeof data.fields !== 'object') return { ok: false };
  return { ok: true, cls: cls, num: num };
}

// 이번에 온 칸만 고친 새 줄. oldRow는 '번호'부터 '받은 시각'까지 (없으면 null).
function mergeRow_(oldRow, num, fields, now) {
  var width = COLUMNS.length + 2;
  var row = [];
  for (var i = 0; i < width; i++) row.push(oldRow && i < oldRow.length ? oldRow[i] : '');
  row[0] = num;
  for (var c = 0; c < COLUMNS.length; c++) {
    var key = COLUMNS[c][0];
    if (!Object.prototype.hasOwnProperty.call(fields, key)) continue;
    var v = fields[key];
    if (v === null || v === undefined) v = '';
    if (typeof v === 'number') {
      row[c + 1] = isFinite(v) ? v : '';
    } else {
      row[c + 1] = safe_(String(v).replace(/[\r\n\t]+/g, ' ').slice(0, COLUMNS[c][2]));
    }
  }
  row[width - 1] = now;
  return row;
}

function writeResult_(ss, cls, num, fields, now) {
  var head = header_();
  var sh = ss.getSheetByName(cls);
  if (!sh) {
    sh = ss.insertSheet(cls);
    sh.getRange(1, 1, 1, head.length).setValues([head]);
    sh.setFrozenRows(1);
  }
  var last = sh.getLastRow();
  var target = 0;
  var oldRow = null;
  if (last >= 2) {
    var rows = sh.getRange(2, 1, last - 1, head.length).getValues();
    for (var i = 0; i < rows.length; i++) {
      if (Number(rows[i][0]) === num) { target = i + 2; oldRow = rows[i]; break; }
    }
  }
  var row = mergeRow_(oldRow, num, fields, now);
  if (target) {
    sh.getRange(target, 1, 1, row.length).setValues([row]);
  } else {
    sh.getRange(last + 1, 1, 1, row.length).setValues([row]);
    if (last + 1 > 2) sh.getRange(2, 1, last, head.length).sort(1); // 번호 순
  }
}

// 학생이 =, +, -, @로 시작하는 글을 써도 수식으로 실행되지 않게
function safe_(s) {
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}
