// 교사가 바꾸는 설정은 이 파일 한 곳에만 둔다.

// 담당 반 — Apps Script(Code.gs)의 ALLOWED_CLASSES와 반드시 같게
export const CLASSES = ['2-1', '2-2', '2-3', '2-4', '2-5', '2-6'];

// 결과 수신 Apps Script 웹 앱 URL (…/exec). 시험 때 쓴 URL과 같은 배포를 쓴다.
export const ENDPOINT = '여기에_웹앱_URL';

// 전송이 끝내 실패할 때 결과 코드를 붙여 넣을 Google 설문지 주소 (학교 계정으로 만든 것)
export const FALLBACK_FORM_URL = '여기에_설문지_URL';

// 녹음 파일 확장자 (assets/audio/ 안의 실제 파일에 맞출 것: 'mp3', 'm4a', 'wav' 등)
export const AUDIO_EXT = 'mp3';

// 효과음 기본값 — 꺼짐. 교사가 화면 설정에서 켤 수 있다.
export const SFX_DEFAULT_ON = false;

// 단계별 권장 시간(분). 화면에 표시만 하고 막지는 않는다. 진행은 교사가 말로 전환한다.
export const STAGE_MINUTES = { main: 5, meeting: 3, party: 2, sign: 1, examGate: 1 };

// 모둠 이름 최대 글자 수, 번호 범위
export const GROUP_MAX = 10;
export const NUMBER_MIN = 1;
export const NUMBER_MAX = 40;

// 기기 저장 키 접두사 (같은 크롬북을 여러 학생이 쓸 수 있으므로 반·번호별로 저장)
export const STORAGE_PREFIX = 'tt8:v1:';
