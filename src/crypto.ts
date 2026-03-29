const FORMAT_PREFIX = 'wke1.'
const SALT_BYTES = 16
const IV_BYTES = 12
const PBKDF2_ITERATIONS = 250_000

function bytesToBase64(bytes: Uint8Array): string {
    let binary = ''
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
}

function base64ToBytes(b64: string): Uint8Array {
    const binary = atob(b64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
    }
    return bytes
}

function concat(a: Uint8Array, b: Uint8Array, c: Uint8Array): Uint8Array {
    const out = new Uint8Array(a.length + b.length + c.length)
    out.set(a, 0)
    out.set(b, a.length)
    out.set(c, a.length + b.length)
    return out
}

async function deriveAesKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const enc = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
        'deriveKey',
    ])
    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt,
            iterations: PBKDF2_ITERATIONS,
            hash: 'SHA-256',
        },
        keyMaterial,
        {name: 'AES-GCM', length: 256},
        false,
        ['encrypt', 'decrypt']
    )
}

export async function encryptPrivateKey(privateKey: string, password: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
    const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
    const key = await deriveAesKey(password, salt)
    const enc = new TextEncoder()
    const ciphertext = new Uint8Array(
        await crypto.subtle.encrypt({name: 'AES-GCM', iv}, key, enc.encode(privateKey))
    )
    const payload = concat(salt, iv, ciphertext)
    return FORMAT_PREFIX + bytesToBase64(payload)
}

export async function decryptPrivateKey(encrypted: string, password: string): Promise<string> {
    if (!encrypted.startsWith(FORMAT_PREFIX)) {
        throw new Error('Invalid encrypted key format')
    }
    const raw = base64ToBytes(encrypted.slice(FORMAT_PREFIX.length))
    if (raw.length < SALT_BYTES + IV_BYTES + 16) {
        throw new Error('Invalid encrypted key data')
    }
    const salt = raw.subarray(0, SALT_BYTES)
    const iv = raw.subarray(SALT_BYTES, SALT_BYTES + IV_BYTES)
    const ciphertext = raw.subarray(SALT_BYTES + IV_BYTES)
    const key = await deriveAesKey(password, salt)
    const plaintext = await crypto.subtle.decrypt({name: 'AES-GCM', iv}, key, ciphertext)
    return new TextDecoder().decode(plaintext)
}
