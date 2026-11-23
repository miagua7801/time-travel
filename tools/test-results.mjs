// 결과 수신 Code.gs 단위 시험: node tools/test-results.mjs
// 가짜 스프레드시트로 doPost를 돌려 반·번호 검사, 칸 단위 덮어쓰기, 번호 순 정렬, 수식 막기, 길이 자르기, 잠금을 본다.
// 가짜 드라이브로 수료증 그림 요청(정상, 잘못된 반·번호, 같은 이름 덮어쓰기, 폴더가 지워진 뒤)을 본다.
import { loadResults } from './results-sim.mjs';

let pass = 0;
let fail = 0;
const ok = (c, m) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + m); };

const { book, post, lockLog, header } = loadResults();
const H = header();
const col = (name) => H.indexOf(name);
const sheet = (n) => book.getSheetByName(n);
const rowOf = (cls, num) => (sheet(cls) ? sheet(cls).rows.find((r, i) => i > 0 && Number(r[0]) === num) : null);

// 열 제목 (docs/ARCHITECTURE.md 4.3)
ok(H.join(',') === '번호,여행,마친 장면,확인1,확인2,확인4,확인5,확인6,예측①,예측②,예측③,관찰①,관찰②,관찰③,★1,★2,★5,★6,간판 오답,엔딩,단서1,단서2,단서3,단서4,단서5,받은 시각', '열 제목이 설계와 같다 (' + H.length + '열)');

// 받지 않는 것
ok(post({ v: 2, cls: '2-7', num: 3, fields: { done: 1 } }) === 'rejected', '반 목록에 없는 반은 받지 않음');
ok(post({ v: 2, cls: '2-1', num: 0, fields: { done: 1 } }) === 'rejected', '번호 0은 받지 않음');
ok(post({ v: 2, cls: '2-1', num: 41, fields: { done: 1 } }) === 'rejected', '번호 41은 받지 않음');
ok(post({ v: 2, cls: '2-1', num: 2.5, fields: { done: 1 } }) === 'rejected', '번호 2.5는 받지 않음');
ok(post({ v: 2, cls: '2-1', num: 3 }) === 'rejected', 'fields가 없으면 받지 않음');
ok(post('{망가진 글') === 'error', '망가진 JSON은 error');
ok(book.sheets.size === 0, '받지 않은 것은 시트를 만들지 않음');

// 처음 받음: 시트를 만들고 열 제목, 한 줄
ok(post({ v: 2, cls: '2-3', num: 14, fields: { trip: '첫 여행', done: 1, c1: 'X1' } }) === 'ok', '2-3반 14번 1차 전송 ok');
ok(sheet('2-3') && sheet('2-3').rows[0].join(',') === H.join(',') && sheet('2-3').frozen === 1, '반별 시트를 만들고 첫 줄은 열 제목(고정)');
let r = rowOf('2-3', 14);
ok(r && r[col('여행')] === '첫 여행' && r[col('마친 장면')] === 1 && r[col('확인1')] === 'X1' && r[col('받은 시각')] instanceof Date, '온 칸이 적힘');

// 칸 단위 덮어쓰기: 이번에 오지 않은 칸은 그대로
post({ v: 2, cls: '2-3', num: 14, fields: { done: 4, c2: 'O', p2: '누군가 다친다', s1: '가이드의 지시' } });
r = rowOf('2-3', 14);
ok(r[col('확인1')] === 'X1' && r[col('여행')] === '첫 여행', '덮어쓰기: 오지 않은 칸(확인1, 여행)은 그대로');
ok(r[col('마친 장면')] === 4 && r[col('확인2')] === 'O' && r[col('예측②')] === '누군가 다친다' && r[col('★1')] === '가이드의 지시', '덮어쓰기: 온 칸만 바뀜');
ok(sheet('2-3').rows.length === 2, '같은 반·번호는 한 줄');

