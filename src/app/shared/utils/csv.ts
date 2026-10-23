// CSV para abrir no Excel em português: separador ";", decimal com vírgula,
// datas dd/MM/aaaa HH:mm e BOM UTF-8 (o BOM é colocado no download).

// texto  = digitado por pessoas (nome, destino, descrição...): recebe proteção contra fórmula.
// numero = vai como número com vírgula decimal (nunca recebe prefixo, senão "-12,5" vira texto).
// fixo   = gerado pelo sistema (datas formatadas, rótulos de status): sem prefixo.
export type CelulaCsv =
  | { tipo: 'texto'; valor: string | null | undefined }
  | { tipo: 'numero'; valor: number | null | undefined; casas?: number }
  | { tipo: 'fixo'; valor: string };

export const texto = (valor: string | null | undefined): CelulaCsv => ({ tipo: 'texto', valor });
export const numero = (valor: number | null | undefined, casas?: number): CelulaCsv => ({ tipo: 'numero', valor, casas });
export const fixo = (valor: string): CelulaCsv => ({ tipo: 'fixo', valor });

const SEPARADOR = ';';
const QUEBRA = '\r\n';
// Caracteres que fazem o Excel tratar a célula como fórmula.
const INICIO_FORMULA = /^[=+\-@\t\r]/;

function formatarCelula(celula: CelulaCsv): string {
  let valor: string;
  if (celula.tipo === 'numero') {
    if (celula.valor === null || celula.valor === undefined || Number.isNaN(celula.valor)) return '';
    const n = celula.casas === undefined ? String(celula.valor) : celula.valor.toFixed(celula.casas);
    return n.replace('.', ',');
  }
  valor = celula.valor ?? '';
  if (celula.tipo === 'texto' && INICIO_FORMULA.test(valor)) valor = `'${valor}`;
  return /[";\r\n]/.test(valor) ? `"${valor.replace(/"/g, '""')}"` : valor;
}

export function montarCsv(cabecalho: string[], linhas: CelulaCsv[][]): string {
  const todas = [cabecalho.map(fixo), ...linhas];
  return todas.map(linha => linha.map(formatarCelula).join(SEPARADOR)).join(QUEBRA);
}

// Data e hora no horário local, no formato que o Excel em português entende.
export function dataHoraCsv(valor: string | null | undefined): string {
  if (!valor) return '';
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return '';
  const dois = (n: number) => String(n).padStart(2, '0');
  return `${dois(d.getDate())}/${dois(d.getMonth() + 1)}/${d.getFullYear()} ${dois(d.getHours())}:${dois(d.getMinutes())}`;
}
