// 결과 수신 Code.gs 단위 시험: node tools/test-results.mjs
// 가짜 스프레드시트로 doPost를 돌려 반·번호 검사, 칸 단위 덮어쓰기, 번호 순 정렬, 수식 막기, 길이 자르기, 잠금을 본다.
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

console.log(`끝: 통과 ${pass}, 실패 ${fail}`);
process.exit(fail ? 1 : 0);