// 기록이 사라진 기기(장면 5부터)에서 보내도 1차시 칸은 남는다
post({ v: 2, cls: '2-3', num: 14, fields: { trip: '첫 여행', done: 6, c5: 'O', c6: 'X2', p3: '많이 달라졌다', m3: 'shocked', signWrong: 2, ended: 'O' } });
r = rowOf('2-3', 14);
ok(r[col('확인1')] === 'X1' && r[col('확인2')] === 'O' && r[col('예측②')] === '누군가 다친다' && r[col('확인6')] === 'X2' && r[col('간판 오답')] === 2 && r[col('엔딩')] === 'O', '2차시 칸이 더해지고 1차시 칸은 남음');

// 빈 글로 오면 그 칸을 비운다 (단서를 뺀 뒤 다시 보고)
post({ v: 2, cls: '2-3', num: 14, fields: { n1: '2 · D19 문장 / 메모', n2: '4 · D40 문장' } });
post({ v: 2, cls: '2-3', num: 14, fields: { n1: '2 · D19 문장 / 메모', n2: '' } });
r = rowOf('2-3', 14);
ok(r[col('단서1')] === '2 · D19 문장 / 메모' && r[col('단서2')] === '', '빈 글이 오면 그 칸을 비움');

// 번호 순 정렬, 다른 반은 다른 시트
post({ v: 2, cls: '2-3', num: 3, fields: { done: 1 } });
post({ v: 2, cls: '2-3', num: 40, fields: { done: 1 } });
post({ v: 2, cls: '2-3', num: 1, fields: { done: 1 } });
ok(sheet('2-3').rows.slice(1).map((x) => x[0]).join(',') === '1,3,14,40', '번호 순으로 정렬 (' + sheet('2-3').rows.slice(1).map((x) => x[0]).join(',') + ')');
ok(rowOf('2-3', 14)[col('확인1')] === 'X1', '정렬 뒤에도 14번 줄의 칸이 그대로');
post({ v: 2, cls: '2-1', num: 14, fields: { done: 2 } });
ok(sheet('2-1') && sheet('2-1').rows.length === 2 && rowOf('2-3', 14)[col('마친 장면')] === 6, '다른 반은 다른 시트, 서로 섞이지 않음');

// 수식 막기, 길이 자르기, 줄바꿈, 모르는 칸
post({ v: 2, cls: '2-2', num: 5, fields: { s1: '=HYPERLINK("x")', s2: '+1', s5: '-a', s6: '@b', p1: 'x'.repeat(1000), trip: 'a\nb', name: '홍길동', email: 'x@y' } });
r = rowOf('2-2', 5);
ok(r[col('★1')] === "'=HYPERLINK(\"x\")" && r[col('★2')] === "'+1" && r[col('★5')] === "'-a" && r[col('★6')] === "'@b", '= + - @로 시작하는 글 앞에 \' 붙임');
ok(r[col('예측①')].length === 300 && r[col('여행')] === 'a b', '칸마다 글 길이를 자르고 줄바꿈을 지움');
ok(r.length === H.length && !r.includes('홍길동') && !r.includes('x@y'), '모르는 칸(이름·이메일)은 적지 않음');

// 잠금: 받을 때마다 잠그고 풀며, 잠그지 못하면 아무것도 쓰지 않음
ok(lockLog.length > 0 && lockLog.filter((x) => x === 'wait').length === lockLog.filter((x) => x === 'release').length, '받을 때마다 잠금을 걸고 풂');
const busy = loadResults({ lockFails: true });
ok(busy.post({ v: 2, cls: '2-1', num: 1, fields: { done: 1 } }) === 'busy' && busy.book.sheets.size === 0, '잠금을 못 얻으면 busy, 쓰지 않음 (학생 기기는 대기열에 두고 다시 보냄)');

