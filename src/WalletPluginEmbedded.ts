import {Checksum256, Name, PermissionLevel, PrivateKey} from '@wharfkit/antelope'
import {Logo} from '@wharfkit/common'
import {
    AbstractWalletPlugin,
    LoginContext,
    LogoutContext,
    TransactContext,
    WalletPluginLoginResponse,
    WalletPluginMetadata,
    WalletPluginSignResponse,
} from '@wharfkit/session'
import type {ResolvedSigningRequest} from '@wharfkit/signing-request'

import {decryptPrivateKey, encryptPrivateKey} from './crypto'
import {WEBDEX_LOGO} from './logo'
import {hasEmbeddedWallet, loadEncryptedKey, saveEncryptedKey} from './storage'
import {showCreateModal, showUnlockModal} from './ui'

const RPC_ENDPOINTS = [
    'https://eos.greymass.com',
    'https://api.eosn.io',
    'https://eos.api.eosnation.io',
]

async function getAccountByKey(publicKey: string): Promise<string> {
    for (const endpoint of RPC_ENDPOINTS) {
        try {
            const response = await fetch(`${endpoint}/v1/history/get_key_accounts`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({public_key: publicKey}),
                signal: AbortSignal.timeout(5000),
            })
            const data = (await response.json()) as {account_names?: string[]}
            if (data.account_names?.length) {
                return data.account_names[0]
            }
        } catch {
            continue
        }
    }
    throw new Error('No EOS account found for this private key')
}

export class WalletPluginEmbedded extends AbstractWalletPlugin {
    readonly id = 'embedded'

    name = 'Embedded Wallet'

    private privateKey: PrivateKey | null = null

    constructor() {
        super()
        this.metadata = new WalletPluginMetadata({
            name: this.name,
            logo: Logo.from(WEBDEX_LOGO),
        })
    }

    async login(context: LoginContext): Promise<WalletPluginLoginResponse> {
        let privateKeyWif: string

        if (hasEmbeddedWallet()) {
            const password = await showUnlockModal()
            const encrypted = loadEncryptedKey()
            if (encrypted == null) {
                throw new Error('Encrypted key missing')
            }
            privateKeyWif = await decryptPrivateKey(encrypted, password)
        } else {
            const {password, privateKey} = await showCreateModal()
            const encrypted = await encryptPrivateKey(privateKey, password)
            saveEncryptedKey(encrypted)
            privateKeyWif = privateKey
        }

        const pk = PrivateKey.from(privateKeyWif)
        this.privateKey = pk

        const publicKey = pk.toPublic().toString()
        this.metadata.publicKey = publicKey

        const actorName = await getAccountByKey(publicKey)
        const actor = Name.from(actorName)

        const chainDef = context.chain ?? context.chains[0]
        if (!chainDef) {
            throw new Error('No chain available for login')
        }

        return {
            chain: chainDef.id,
            permissionLevel: PermissionLevel.from({
                actor,
                permission: 'active',
            }),
        }
    }

    async sign(
        resolved: ResolvedSigningRequest,
        context: TransactContext
    ): Promise<WalletPluginSignResponse> {
        if (!this.privateKey) {
            throw new Error('No private key available. Please login first.')
        }
        const digest = resolved.transaction.signingDigest(Checksum256.from(context.chain.id))
        const signature = this.privateKey.signDigest(digest)
        return {
            signatures: [signature],
            resolved,
        }
    }

    async logout(_context: LogoutContext): Promise<void> {
        this.privateKey = null
    }
}
