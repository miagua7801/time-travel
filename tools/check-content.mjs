// 평문 자료 점검: node tools/check-content.mjs
// private/의 audio_map.json, word_gloss.csv, content/extras.json이 서로 맞는지 본다. 잠그기 전에 실행한다.
// 교과서 문장은 찍지 않는다. 틀린 곳은 학습지 D 번호, 파일 이름, 낱말로 알린다.
import { loadSources, build } from './lib.mjs';

let result;
try {
  result = build(loadSources());
} catch (e) {
  console.log('점검 실패: ' + e.message);
  process.exit(1);
}

const { errors, warnings, stats } = result;
console.log('음성 덩어리 ' + stats.chunks + '개 · 본문 ' + stats.lines + '줄 (장면별 ' + stats.linesPerScene.join('·') + ')');
console.log('핵심 문장 ' + stats.keyLines + '개 · 단어 ' + stats.vocab + '개 (표시 ' + stats.vocabSpans + '곳)');
console.log('확인 문제 ' + stats.checks + '개 · 카드 ' + stats.cards + '장 · 간판 낱말 ' + stats.signWords + '개');
console.log('장면별 음성 묶음에 들어갈 파일 수 ' + stats.packItems.join('·') + ' (장면 1·6은 뉴스 포함)');

for (const w of warnings) console.log('주의: ' + w);
for (const e of errors) console.log('오류: ' + e);

if (errors.length) {
  console.log('점검 실패: 오류 ' + errors.length + '개. 고친 뒤 다시 실행한다.');
  process.exit(1);
}
console.log('점검 통과' + (warnings.length ? ' (주의 ' + warnings.length + '개)' : ''));
