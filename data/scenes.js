// 장면 6개의 뼈대 (docs/ARCHITECTURE.md 2.3). 영어 본문 문장은 넣지 않는다.
// 본문·선지·카드 뒷면은 잠긴 파일(content/story.bin)에 있다. 문구는 data/copy.js의 id로 찾는다.
//   card  카드 이름 문구 'card.{card}'     img   assets/img/cards/{img}.webp
//   tv    그림 아래 "뉴스" TV 단추의 뉴스   asks  묻기 순서 (c 확인 · p 예측 · m 관찰 일지)
//   star  ★ 도전 문구 'star.{star}'          echo  장면이 열릴 때 되돌려주는 예측
//   next  "다음 장면" 대신 바로 가는 화면
//   sign  장면 그림의 빈 간판 자리에 앱이 간판 문구를 얹어 쓴다 (문구는 잠긴 파일에서)
export const SCENES = [
  { n: 1, card: 'sign',      img: 'card_1_sign',      tv: 'N1', asks: ['c1'],         star: 's1', sign: true },
  { n: 2, card: 'machine',   img: 'card_2_machine',             asks: ['c2', 'p1'],   star: 's2' },
  { n: 3, card: 'fog',       img: 'card_3_fog',       echo: 'p1', asks: ['m1'] },
  { n: 4, card: 'trex',      img: 'card_4_trex',                asks: ['c4', 'm2'],   next: 's6' },   // 두 번째 여행은 끝에 p2
  { n: 5, card: 'boot',      img: 'card_5_boot',      echo: 'p2', asks: ['c5', 'p3'], star: 's5' },
  { n: 6, card: 'butterfly', img: 'card_6_butterfly', tv: 'N2', echo: 'p3', asks: ['c6', 'm3'], star: 's6', next: 's9' },
];

// 관찰 일지. 그림은 assets/img/mood/mood_{key}.webp. 확인 문제와 같은 흐름으로 정답·오답을 알린다.
// answer는 정답 카드, evidence는 근거 줄(학습지 D 번호): 정답이면 잠깐 빛나고, 오답이면 밑줄.
export const MOODS = {
  m1: { scene: 3, options: ['excited', 'scared', 'sleepy'], answer: 'excited', evidence: 24 },
  m2: { scene: 4, options: ['happy', 'excited', 'terrified'], answer: 'terrified', evidence: 40 },
  m3: { scene: 6, options: ['happy', 'excited', 'shocked'], answer: 'shocked', evidence: 73 },
};

// 예측. 선택지 a·b·c의 글은 copy.js의 'p1.a' 등
export const PREDICTS = { p1: { scene: 2 }, p2: { scene: 4 }, p3: { scene: 5 } };

// 카드 1 그림(card_1_sign)의 빈 간판 안쪽 글자 자리 (그림 왼쪽 위 기준 %). 장면 1과 S9 간판 고치기가 함께 쓴다.
export const SIGN_SPOT = { left: 28, top: 17.5, width: 32.5, height: 22.5 };

// 길 지도 위 카드 자리 (그림 왼쪽 위 기준 %, 카드 중심)
export const MAP_SPOTS = [[17.9, 42.9], [32.1, 58.0], [48.3, 55.3], [62.5, 39.8], [77.9, 48.8], [93.6, 53.2]];
