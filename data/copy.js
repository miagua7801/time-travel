// 화면 문구. private/스토리보드.md에 적힌 한국어 문장만 둔다. 영어 본문 문장은 넣지 않는다.
// voice: 'hq'(본부) · 'travis' · 'narration'(내레이션) · 'button'(단추) · 'label'(목소리 없는 표시 글)
// { } 자리는 화면에서 채운다. {quote}는 잠긴 본문에서 꺼낸 문장이 들어가는 자리다.
// draft: true는 교사가 아직 정하지 않은 초안이다. 정해지면 draft를 지운다.

export const COPY = {
  // ---------- 모든 화면 ----------
  'notice': { voice: 'label', text: '수업 목적 자료. 수업 외 복제·배포 금지. 출처: 동아출판 중학교 영어 2(윤정미)' },

  // ---------- 어느 화면에서나 같은 문구 (1장) ----------
  'check.right': { voice: 'travis', text: '맞아.' },
  'check.wrong1': { voice: 'travis', text: '다시 봐. 이 문장이야.' },
  'check.wrong2': { voice: 'travis', text: '답은 이거야. 문장을 한 번 더 읽고 가자.' },
  'predict.saved': { voice: 'travis', text: '네 예측, 기록했다.' },
  'card.got': { voice: 'narration', text: '카드를 얻었다: {card}' },
  'star.saved': { voice: 'hq', text: '도전 기록 접수.' },

  // ---------- 단추 (1장 단추 이름 목록과 각 화면) ----------
  'btn.connect': { voice: 'button', text: '접속' },
  'btn.depart': { voice: 'button', text: '출발' },
  'btn.report': { voice: 'button', text: '보고' },
  'btn.missionStart': { voice: 'button', text: '임무 시작' },
  'btn.listen': { voice: 'button', text: '이어 듣기' },
  'btn.stop': { voice: 'button', text: '멈춤' },
  'btn.meaning': { voice: 'button', text: '뜻 보기' },
  'btn.readDone': { voice: 'button', text: '다 읽었다' },
  'btn.retry': { voice: 'button', text: '다시 고르기' },
  'btn.nextScene': { voice: 'button', text: '다음 장면' },
  'btn.map': { voice: 'button', text: '길 지도' },
  'btn.cardView': { voice: 'button', text: '카드 보기' },
  'btn.replayVideo': { voice: 'button', text: '영상 다시 보기' },
  'btn.resume': { voice: 'button', text: '이어서 출발' },
  'btn.rewind': { voice: 'button', text: '되감기' },
  'btn.unlock': { voice: 'button', text: '해제' },
  'btn.skip': { voice: 'button', text: '건너뛰기' },
  'btn.certificate': { voice: 'button', text: '수료증' },
  'btn.none': { voice: 'button', text: '없다' },
  'btn.retrip': { voice: 'button', text: '여행 다시 고르기' },
  'btn.notMine': { voice: 'button', text: '내 기록이 아니다' },
  'btn.from5': { voice: 'button', text: '장면 5부터' },
  'btn.trip1': { voice: 'button', text: '첫 여행' },
  'btn.trip2': { voice: 'button', text: '두 번째 여행' },
  'btn.star': { voice: 'button', text: '★ 도전' },
  'btn.prevScene': { voice: 'button', text: '이전 장면' },
  'btn.nowScene': { voice: 'button', text: '지금 장면' },
  'btn.howto': { voice: 'button', text: '사용법' },
  'btn.news': { voice: 'button', text: '뉴스' },
  'btn.notebook': { voice: 'button', text: '단서 수첩' },
  'btn.wipe': { voice: 'button', text: '지움' },
  'btn.cancel': { voice: 'button', text: '취소' },
  'btn.certSave': { voice: 'button', text: '수료증 저장' },

  // ---------- S0 접속 ----------
  's0.connect': { voice: 'hq', text: '견습 가이드, 접속하라.' },
  's0.reconnect': { voice: 'hq', text: '견습 가이드, 재접속 확인.' },
  's0.noKey': { voice: 'hq', text: '접속 권한이 없다. 입구 주소로 다시 접속하라.' },
  's0.fetchFail': { voice: 'hq', text: '자료 수신 실패. 잠시 뒤 다시 접속하라.' },
  's0.who': { voice: 'label', text: '{cls}반 {num}번' },
  's0.wipeAsk': { voice: 'hq', text: '이 기기의 기록을 지운다. 확실한가.' },

  // ---------- S2 제목·나비·여행 선택 ----------
  's2.ask': { voice: 'hq', text: '이 여행, 몇 번째인가. 거짓 보고는 임무 실패다.' },
  's2.trip1Hint': { voice: 'label', text: '이 이야기는 처음이다' },
  's2.trip2Hint': { voice: 'label', text: '결말을 이미 안다' },

  // ---------- S3 반·번호 보고 ----------
  's3.ask': { voice: 'hq', text: '소속을 보고하라.' },
  's3.need': { voice: 'hq', text: '반과 번호가 필요하다.' },
  's3.mission': { voice: 'hq', text: '임무: 가이드 Travis를 따라가라. 고객 Eckels를 지켜보라.' },
  's3.mission2': { voice: 'hq', text: '추가 임무: 결말을 미리 알려 주는 문장을 찾아라. 결말은 누구에게도 말하지 마라.' },
  's3.cls': { voice: 'label', text: '반' },
  's3.num': { voice: 'label', text: '번호' },

  // ---------- S4 길 지도 ----------
  's4.locked': { voice: 'hq', text: '다음 접속까지 잠금.' },
  'notebook.name': { voice: 'label', text: '단서 수첩' },
  // 단서 기준 말풍선
  'rule.title': { voice: 'hq', text: '단서 기준. 다섯 개만 담아라.' },
  'rule.1': { voice: 'label', text: '결말(간판·대통령·나비)과 이어지는 문장' },
  'rule.2': { voice: 'label', text: '그때는 별것 아니었는데, 결말을 알고 보니 다르게 읽히는 문장' },
  'rule.3': { voice: 'label', text: '"절대 하지 마라"처럼 경고나 약속이 담긴 문장' },

  // ---------- S5 장면 ----------
  'scene.1.name': { voice: 'label', text: '장면 1 · 사무실' },
  'scene.2.name': { voice: 'label', text: '장면 2 · 도착' },
  'scene.3.name': { voice: 'label', text: '장면 3 · 안개 속' },
  'scene.4.name': { voice: 'label', text: '장면 4 · T. rex' },
  'scene.5.name': { voice: 'label', text: '장면 5 · 타임머신 안' },
  'scene.6.name': { voice: 'label', text: '장면 6 · 현재' },

  'scene.1.intro': { voice: 'narration', text: 'Time Travel 사무실. 한 손님이 문을 열고 들어온다.' },
  'scene.2.intro': { voice: 'narration', text: '타임머신이 멈춘다. 문 밖은 6천만 년 전의 정글이다.' },
  'scene.3.intro': { voice: 'narration', text: '정글은 안개에 덮여 있다. 아주 조용하다.' },
  'scene.4.intro': { voice: 'narration', text: '100미터 앞. 무언가 천천히 모습을 드러낸다.' },
  'scene.5.intro': { voice: 'narration', text: '모두 타임머신으로 돌아왔다. Eckels는 이미 안에 있다.' },
  'scene.6.intro': { voice: 'narration', text: '타임머신이 멈춘다. 현재다. 모든 것이 그대로인 것 같다.' },

  'scene.1.summary': { voice: 'travis', text: 'Eckels는 공룡을 보고 싶어서 왔어. 곧 6천만 년 전으로 떠난다.' },
  'scene.2.summary': { voice: 'travis', text: '정글에 도착했어. 규칙은 두 가지야. 길을 벗어나지 마. 아무것도 만지지 마.' },
  'scene.3.summary': { voice: 'travis', text: 'Eckels는 신이 났어. 나는 어리석은 짓은 하지 말라고 했지.' },
  'scene.4.summary': { voice: 'travis', text: 'T. rex가 나타났어. Eckels는 겁에 질려 뛰다가 길을 벗어났다.' },
  'scene.5.summary': { voice: 'travis', text: '모두 무사히 돌아왔어. Eckels는 진흙만 조금 묻었다고 했지. 이제 집으로 간다.' },
  'scene.6.summary': { voice: 'travis', text: '간판도, 대통령도 달라졌어. Eckels의 신발 진흙 속에는 죽은 나비가 있었다.' },

  'card.sign': { voice: 'label', text: '간판' },
  'card.machine': { voice: 'label', text: '타임머신' },
  'card.fog': { voice: 'label', text: '안개' },
  'card.trex': { voice: 'label', text: 'T. rex' },
  'card.boot': { voice: 'label', text: '진흙 묻은 신발' },
  'card.butterfly': { voice: 'label', text: '나비' },

  'echo.predict': { voice: 'travis', text: '네 예측: {pick}. 자, 읽어 봐.' },

  // 장비 점검 (사용법 안내, 3장). 1~6은 장면 1, 7은 장면 2 묻기 칸이 처음 열릴 때
  'guide.1': { voice: 'hq', text: '이어 듣기를 눌러 장면을 들어 보라.' },
  'guide.2': { voice: 'hq', text: '문장 하나를 눌러 그 문장만 들어 보라.' },
  'guide.3': { voice: 'hq', text: '점선 단어를 눌러 뜻을 확인하라.' },
  // 두 번째 여행만: 3단계 뒤 단서 1·2단계
  'guide.c1': { voice: 'hq', text: '결말을 알려 주는 문장이면 ☆를 눌러라.' },
  'guide.c2': { voice: 'hq', text: '단서는 수첩에 모인다. 다섯 칸까지 담아라.' },
  'guide.4': { voice: 'hq', text: 'TV를 눌러 뉴스를 들어 보라.' },
  'guide.5': { voice: 'hq', text: "다 읽었으면 '다 읽었다'를 눌러라." },
  'guide.6': { voice: 'hq', text: "모르는 선지는 '뜻 보기'를 눌러라." },
  'guide.7': { voice: 'hq', text: "막히면 '이전 장면'에서 다시 읽어라." },
  'guide.end': { voice: 'hq', text: '장비 점검 끝. 이제 장면을 읽어라.' },

  // 확인 문제 발문 (선지는 잠긴 파일에 있다)
  'ask.c1': { voice: 'travis', text: '뉴스에 나온 사람, 누구였지?' },
  'ask.c2': { voice: 'travis', text: '방금 내가 말한 규칙이야. 저 길을 어떻게 하라고 했지?' },
  'ask.c4': { voice: 'travis', text: 'Eckels는 왜 길을 벗어났지?' },
  'ask.c5': { voice: 'travis', text: 'Eckels 말로는, 신발에 뭐가 묻었다고 했지?' },
  'ask.c6': { voice: 'travis', text: 'Eckels가 진흙 속에서 찾은 것은?' },

  // 예측 (선택지는 한국어)
  'ask.p1': { voice: 'travis', text: '네 생각은 어때. Eckels는 규칙을 끝까지 지킬까?' },
  'ask.p2': { voice: 'travis', text: '네 생각은 어때. 모두 무사히 돌아갈 수 있을까?' },
  'ask.p3': { voice: 'travis', text: '현재로 돌아가면, 뭐가 달라져 있을까?' },
  'p1.a': { voice: 'button', text: '지킨다' },
  'p1.b': { voice: 'button', text: '못 지킨다' },
  'p1.c': { voice: 'button', text: '모르겠다' },
  'p2.a': { voice: 'button', text: '모두 무사하다' },
  'p2.b': { voice: 'button', text: '누군가 다친다' },
  'p2.c': { voice: 'button', text: '모르겠다' },
  'p3.a': { voice: 'button', text: '그대로다' },
  'p3.b': { voice: 'button', text: '조금 달라졌다' },
  'p3.c': { voice: 'button', text: '많이 달라졌다' },

  // 관찰 일지
  'ask.m1': { voice: 'hq', text: '관찰 일지. 지금 고객 Eckels의 상태를 기록하라.' },
  'ask.m2': { voice: 'hq', text: '관찰 일지. T. rex 앞에 선 Eckels의 상태를 기록하라.' },
  'ask.m3': { voice: 'hq', text: '관찰 일지. 나비를 본 Eckels의 상태를 기록하라.' },
  'mood.excited': { voice: 'label', text: '신난' },
  'mood.scared': { voice: 'label', text: '겁먹은' },
  'mood.sleepy': { voice: 'label', text: '졸린' },
  'mood.happy': { voice: 'label', text: '행복한' },
  'mood.terrified': { voice: 'label', text: '겁에 질린' },
  'mood.shocked': { voice: 'label', text: '충격받은' },

  // ★ 도전
  'star.s1': { voice: 'hq', text: '도전: Parker 씨는 Eckels에게 무엇을 따르라고 했는가. 한 줄로 보고하라.' },
  'star.s2': { voice: 'hq', text: "도전: '{quote}'는 무슨 뜻인가. 한 줄로 보고하라." },
  'star.s5': { voice: 'hq', text: '도전: Travis는 왜 아무 말 없이 Eckels를 오래 쳐다봤는가. 한 줄로 보고하라.' },
  'star.s6': { voice: 'hq', text: '도전: Eckels는 왜 충격받았는가. 한 줄로 보고하라.' },

  // ---------- S6 To be continued ----------
  's6.continued': { voice: 'label', text: 'To be continued' },
  's6.wait': { voice: 'hq', text: '오늘 임무는 여기까지. 다음 접속까지 대기하라.' },
  's6.go5': { voice: 'hq', text: '장면 5로 이동하라.' },

  // ---------- S7 지난 이야기 ----------
  's7.recap': { voice: 'hq', text: '견습 가이드, 재접속 확인. 지난 임무를 확인하라.' },

  // ---------- S8 암호 ----------
  's8.ask': { voice: 'hq', text: '장면 5는 잠겨 있다. 암호를 입력하라.' },
  's8.wrong': { voice: 'hq', text: '암호 불일치. 다시 입력하라.' },
  's8.open': { voice: 'narration', text: '잠금이 풀렸다.' },

  // ---------- S9 간판 ----------
  's9.open': { voice: 'narration', text: '간판이 달라져 있다. 원래대로 고쳐라.' },
  's9.done': { voice: 'narration', text: '간판은 고쳤다. 그러나 대통령은 그대로다. 나비도 돌아오지 않는다.' },

  // ---------- S10 수료증 ----------
  's10.done': { voice: 'hq', text: '훈련 종료. 견습 가이드 수료를 인정한다.' },
  // 증서 (시안 B)
  's10.brand': { voice: 'label', text: 'TIME TRAVEL' },
  's10.name': { voice: 'label', text: '견습 가이드 수료증' },
  's10.passed': { voice: 'label', text: '이 견습 가이드는 장면 1~6 훈련을 모두 마쳤다.' },
  's10.sign': { voice: 'label', text: '{date} · TIME TRAVEL 본부' },
  // 훈련 기록
  's10.record': { voice: 'label', text: '훈련 기록' },
  's10.predictTitle': { voice: 'label', text: '내 예측과 실제로 일어난 일' },
  's10.colQ': { voice: 'label', text: '질문' },
  's10.colMine': { voice: 'label', text: '내 예측' },
  's10.colReal': { voice: 'label', text: '실제로 일어난 일' },
  's10.moodTitle': { voice: 'label', text: '관찰 일지 · Eckels의 마음' },
  's10.starTitle': { voice: 'label', text: '★ 도전' },
  's10.starCount': { voice: 'label', text: '{n}개 보고' },
  's10.sceneNo': { voice: 'label', text: '장면 {n}' },
  's10.notes': { voice: 'label', text: '단서 수첩 {n}개 보고' },
  // 수료증 저장 (단서 수첩을 보고한 뒤)
  's10.saved': { voice: 'narration', text: '수료증을 저장했다. 파일 앱의 다운로드에 있다.' },
  's10.saveHint': { voice: 'hq', text: '파일이 없으면 Ctrl과 창 보기 키로 화면을 찍어라.' },
  's10.saveFail': { voice: 'hq', text: '저장하지 못했다. Ctrl과 창 보기 키를 함께 눌러 화면을 찍어라.' },
  's10.p1': { voice: 'label', text: '① Eckels는 규칙을 끝까지 지킬까' },
  's10.p2': { voice: 'label', text: '② 모두 무사히 돌아갈 수 있을까' },
  's10.p3': { voice: 'label', text: '③ 현재로 돌아가면 뭐가 달라져 있을까' },
  's10.p1Real': { voice: 'label', text: 'Eckels는 길을 벗어났다.' },
  's10.p2Real': { voice: 'label', text: '모두 돌아왔다. 그러나 현재가 달라졌다.' },
  's10.p3Real': { voice: 'label', text: '간판의 글자와 대통령이 달라졌다.' },

  // ---------- S11 되감기 ----------
  's11.open': { voice: 'hq', text: '마지막 임무. 결말을 알고 다시 보라. 결말을 미리 알려 준 문장을 찾아라.' },
  // 설명 (첫 여행만): 본부 문구 다음에 한 줄씩
  's11.why1': { voice: 'travis', text: '결말을 알고 다시 읽으면 다르게 보이는 문장이 있어.' },
  's11.why2': { voice: 'travis', text: '아침에 하늘이 흐렸다. 오후에 비가 왔다.' },
  's11.why3': { voice: 'travis', text: '흐린 하늘이 비를 미리 알려 줬지. 그런 문장이 단서야.' },
  's11.why4': { voice: 'travis', text: '장면 1~5에서 단서를 찾아 ☆를 눌러.' },
  // 되감기 임무 목록 (길 지도와 장면 위쪽). 마친 임무는 ☐ 대신 ✓
  's11.task1': { voice: 'label', text: '단서 담기 ({n}/{max})' },
  's11.task2': { voice: 'label', text: '단서 수첩 보고' },
  's11.writeAndReport': { voice: 'hq', text: '단서마다 나중에 일어난 일을 쓰고 보고하라.' },
  // 보고 뒤 완료 상자와 S4 상태 칸
  'mission.allDone': { voice: 'hq', text: '모든 임무 완료. 견습 가이드, 수고했다.' },
  // 되감기 길 지도의 장면 6 칸 (보고 전)
  's11.scene6Locked': { voice: 'hq', text: '단서는 장면 1~5에서 찾아라. 보고 뒤에 열린다.' },
  's11.added': { voice: 'narration', text: '단서 수첩에 담았다.' },
  's11.full': { voice: 'hq', text: '수첩은 다섯 칸이다. 하나를 빼라.' },
  's11.memo': { voice: 'label', text: '나중에 일어난 일' },
  's11.reported': { voice: 'hq', text: '단서 접수. 다음 시간에 확인한다.' },
  // 되감기 길 지도에서 수첩이 다 찼을 때 ★ n/5 단추를 가리키는 안내 (교사 확정)
  's11.goNotebook': { voice: 'hq', text: '수첩이 찼다. 단서 수첩을 열어 보고하라.' },

  // ---------- 두 번째 여행 (7장) ----------
  'trip2.pick': { voice: 'travis', text: '너는 결말을 알지. 이 장면에서 결말을 미리 알려 주는 문장을 하나 골라.' },
  'trip2.why': { voice: 'hq', text: '이유를 한 줄로 보고하라.' },
  'trip2.saved': { voice: 'travis', text: '좋아. 기록했다.' },
  'trip2.read': { voice: 'travis', text: '단서를 찾으면서 읽어 봐.' },
};
