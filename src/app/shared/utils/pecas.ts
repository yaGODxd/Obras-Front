import { PecaRequest } from '../../interfaces/manutencao';

// Regras das peças. No modal "Nova manutenção" a lista é LOCAL: a API só recebe as peças
// quando o gestor clica em "Salvar" do modal (POST /manutencoes).
// validarPeca também vale para editar uma peça já gravada (PUT /manutencoes/pecas/{id}, no detalhe).

// Mesmas regras para adicionar e para salvar a alteração. Devolve a mensagem de erro, ou null.
export function validarPeca(peca: PecaRequest): string | null {
  if (!peca.nomePeca?.trim()) return 'Preencha o nome da peça.';
  if (!(peca.quantidade > 0)) return 'A quantidade da peça precisa ser maior que zero.';
  if (!(peca.valorUnitario >= 0)) return 'O valor unitário não pode ser negativo.';
  return null;
}

export function totalDaPeca(peca: PecaRequest): number {
  return peca.quantidade * peca.valorUnitario;
}

export function totalDasPecas(pecas: readonly PecaRequest[]): number {
  return pecas.reduce((acc, p) => acc + totalDaPeca(p), 0);
}

export function totalGeralManutencao(custoMaoObra: number | null | undefined, pecas: readonly PecaRequest[]): number {
  return (custoMaoObra ?? 0) + totalDasPecas(pecas);
}

// Substitui a peça na MESMA posição (sem criar linha nova). Devolve uma lista nova.
export function substituirPeca(pecas: readonly PecaRequest[], indice: number, peca: PecaRequest): PecaRequest[] {
  return pecas.map((p, i) => (i === indice ? { ...peca } : p));
}

export function removerPecaDaLista(pecas: readonly PecaRequest[], indice: number): PecaRequest[] {
  return pecas.filter((_, i) => i !== indice);
}

// Depois de remover a peça "removida", onde fica a peça que estava em edição?
// null = a edição deve ser cancelada (removeram justamente a que estava em edição).
export function indiceEdicaoAposRemover(emEdicao: number | null, removida: number): number | null {
  if (emEdicao === null || emEdicao === removida) return null;
  return emEdicao > removida ? emEdicao - 1 : emEdicao;
}
