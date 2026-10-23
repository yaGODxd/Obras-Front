import { HttpParams } from '@angular/common/http';

// Parâmetros de URL com codificação correta (espaço, &, acentos). Valores vazios ou 0 não vão, como antes.
export function montarParams(valores: Record<string, string | number | undefined>): HttpParams {
  let params = new HttpParams();
  for (const [chave, valor] of Object.entries(valores)) {
    if (valor) params = params.set(chave, String(valor));
  }
  return params;
}
