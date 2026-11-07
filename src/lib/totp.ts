// RFC 6238 codes (SHA-1, 6 digits, 30 s) for the demo account's public authenticator key, checked in the browser.
export const DEMO_TOTP_KEY = 'JBSWY3DPEHPK3PXP'

function base32(key: string): Uint8Array<ArrayBuffer> {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = ''
  for (const c of key.replace(/[\s=-]/g, '').toUpperCase()) bits += alphabet.indexOf(c).toString(2).padStart(5, '0')
  const bytes = new Uint8Array(new ArrayBuffer(Math.floor(bits.length / 8)))
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2)
  return bytes
}

async function hotp(key: Uint8Array<ArrayBuffer>, counter: number): Promise<string> {
  const msg = new ArrayBuffer(8)
  new DataView(msg).setBigUint64(0, BigInt(counter))
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign'])
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, msg))
  const o = mac[mac.length - 1] & 0xf
  const n = ((mac[o] & 0x7f) << 24) | (mac[o + 1] << 16) | (mac[o + 2] << 8) | mac[o + 3]
  return String(n % 1_000_000).padStart(6, '0')
}

/** The code is right for this 30 s step or the one either side. */
export async function verifyTotp(code: string, key = DEMO_TOTP_KEY): Promise<boolean> {
  const step = Math.floor(Date.now() / 30_000)
  const bytes = base32(key)
  for (const s of [step - 1, step, step + 1]) if ((await hotp(bytes, s)) === code) return true
  return false
}
