// Monta elementos com textContent: o texto nunca é interpretado como HTML.
// Usar sempre que dados da API forem para popups ou ícones do Leaflet.
export function criarElemento(tag: string, texto = '', estilo = ''): HTMLElement {
  const el = document.createElement(tag);
  if (texto) el.textContent = texto;
  if (estilo) el.setAttribute('style', estilo);
  return el;
}

// Aceita só base64 puro (A-Z, a-z, 0-9, +, / e = no final).
export function fotoBase64Valida(foto: string | null | undefined): foto is string {
  return !!foto && /^[A-Za-z0-9+/]+={0,2}$/.test(foto);
}
