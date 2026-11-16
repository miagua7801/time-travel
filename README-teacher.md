# 교사용 안내 — Claude Code로 만드는 순서 (Sonnet 또는 Opus)

## 준비 (한 번)
1. 노트북에서 `time-travel` 저장소를 내려받습니다(이미 있으면 그 폴더).
   `git clone https://github.com/miagua7801/time-travel.git`
2. 이 묶음의 파일을 저장소 폴더에 그대로 복사합니다(CLAUDE.md, docs/, data/, prompts/, tools/, apps-script/, assets/).
3. 넣을 파일
   - `assets/source/canva_sheet.png` — Canva 캐릭터 시안(학생 4명 + Travis 3명)을 PNG로 내려받아 이 이름으로
   - `assets/source/canva_parker.png` — Mr. Parker 그림(조끼·넥타이 판)
   - `assets/audio/` — 녹음 파일 14개 + 뉴스 2개. 파일 이름은 `data/questions.js`의 `AUDIO` 표와 같게(확장자 제외). 뉴스 파일은 이름을 `news_N1`, `news_N2`로 바꾸거나 표를 고칩니다.
   - `data/config.js` — `ENDPOINT`에 Apps Script 웹 앱 URL(시험 때 쓴 것), 녹음 확장자 `AUDIO_EXT`
4. 저장소 폴더에서 터미널을 열고 `claude`를 실행한 뒤 `/model`로 모델을 고릅니다. 프롬프트는 Sonnet과 Opus 어느 쪽에도 그대로 쓸 수 있습니다. Sonnet이 더 빠르고 사용량이 적고, Opus는 단계 3(챕터 화면)·6(결과 시트)처럼 규칙이 많은 단계에서 실수가 적습니다.

## 단계마다
1. `prompts/` 의 프롬프트를 번호 순서대로 하나씩 붙여 넣습니다(01 → 07). 한 번에 여러 개를 넣지 않습니다.
2. 보고를 읽고 '교사가 볼 것'을 확인합니다. 특히 '새로 필요한 문구'가 있으면 Opus 대화로 가져와 문구표에 넣을지 정합니다.
3. 괜찮으면 "커밋해 줘"라고 말합니다. GitHub에 올리려면 "푸시해 줘".
4. 문제가 있으면 그 단계 안에서 고쳐 달라고 말하고, 다음 단계로 넘어가지 않습니다.

| 단계 | 프롬프트 | 끝나면 선생님이 볼 것 |
|---|---|---|
| 1 | 01_skeleton | 반·번호·모둠 입력, 시작, 직업 고르기 화면 |
| 2 | 02_characters | 잘라 낸 그림 8장(contact-sheet.png) |
| 3 | 03_chapters | 챕터 1을 직업 하나로 끝까지 |
| 4 | 04_save_resume_send | 1차시 끝 코드, 시험 시트에 '2-1반 40번 개발시험' 줄 |
| 5 | 05_exam_license | 가이드 시험과 자격증 화면 |
| 6 | 06_sheet_teacher | apps-script/README.md 순서대로 Google 쪽 설정, `?teacher` 화면 |
| 7 | 07_check | CHECKLIST.md, copy-audit.md, 수업전-확인.md |

## 바꾸면 안 되는 것
`data/questions.js`(문항), `data/lines.js`(확정 문구). Sonnet이 고치자고 하면 Opus 대화에서 먼저 확인합니다.

## 단원이 끝나면
GitHub 저장소 **Settings → General → 맨 아래 Danger Zone → Change repository visibility → Private**. 비공개로 돌리면 GitHub Pages 주소도 닫힙니다(무료 계정 기준).