// ---------- 수료증 그림 (kind: 'cert') ----------
{
  const sim = loadResults();
  const { drive } = sim;
  const jpeg = (tag) => Buffer.concat([Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]), Buffer.from('JFIF-시험 그림 ' + tag + ' '.repeat(20)), Buffer.from([0xFF, 0xD9])]).toString('base64');
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), Buffer.alloc(40, 1)]).toString('base64');
  const cert = (cls, num, data = jpeg('a'), type = 'image/jpeg') => sim.post({ v: 2, kind: 'cert', cls, num, type, data });
  const root = () => drive.live('Lesson 8 수료증');
  const files = (cls) => (root() && root().live(cls) ? root().live(cls).liveFiles() : []);
  const b64 = (f) => Buffer.from(f.bytes.map((b) => (b + 256) % 256)).toString('base64');

  // 정상
  ok(cert('2-3', 14) === 'ok', '그림 정상: ok');
  ok(root() && root().live('2-3') && files('2-3').map((f) => f.name).join() === '2-3반_14번.jpg', '내 드라이브/Lesson 8 수료증/2-3/2-3반_14번.jpg로 저장 (폴더가 없으면 만듦)');
  ok(files('2-3')[0].type === 'image/jpeg' && b64(files('2-3')[0]) === jpeg('a'), '저장한 파일 내용·형식이 보낸 그림과 같음');
  ok(sim.book.sheets.size === 0, '그림 요청은 결과 시트에 아무것도 쓰지 않음');
  ok(cert('2-6', 1) === 'ok' && files('2-6').map((f) => f.name).join() === '2-6반_1번.jpg' && drive.folders.filter((f) => f.name === 'Lesson 8 수료증').length === 1, '반 폴더(2-6)를 더 만들어도 맨 위 폴더는 하나');
  ok(cert('2-1', 40) === 'ok' && cert('2-1', 1) === 'ok' && files('2-1').map((f) => f.name).sort().join() === '2-1반_1번.jpg,2-1반_40번.jpg', '같은 반 다른 번호는 따로 저장');

  // 잘못된 반·번호, 잘못된 그림
  const before = JSON.stringify(drive);
  ok(cert('2-7', 3) === 'rejected', '반 목록에 없는 반(2-7)은 받지 않음');
  ok(cert('3-1', 3) === 'rejected' && cert('', 3) === 'rejected', '3-1, 빈 반은 받지 않음');
  ok(cert('2-3', 0) === 'rejected' && cert('2-3', 41) === 'rejected' && cert('2-3', 2.5) === 'rejected' && cert('2-3', '열넷') === 'rejected', '번호 0, 41, 2.5, 글자는 받지 않음');
  ok(cert('2-3', 14, Buffer.from('<html>그림 아님</html>'.repeat(3)).toString('base64')) === 'rejected', '그림 머리가 아닌 파일은 받지 않음');
  ok(cert('2-3', 14, jpeg('a'), 'text/html') === 'rejected' && cert('2-3', 14, png, 'image/png') === 'rejected' && cert('2-3', 14, png, 'image/jpeg') === 'rejected', '형식이 JPEG가 아니거나(PNG 포함) 머리가 JPEG가 아니면 받지 않음');
  ok(cert('2-3', 14, '%%%') === 'rejected' && cert('2-3', 14, 123) === 'rejected', '망가진 base64·글자가 아닌 그림은 받지 않음');
  const big = Buffer.concat([Buffer.from([0xFF, 0xD8, 0xFF]), Buffer.alloc(1024 * 1024)]).toString('base64');
  ok(cert('2-3', 14, big) === 'rejected', '1MB를 넘는 그림은 받지 않음');
  ok(JSON.stringify(drive) === before, '받지 않은 요청은 드라이브를 바꾸지 않음');
  ok(sim.post({ v: 2, kind: 'cert', cls: '2-3', num: 14, type: 'image/jpeg', data: jpeg('a'), fields: { done: 6 } }) === 'ok' && sim.book.sheets.size === 0, '그림 요청에 fields가 붙어 와도 시트에는 쓰지 않음');

  // 같은 이름 덮어쓰기: 이전 파일은 휴지통, 새 파일 하나
  const dir = root().live('2-3');
  const n0 = dir.files.length;
  ok(cert('2-3', 14, jpeg('b')) === 'ok', '같은 학생 다시 보냄: ok');
  const live = dir.liveFiles('2-3반_14번.jpg');
  ok(live.length === 1 && b64(live[0]) === jpeg('b'), '같은 이름: 새 그림 하나만 남음');
  ok(dir.files.length === n0 + 1 && dir.files.filter((f) => f.name === '2-3반_14번.jpg' && f.trashed).length === n0, '같은 이름: 이전 파일은 휴지통으로 옮김');

  // 교사가 폴더를 통째로 지운 뒤 (휴지통에 있음)
  root().setTrashed(true);
  ok(cert('2-3', 14, jpeg('c')) === 'ok', '폴더를 휴지통으로 옮긴 뒤 받음: ok');
  ok(drive.folders.filter((f) => f.name === 'Lesson 8 수료증').length === 2 && root() && files('2-3').length === 1 && files('2-1').length === 0, '휴지통의 폴더는 쓰지 않고 새 폴더·반 폴더를 만들어 저장');
  // 휴지통까지 비운 뒤 (영구 삭제)
  drive.folders.forEach((f) => f.setTrashed(true));
  drive.purge();
  ok(drive.folders.length === 0 && cert('2-5', 7) === 'ok' && root() && files('2-5').map((f) => f.name).join() === '2-5반_7번.jpg', '휴지통을 비운 뒤에도 다시 받으면 폴더를 새로 만듦');
  // 반 폴더만 지운 경우
  root().live('2-5').setTrashed(true);
  ok(cert('2-5', 8) === 'ok' && files('2-5').map((f) => f.name).join() === '2-5반_8번.jpg', '반 폴더만 지운 뒤에도 반 폴더를 새로 만듦');

  // 결과 시트 기능은 그대로
  ok(sim.post({ v: 2, cls: '2-3', num: 14, fields: { done: 6 } }) === 'ok' && sim.book.getSheetByName('2-3').rows.length === 2, '그림을 받은 뒤에도 결과 시트는 그대로 동작');
  const busy = loadResults({ lockFails: true });
  ok(busy.post({ v: 2, kind: 'cert', cls: '2-3', num: 14, type: 'image/jpeg', data: jpeg('a') }) === 'busy' && busy.drive.folders.length === 0, '그림도 잠금을 못 얻으면 busy, 저장하지 않음');
}

