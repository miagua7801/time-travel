/**
 * Lesson 8 견습 가이드 훈련 - 결과 수신 (전송 시험용)
 * 사용법: 수신용 스프레드시트에서 [확장 프로그램] → [Apps Script]를 열고 이 코드를 통째로 붙여 넣기
 * 배포: [배포] → [새 배포] → 유형 '웹 앱' / 실행: 나 / 액세스 권한: 모든 사용자
 * 코드를 고친 뒤에는 [배포] → [배포 관리] → 연필 → 버전 '새 버전'으로 다시 배포해야 반영됨
 */

// 담당 반 목록으로 바꿀 것. 이 목록에 없는 반으로 온 결과는 받지 않음.
const ALLOWED_CLASSES = ['2-1', '2-2', '2-3', '2-4', '2-5', '2-6'];
const HEADER = ['번호', '모둠', '보낸 시각', '차시', '내용'];

// 배포가 살아 있는지 브라우저 주소창에서 확인할 때 'ok'가 보임
function doGet() {
  return ContentService.createTextOutput('ok');
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000); // 한 반 24명이 동시에 보내도 줄이 엉키지 않게
  try {
    const data = JSON.parse(e.postData.contents);
    const cls = String(data.class || '').trim();
    const num = parseInt(data.number, 10);
    if (ALLOWED_CLASSES.indexOf(cls) === -1 || !(num >= 1 && num <= 40)) {
      return ContentService.createTextOutput('rejected');
    }
    const group = safe(String(data.group || '').trim().slice(0, 10));
    const row = [num, group, new Date(), safe(String(data.period || '')), safe(String(data.payload || '').slice(0, 1000))];

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sh = ss.getSheetByName(cls);
    if (!sh) {
      sh = ss.insertSheet(cls);
      sh.appendRow(HEADER);
      sh.setFrozenRows(1);
    }

    // 같은 번호가 있으면 그 줄을 덮어쓰고, 없으면 새 줄 추가 → 학생당 한 줄
    const last = sh.getLastRow();
    let target = 0;
    if (last >= 2) {
      const nums = sh.getRange(2, 1, last - 1, 1).getValues();
      for (let i = 0; i < nums.length; i++) {
        if (Number(nums[i][0]) === num) { target = i + 2; break; }
      }
    }
    if (target) sh.getRange(target, 1, 1, row.length).setValues([row]);
    else sh.appendRow(row);

    if (sh.getLastRow() > 2) sh.getRange(2, 1, sh.getLastRow() - 1, HEADER.length).sort(1);
    return ContentService.createTextOutput('ok');
  } catch (err) {
    return ContentService.createTextOutput('error');
  } finally {
    lock.releaseLock();
  }
}

// 학생이 =, +, -, @로 시작하는 글을 써도 수식으로 실행되지 않게
function safe(s) {
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}
