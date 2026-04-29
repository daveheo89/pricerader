// AES-256-GCM 으로 네이버 API 키를 암호화해서 DB에 저장
// ENCRYPT_KEY 환경변수 = 정확히 32자

const ALGO = 'AES-GCM'

function getKey(): Promise<CryptoKey> {
  const raw = new TextEncoder().encode(
    (process.env.ENCRYPT_KEY || '').padEnd(32, '0').slice(0, 32)
  )
  return crypto.subtle.importKey('raw', raw, ALGO, false, ['encrypt', 'decrypt'])
}

export async function encrypt(text: string): Promise<string> {
  const key = await getKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(text)
  const ciphertext = await crypto.subtle.encrypt({ name: ALGO, iv }, key, encoded)
  const buf = new Uint8Array([...iv, ...new Uint8Array(ciphertext)])
  return Buffer.from(buf).toString('base64')
}

export async function decrypt(base64: string): Promise<string> {
  const key = await getKey()
  const buf = Buffer.from(base64, 'base64')
  const iv = buf.slice(0, 12)
  const data = buf.slice(12)
  const plain = await crypto.subtle.decrypt({ name: ALGO, iv }, key, data)
  return new TextDecoder().decode(plain)
}
