/**
 * Copia texto al portapapeles con fallback a execCommand para contextos no-HTTPS.
 * navigator.clipboard solo está disponible en HTTPS o localhost.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Caer al fallback
    }
  }

  // Fallback: textarea + execCommand (funciona en HTTP)
  const el = document.createElement('textarea');
  el.value = text;
  el.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0';
  document.body.appendChild(el);
  el.focus();
  el.select();
  try {
    return document.execCommand('copy');
  } finally {
    document.body.removeChild(el);
  }
}
