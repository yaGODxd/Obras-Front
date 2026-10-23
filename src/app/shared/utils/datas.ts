// ============================================================================
// SUPOSIÇÃO SOBRE A API (único lugar a mudar se ela se mostrar errada):
// a API envia data e hora em UTC, mas SEM indicar o fuso ("2026-10-18T13:08:00").
// Sem fuso, o navegador leria isso como hora local (3 h de diferença no Brasil).
// Por isso acrescentamos "Z" (= UTC) nessas strings ao receber as respostas.
// ============================================================================

// AAAA-MM-DDTHH:mm, com :ss e fração de segundo opcionais, e NADA depois.
// Strings com "Z" ou "+hh:mm"/"-hh:mm" não casam e ficam como estão.
const DATA_HORA_SEM_FUSO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?$/;

// Campos que a API já manda em hora LOCAL e não devem ganhar "Z". Vazia por enquanto.
export const CAMPOS_HORA_LOCAL: readonly string[] = [];

// Percorre a resposta (objetos aninhados e arrays) e acrescenta "Z" só nas
// strings de data e hora sem fuso. Não altera o valor recebido: devolve uma cópia.
export function normalizarDatasApi<T>(valor: T, camposHoraLocal: readonly string[] = CAMPOS_HORA_LOCAL): T {
  return normalizar(valor, null, camposHoraLocal) as T;
}

function normalizar(valor: unknown, campo: string | null, camposHoraLocal: readonly string[]): unknown {
  if (typeof valor === 'string') {
    const ehExcecao = campo !== null && camposHoraLocal.includes(campo);
    return !ehExcecao && DATA_HORA_SEM_FUSO.test(valor) ? valor + 'Z' : valor;
  }
  if (Array.isArray(valor)) {
    return valor.map(item => normalizar(item, campo, camposHoraLocal));
  }
  if (valor !== null && typeof valor === 'object') {
    const copia: Record<string, unknown> = {};
    for (const [chave, item] of Object.entries(valor)) {
      copia[chave] = normalizar(item, chave, camposHoraLocal);
    }
    return copia;
  }
  return valor;
}

// ----------------------------------------------------------------------------
// Filtros por dia (valor de <input type="date">, "AAAA-MM-DD"), sempre no horário LOCAL.
// Não use new Date('AAAA-MM-DD'): o navegador lê isso como meia-noite UTC (21h do dia anterior no Brasil).
// ----------------------------------------------------------------------------

function partesDoDia(data: string | null | undefined): [number, number, number] | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(data ?? '');
  return m ? [Number(m[1]), Number(m[2]) - 1, Number(m[3])] : null;
}

export function inicioDoDiaLocal(data: string | null | undefined): Date | null {
  const p = partesDoDia(data);
  return p ? new Date(p[0], p[1], p[2], 0, 0, 0, 0) : null;
}

export function fimDoDiaLocal(data: string | null | undefined): Date | null {
  const p = partesDoDia(data);
  return p ? new Date(p[0], p[1], p[2], 23, 59, 59, 999) : null;
}

// Para campos só de data (ex.: validade da CNH): mostra o mesmo dia que veio, sem converter fuso.
export function formatarDataSemHora(data: string | null | undefined): string {
  return inicioDoDiaLocal(data)?.toLocaleDateString('pt-BR') ?? '-';
}
