const z =
    'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.45);z-index:2147483646;font:14px system-ui,sans-serif'
const box =
    'background:#fff;color:#111;padding:20px;border-radius:8px;min-width:280px;max-width:90vw;box-shadow:0 8px 32px rgba(0,0,0,.2)'
const label = 'display:block;margin:12px 0 4px;font-weight:600'
const input =
    'width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid #ccc;border-radius:4px;font:inherit'
const row = 'display:flex;gap:8px;justify-content:flex-end;margin-top:16px'

export async function showUnlockModal(): Promise<string> {
    return new Promise((resolve, reject) => {
        const root = document.createElement('div')
        root.setAttribute('role', 'dialog')
        root.style.cssText = z

        const esc = (e: KeyboardEvent): void => {
            if (e.key === 'Escape') {
                document.removeEventListener('keydown', esc)
                root.remove()
                reject(new Error('Unlock cancelled'))
            }
        }
        document.addEventListener('keydown', esc)

        root.innerHTML = `
<div style="${box}">
  <div style="font-weight:700;margin-bottom:8px">Unlock wallet</div>
  <label style="${label}" for="wke-unlock-pw">Password</label>
  <input id="wke-unlock-pw" type="password" autocomplete="current-password" style="${input}" />
  <div style="${row}">
    <button type="button" data-cancel style="padding:8px 14px;border:1px solid #ccc;border-radius:4px;background:#f5f5f5;cursor:pointer">Cancel</button>
    <button type="button" data-ok style="padding:8px 14px;border:none;border-radius:4px;background:#1a1a1a;color:#fff;cursor:pointer">Unlock</button>
  </div>
</div>`

        const pw = root.querySelector('#wke-unlock-pw') as HTMLInputElement
        const ok = root.querySelector('[data-ok]') as HTMLButtonElement
        const cancel = root.querySelector('[data-cancel]') as HTMLButtonElement

        const teardown = (): void => {
            document.removeEventListener('keydown', esc)
            root.remove()
        }

        const submit = (): void => {
            const v = pw.value
            teardown()
            resolve(v)
        }
        ok.addEventListener('click', submit)
        pw.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault()
                submit()
            }
        })
        cancel.addEventListener('click', () => {
            teardown()
            reject(new Error('Unlock cancelled'))
        })
        root.addEventListener('click', (e) => {
            if (e.target === root) {
                teardown()
                reject(new Error('Unlock cancelled'))
            }
        })

        document.body.appendChild(root)
        pw.focus()
    })
}

export async function showCreateModal(): Promise<{password: string; privateKey: string}> {
    return new Promise((resolve, reject) => {
        const root = document.createElement('div')
        root.setAttribute('role', 'dialog')
        root.style.cssText = z

        const esc = (e: KeyboardEvent): void => {
            if (e.key === 'Escape') {
                document.removeEventListener('keydown', esc)
                root.remove()
                reject(new Error('Create cancelled'))
            }
        }
        document.addEventListener('keydown', esc)

        root.innerHTML = `
<div style="${box}">
  <div style="font-weight:700;margin-bottom:8px">Create / import wallet</div>
  <label style="${label}" for="wke-create-pw">Password</label>
  <input id="wke-create-pw" type="password" autocomplete="new-password" style="${input}" />
  <label style="${label}" for="wke-create-key">Private key</label>
  <textarea id="wke-create-key" rows="3" autocomplete="off" style="${input};resize:vertical;font-family:ui-monospace,monospace"></textarea>
  <div style="${row}">
    <button type="button" data-cancel style="padding:8px 14px;border:1px solid #ccc;border-radius:4px;background:#f5f5f5;cursor:pointer">Cancel</button>
    <button type="button" data-ok style="padding:8px 14px;border:none;border-radius:4px;background:#1a1a1a;color:#fff;cursor:pointer">Save</button>
  </div>
</div>`

        const pw = root.querySelector('#wke-create-pw') as HTMLInputElement
        const key = root.querySelector('#wke-create-key') as HTMLTextAreaElement
        const ok = root.querySelector('[data-ok]') as HTMLButtonElement
        const cancel = root.querySelector('[data-cancel]') as HTMLButtonElement

        const teardown = (): void => {
            document.removeEventListener('keydown', esc)
            root.remove()
        }

        ok.addEventListener('click', () => {
            const out = {password: pw.value, privateKey: key.value.trim()}
            teardown()
            resolve(out)
        })
        cancel.addEventListener('click', () => {
            teardown()
            reject(new Error('Create cancelled'))
        })
        root.addEventListener('click', (e) => {
            if (e.target === root) {
                teardown()
                reject(new Error('Create cancelled'))
            }
        })

        document.body.appendChild(root)
        pw.focus()
    })
}
