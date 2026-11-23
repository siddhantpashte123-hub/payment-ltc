'use client'

/**
 * Safe clipboard copy. The async Clipboard API (navigator.clipboard) is only
 * available in secure contexts (HTTPS / localhost); on insecure origins it is
 * undefined or rejects, which previously caused unhandled promise rejections
 * and silent failures. Falls back to a hidden textarea + execCommand('copy').
 * Returns true on success, false otherwise.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // Fall through to the legacy fallback.
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.top = '-9999px'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}
