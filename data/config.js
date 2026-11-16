// 교사가 바꾸는 설정은 이 파일 한 곳에만 둔다. (docs/ARCHITECTURE.md 4.4)

// 담당 반. 결과 수신 Apps Script의 반 목록과 같게
export const CLASSES = ['2-1', '2-2', '2-3', '2-4', '2-5', '2-6'];

// 번호 범위
export const NUMBER_MIN = 1;
export const NUMBER_MAX = 40;

// 결과 수신 Apps Script 웹 앱 주소(…/exec). 비워 두면 전송 없이 게임만 동작한다.
export const RESULT_URL = '';

// 학교 계정 입구 주소(…/exec). 교사 안내용이며 학생 화면에는 쓰지 않는다.
export const GATE_URL = '';

// 장면 5 암호 해시. 암호 낱말은 여기에 적지 않는다.
// 만들기: node tools/code-hash.mjs 2-1 낱말 2-2 낱말 …   (또는 --storyboard)
export const CODE_HASHES = {
  '2-1': '4a8963f8651e92019663d0b46c2496bf400321c83026720e99890a04ea6aade0',
  '2-2': '0eea8605fe0200eb24211ac59f9074f2110166f618b9a77ee8c715294888e307',
  '2-3': '387daf9aec185b15246db6a598c5ca0c6c80b25ec4cf0210ce266c48e72fd80b',
  '2-4': 'aaefdd5a9017eb40b7ff47d0b33e6da1ee878ea804217deb87f24c7820cffbec',
  '2-5': '6520f4f68c88188a3ada433bf08f1f213d29bee93f96c052e08dadbba0292dc8',
  '2-6': '952c9a8a7ff0a4196553fce5e02ccf07c363d8ac4e6fc12489eedf7eca986d73',
};

// 도입 영상 음량(0~1)과, 영상이 시작되지 않을 때 기다리는 시간(밀리초)
export const VIDEO_VOLUME = 0.6;
export const VIDEO_WAIT_MS = 3000;

// 듣기에서 덩어리와 덩어리 사이의 쉼(밀리초).
// 출판사 음성 파일은 앞뒤에 조용한 구간이 들어 있어, 그대로 이으면 덩어리마다 0.6~1초씩 쉰다.
// 숫자를 넣으면 그 조용한 구간을 건너뛰고 이만큼만 쉰다. null로 두면 파일을 그대로 잇는다.
export const LISTEN_PAUSE_MS = 350;        // 문장(학습지 번호)과 문장 사이
export const LISTEN_PAUSE_INLINE_MS = 150; // 한 문장 안의 덩어리 사이

// 단서 수첩 한도
export const NOTEBOOK_LIMIT = 5;
