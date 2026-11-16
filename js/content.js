// 잠긴 파일을 받아 풀고 메모리에만 둔다. 푼 내용은 기기에 저장하지 않는다.
import { takeKeyFromUrl, hasKey, forgetKey, unlock } from './vault.js';

const BASE = new URL('../content/', import.meta.url);

let version = '';
let story = null;                 // story.bin을 푼 것
let pack = { scene: 0, data: null }; // 지금 장면의 음성 묶음 하나만 둔다

async function fetchBytes(name, fresh = false) {
  const url = new URL(name, BASE);
  if (version && !fresh) url.searchParams.set('v', version); // 판 번호를 붙여, 다시 잠근 뒤에 옛 파일이 남지 않게 한다
  const res = await fetch(url, fresh ? { cache: 'no-cache' } : {});
  if (!res.ok) throw new Error('fetch');
  return new Uint8Array(await res.arrayBuffer());
}

// 열쇠를 받고 본문을 푼다.
// 돌려주는 것: { ok: true } 또는 { ok: false, reason }
//   'nokey'  열쇠가 없다 → S0의 권한 없음 문구
//   'badkey' 열쇠가 틀렸다(저장된 열쇠는 지운다) → S0의 권한 없음 문구
//   'fetch'  파일을 받지 못했다(열쇠는 그대로 둔다)
export async function openContent() {
  takeKeyFromUrl();
  if (!hasKey()) return { ok: false, reason: 'nokey' };

  let sealed;
  try {
    const index = JSON.parse(new TextDecoder().decode(await fetchBytes('index.json', true)));
    version = String(index.v || '');
    sealed = await fetchBytes('story.bin');
  } catch (e) {
    return { ok: false, reason: 'fetch' };
  }

  try {
    const plain = await unlock('story.bin', sealed);
    story = JSON.parse(new TextDecoder().decode(plain));
  } catch (e) {
    story = null;
    forgetKey();
    return { ok: false, reason: 'badkey' };
  }
  return { ok: true };
}

export function getStory() {
  return story;
}

export function getScene(n) {
  return story ? story.scenes[String(n)] : null;
}

// 장면의 음성 묶음을 받아 푼다. 돌려주는 것: { ids, get(id) → mp3 바이트 } 또는 null(받지 못함·풀지 못함).
// null이면 듣기 단추를 흐리게 하고 읽기는 그대로 진행한다.
export async function loadScenePack(n) {
  if (pack.scene === n && pack.data) return pack.data;
  pack = { scene: 0, data: null }; // 다른 장면의 소리는 버린다
  let plain;
  try {
    const name = `s${n}.bin`;
    plain = await unlock(name, await fetchBytes(name));
  } catch (e) {
    return null;
  }
  try {
    const headLength = new DataView(plain.buffer, plain.byteOffset, 4).getUint32(0);
    const head = JSON.parse(new TextDecoder().decode(plain.subarray(4, 4 + headLength)));
    const start = 4 + headLength;
    const where = new Map(head.items.map((it) => [it.id, it]));
    const data = {
      ids: head.items.map((it) => it.id),
      // 소리로 바꿀 때(decodeAudioData) 원본이 비워지므로 매번 사본을 준다
      get(id) {
        const it = where.get(id);
        return it ? plain.slice(start + it.off, start + it.off + it.len) : null;
      },
    };
    pack = { scene: n, data };
    return data;
  } catch (e) {
    return null;
  }
}

export function dropScenePack() {
  pack = { scene: 0, data: null };
}
