import { base } from '$app/paths'

export type ShareResult = 'shared' | 'copied' | 'failed'

function shareText(username: string): string {
  return `Agrégame en Coach Pedro AI: mi usuario es ${username}`
}

function appUrl(): string {
  return `${location.origin}${base}/`
}

async function copyToClipboard(text: string): Promise<ShareResult> {
  try {
    await navigator.clipboard.writeText(text)
    return 'copied'
  } catch {
    return 'failed'
  }
}

// Native share sheet where it exists (iPhone); the clipboard everywhere else.
// Closing the share sheet rejects with AbortError: that is the user changing
// their mind, not a failure, so it must not fall through to the clipboard.
export async function shareUsername(username: string): Promise<ShareResult> {
  const text = shareText(username)
  const url = appUrl()
  if (typeof navigator.share !== 'function') return copyToClipboard(`${text} ${url}`)
  try {
    await navigator.share({ text, url })
    return 'shared'
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') return 'shared'
    return copyToClipboard(`${text} ${url}`)
  }
}