// 편집기에서 실행하는 certCheck: 폴더와 반 폴더 6개를 만들고, 다시 실행해도 늘지 않으며, 학생 그림은 만들지 않음
{
  const sim = loadResults();
  sim.ctx.certCheck();
  sim.ctx.certCheck();
  const root = sim.drive.live('Lesson 8 수료증');
  ok(sim.drive.folders.length === 1 && root && root.folders.map((f) => f.name).join() === '2-1,2-2,2-3,2-4,2-5,2-6' && root.folders.every((f) => f.files.length === 0), 'certCheck: 폴더 하나와 반 폴더 2-1~2-6, 두 번 실행해도 그대로, 파일 없음');
  ok(sim.logs.length === 2 && sim.logs[0].startsWith('수료증 폴더: Lesson 8 수료증 (반 폴더 6개) https://'), 'certCheck: 로그에 폴더 주소');
  ok(sim.post({ v: 2, kind: 'cert', cls: '2-4', num: 9, type: 'image/jpeg', data: Buffer.concat([Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]), Buffer.alloc(30)]).toString('base64') }) === 'ok' && root.live('2-4').liveFiles().map((f) => f.name).join() === '2-4반_9번.jpg', 'certCheck로 만든 폴더에 이어서 저장');
}

console.log(`끝: 통과 ${pass}, 실패 ${fail}`);
process.exit(fail ? 1 : 0);
