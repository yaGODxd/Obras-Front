import { PecaRequest } from '../../interfaces/manutencao';
import {
  indiceEdicaoAposRemover, removerPecaDaLista, substituirPeca, totalDaPeca, totalDasPecas,
  totalGeralManutencao, validarPeca
} from './pecas';

const peca = (nomePeca: string, quantidade: number, valorUnitario: number): PecaRequest =>
  ({ nomePeca, codigoPeca: null, marcaPeca: null, quantidade, valorUnitario });

describe('peças da manutenção', () => {
  it('validação: nome, quantidade > 0 e valor não negativo (mesmas mensagens de antes)', () => {
    expect(validarPeca(peca('  ', 1, 10))).toBe('Preencha o nome da peça.');
    expect(validarPeca(peca('Filtro', 0, 10))).toBe('A quantidade da peça precisa ser maior que zero.');
    expect(validarPeca(peca('Filtro', 1, -1))).toBe('O valor unitário não pode ser negativo.');
    expect(validarPeca(peca('Filtro', 1, 0))).toBeNull();
  });

  it('totais: da peça, das peças e geral (com mão de obra)', () => {
    const lista = [peca('Filtro', 2, 25.5), peca('Óleo', 4, 30)];
    expect(totalDaPeca(lista[0])).toBe(51);
    expect(totalDasPecas(lista)).toBe(171);
    expect(totalGeralManutencao(100, lista)).toBe(271);
    expect(totalGeralManutencao(null, [])).toBe(0);
  });

  it('substituir mantém a posição e não cria linha nova', () => {
    const lista = [peca('A', 1, 1), peca('B', 1, 1), peca('C', 1, 1)];
    const nova = substituirPeca(lista, 1, peca('B2', 3, 5));

    expect(nova.map(p => p.nomePeca)).toEqual(['A', 'B2', 'C']);
    expect(lista[1].nomePeca).toBe('B'); // a lista original não é alterada
  });

  it('remover tira só a peça escolhida', () => {
    const lista = [peca('A', 1, 1), peca('B', 1, 1), peca('C', 1, 1)];
    expect(removerPecaDaLista(lista, 0).map(p => p.nomePeca)).toEqual(['B', 'C']);
  });

  it('edição depois de remover: cancela se removeu a que estava em edição; senão, acompanha a peça', () => {
    expect(indiceEdicaoAposRemover(1, 1)).toBeNull();   // removeu a que estava em edição
    expect(indiceEdicaoAposRemover(2, 0)).toBe(1);      // removeu uma antes: a posição anda
    expect(indiceEdicaoAposRemover(0, 2)).toBe(0);      // removeu uma depois: nada muda
    expect(indiceEdicaoAposRemover(null, 0)).toBeNull(); // não havia edição
  });
});
