import {PermissionLevel, PrivateKey} from '@wharfkit/antelope'
import {
    AbstractWalletPlugin,
    LoginContext,
    LogoutContext,
    TransactContext,
    WalletPluginLoginResponse,
    WalletPluginSignResponse,
} from '@wharfkit/session'
import type {ResolvedSigningRequest} from '@wharfkit/signing-request'

import {decryptPrivateKey, encryptPrivateKey} from './crypto'
import {hasWallet, loadEncryptedKey, saveEncryptedKey} from './storage'
import {showCreateModal, showUnlockModal} from './ui'

const HARDCODED_ACTOR = 'testaccount'

export class WalletPluginEmbedded extends AbstractWalletPlugin {
    readonly id = 'embedded'

    name = 'Embedded Wallet'

    private sessionPrivateKey?: PrivateKey

    async login(context: LoginContext): Promise<WalletPluginLoginResponse> {
        let privateKeyWif: string

        if (hasWallet()) {
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
        this.sessionPrivateKey = pk

        const publicKey = pk.toPublic().toLegacyString()
        this.metadata.publicKey = publicKey

        const chainDef = context.chain ?? context.chains[0]
        if (!chainDef) {
            throw new Error('No chain available for login')
        }

        const actor = HARDCODED_ACTOR

        return {
            chain: chainDef.id,
            permissionLevel: PermissionLevel.from({
                actor,
                permission: 'active',
            }),
        }
    }

    async sign(
        transaction: ResolvedSigningRequest,
        _context: TransactContext
    ): Promise<WalletPluginSignResponse> {
        if (!this.sessionPrivateKey) {
            throw new Error('Wallet not unlocked')
        }
        const signature = this.sessionPrivateKey.signDigest(transaction.signingDigest)
        return {
            signatures: [signature],
        }
    }

    async logout(_context: LogoutContext): Promise<void> {
        this.sessionPrivateKey = undefined
    }
}
