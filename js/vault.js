// 열쇠: 주소에 붙어 온 열쇠를 기기에 저장하고 주소창에서 지운다. 잠긴 파일을 푼다.
// 열쇠와 푼 내용은 화면이나 콘솔에 찍지 않는다.

const STORE = 'tt8:key';
const KEY_SHAPE = /^[A-Za-z0-9_-]{43}$/; // 32바이트를 base64url로 쓴 글자

// 저장이 막힌 기기에서도 이번 접속 동안은 쓰도록 메모리 사본을 둔다
let memory = null;
let imported = null; // { text, key }

function readStored() {
  try {
    const text = localStorage.getItem(STORE);
    if (text) return text;
  } catch (e) { /* 저장 실패는 무시 */ }
  return memory;
}

function writeStored(text) {
  memory = text;
  try { localStorage.setItem(STORE, text); } catch (e) { /* 저장 실패는 무시 */ }
}

export function forgetKey() {
  memory = null;
  imported = null;
  try { localStorage.removeItem(STORE); } catch (e) { /* 저장 실패는 무시 */ }
}

// 주소의 #k=열쇠를 읽어 저장하고, 주소창에서 곧바로 지운다. 모양이 맞는 열쇠를 받았으면 true.
export function takeKeyFromUrl() {
  const hash = location.hash || '';
  const found = /(?:^#|&)k=([^&]*)/.exec(hash);
  if (!found) return false;
  try {
    history.replaceState(null, '', location.pathname + location.search);
  } catch (e) {
    location.hash = '';
  }
  let text = found[1];
  try { text = decodeURIComponent(text); } catch (e) { /* 그대로 둔다 */ }
  if (!KEY_SHAPE.test(text)) return false;
  writeStored(text);
  imported = null;
  return true;
}

export function hasKey() {
  const text = readStored();
  return Boolean(text && KEY_SHAPE.test(text));
}

function fromBase64Url(text) {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4);
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

// 저장된 열쇠를 풀 수 있는 모양으로 바꾼다. 열쇠가 없으면 null.
async function cryptoKey() {
  const text = readStored();
  if (!text || !KEY_SHAPE.test(text)) return null;
  if (imported && imported.text === text) return imported.key;
  const key = await crypto.subtle.importKey('raw', fromBase64Url(text), { name: 'AES-GCM' }, false, ['decrypt']);
  imported = { text, key };
  return key;
}

// 잠긴 파일 하나를 푼다. 파일 모양: IV 12바이트 + 암호문 + 인증 꼬리. 이름이 추가 인증 값이다.
// 열쇠가 없으면 'nokey', 열쇠가 틀리거나 파일이 바뀌었으면 'badkey'를 던진다.
export async function unlock(name, sealed) {
  const key = await cryptoKey();
  if (!key) throw new Error('nokey');
  const bytes = sealed instanceof Uint8Array ? sealed : new Uint8Array(sealed);
  try {
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: bytes.subarray(0, 12), additionalData: new TextEncoder().encode(name) },
      key,
      bytes.subarray(12),
    );
    return new Uint8Array(plain);
  } catch (e) {
    throw new Error('badkey');
  }
}
