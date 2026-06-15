/**
 * Utilidades para codificar/decodificar esquemas SQL en la URL (hash).
 *
 * Formato actual:  #import=<lz-string comprimido + URI-safe base64>
 * Formato antiguo: #import=<btoa base64 plano>  (backward-compatible)
 *
 * lz-string reduce el tamaño del parámetro ~40-70% vs base64 plano.
 */

import LZString from 'lz-string';

export function encodeSchema(sql: string): string {
  return LZString.compressToEncodedURIComponent(sql);
}

export function decodeSchema(param: string): string | null {
  // Intentar con lz-string primero (formato actual)
  const lz = LZString.decompressFromEncodedURIComponent(param);
  if (lz) return lz;

  // Fallback: base64 plano (formato antiguo)
  try {
    return decodeURIComponent(escape(atob(param)));
  } catch {
    return null;
  }
}

export function buildShareUrl(sql: string): string {
  const base = `${location.origin}${location.pathname}`;
  return `${base}#import=${encodeSchema(sql)}`;
}
