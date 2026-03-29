const STORAGE_KEY = 'wharfkit.embedded.encryptedKey'

export function saveEncryptedKey(encrypted: string): void {
    localStorage.setItem(STORAGE_KEY, encrypted)
}

export function loadEncryptedKey(): string | null {
    return localStorage.getItem(STORAGE_KEY)
}

export function hasEmbeddedWallet(): boolean {
    const v = localStorage.getItem(STORAGE_KEY)
    return v != null && v.length > 0
}

export function clearEmbeddedWallet(): void {
    localStorage.removeItem(STORAGE_KEY)
}
