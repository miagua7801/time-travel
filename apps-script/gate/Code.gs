/**
 * Lesson 8 견습 가이드 훈련 - 학교 계정 입구
 * 하는 일은 하나뿐: 열쇠를 붙여 웹앱 주소로 넘겨 준다.
 *
 * 열쇠와 웹앱 주소는 이 코드에 쓰지 않는다. [프로젝트 설정] → [스크립트 속성]에 둔다.
 *   KEY      private/vault.key의 내용 (43자)
 *   APP_URL  웹앱 주소 (예: https://<계정>.github.io/time-travel/)
 * 배포: [배포] → [새 배포] → 유형 '웹 앱' / 실행: 나 / 액세스 권한: 학교 도메인 내 모든 사용자
 * 누가 열었는지는 적지 않는다. 자세한 순서는 apps-script/README.md.
 */

function doGet() {
  var props = PropertiesService.getScriptProperties();
  var key = (props.getProperty('KEY') || '').trim();
  var app = (props.getProperty('APP_URL') || '').trim();

  if (!/^[A-Za-z0-9_-]{43}$/.test(key) || !/^https:\/\//.test(app)) {
    return page_('<p class="line">설정 필요: 스크립트 속성 KEY, APP_URL</p>');
  }

  var url = app.replace(/#.*$/, '') + '#k=' + key;
  return page_(
    '<p class="line">신원 확인 완료.</p>' +
    '<a class="btn" href="' + esc_(url) + '" target="_top" rel="noreferrer">입장</a>'
  );
}

/**
 * 열쇠 점검: 편집기에서 이 함수를 골라 [실행]하면 실행 로그에 열쇠 '지문'과 APP_URL이 나온다.
 * 지문은 열쇠를 SHA-256으로 바꾼 앞 8자이고, 열쇠 자체는 찍지 않는다.
 * 교사 컴퓨터에서 node tools/key-check.mjs로 나온 지문과 같아야 한다. 다르면 KEY를 다시 넣는다.
 */
function checkKey() {
  var props = PropertiesService.getScriptProperties();
  var raw = props.getProperty('KEY') || '';
  var key = raw.trim();
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, key, Utilities.Charset.UTF_8);
  var hex = bytes.map(function (b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join('');
  Logger.log('KEY 길이 ' + key.length + (raw.length !== key.length ? ' (앞뒤 공백 ' + (raw.length - key.length) + '자 있음, 무시함)' : '') +
    ', 모양 ' + (/^[A-Za-z0-9_-]{43}$/.test(key) ? '맞음' : '틀림'));
  Logger.log('열쇠 지문 ' + hex.slice(0, 8));
  Logger.log('APP_URL ' + (props.getProperty('APP_URL') || '(없음)'));
}

function page_(body) {
  var html =
    '<!doctype html><html lang="ko"><head><meta charset="utf-8">' +
    '<base target="_top">' +
    '<style>' +
    'html,body{height:100%;margin:0}' +
    'body{background:#000;color:#fff;font-family:"Noto Sans KR","Malgun Gothic",system-ui,sans-serif;font-size:20px;line-height:1.5;' +
    'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:32px}' +
    '.line{margin:0}' +
    '.btn{display:inline-block;min-width:160px;padding:12px 32px;border:2px solid #fff;border-radius:8px;' +
    'color:#000;background:#fff;font-size:20px;font-weight:700;text-align:center;text-decoration:none}' +
    '.btn:focus-visible{outline:3px solid #fb923c;outline-offset:3px}' +
    '.notice{position:fixed;left:0;right:0;bottom:8px;margin:0;text-align:center;font-size:12px;color:#d1d5db}' +
    '</style></head><body>' +
    body +
    '<p class="notice">수업 목적 자료. 수업 외 복제·배포 금지. 출처: 동아출판 중학교 영어 2(윤정미)</p>' +
    '</body></html>';
  return HtmlService.createHtmlOutput(html)
    .setTitle('견습 가이드 훈련')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function esc_(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
