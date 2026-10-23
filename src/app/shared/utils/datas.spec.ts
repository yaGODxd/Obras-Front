import { normalizarDatasApi, inicioDoDiaLocal, fimDoDiaLocal, formatarDataSemHora } from './datas';

// Simula o que a API envia para um instante local: o horário UTC, sem "Z" e sem milissegundos.
function comoApiEnvia(instanteLocal: Date): string {
  return instanteLocal.toISOString().slice(0, 19);
}

describe('normalizarDatasApi', () => {
  it('data e hora sem fuso ganham "Z" (com e sem segundos/fração)', () => {
    expect(normalizarDatasApi('2026-10-18T13:08:00')).toBe('2026-10-18T13:08:00Z');
    expect(normalizarDatasApi('2026-10-18T13:08')).toBe('2026-10-18T13:08Z');
    expect(normalizarDatasApi('2026-10-18T13:08:00.123')).toBe('2026-10-18T13:08:00.123Z');
    expect(normalizarDatasApi('2026-10-18T13:08:00.123456')).toBe('2026-10-18T13:08:00.123456Z');
  });

  it('o resultado é lido como UTC', () => {
    const lido = new Date(normalizarDatasApi('2026-10-18T13:08:00'));
    expect(lido.getTime()).toBe(Date.UTC(2026, 9, 18, 13, 8, 0));
  });

  it('strings com Z ou offset ficam iguais', () => {
    for (const valor of ['2026-10-18T13:08:00Z', '2026-10-18T13:08:00+00:00', '2026-10-18T10:08:00-03:00', '2026-10-18T13:08:00.5Z']) {
      expect(normalizarDatasApi(valor)).toBe(valor);
    }
  });

  it('strings só com data ficam iguais', () => {
    expect(normalizarDatasApi('2027-05-10')).toBe('2027-05-10');
  });

  it('texto livre que não é data fica igual', () => {
    for (const valor of ['Pane elétrica', '', 'Saiu 2026-10-18T13:08:00', '2026-10-18T13:08:00 e voltou', 'ABC-1234']) {
      expect(normalizarDatasApi(valor)).toBe(valor);
    }
  });

  it('null, números e booleanos ficam iguais', () => {
    expect(normalizarDatasApi(null)).toBeNull();
    expect(normalizarDatasApi(42)).toBe(42);
    expect(normalizarDatasApi(true)).toBe(true);
    expect(normalizarDatasApi({ medidor: 1234.5, placa: null })).toEqual({ medidor: 1234.5, placa: null });
  });

  it('percorre objetos aninhados e arrays', () => {
    const resposta = [{
      id: 'd1',
      abertoEm: '2026-10-18T13:08:00',
      fechadoEm: null,
      validadeCnh: '2027-05-10',
      pecas: [{ nome: 'Filtro', registradoEm: '2026-10-19T02:00:00' }],
      historico: ['2026-10-18T13:08:00', '2026-10-18T14:00:00Z'],
    }];

    expect(normalizarDatasApi(resposta)).toEqual([{
      id: 'd1',
      abertoEm: '2026-10-18T13:08:00Z',
      fechadoEm: null,
      validadeCnh: '2027-05-10',
      pecas: [{ nome: 'Filtro', registradoEm: '2026-10-19T02:00:00Z' }],
      historico: ['2026-10-18T13:08:00Z', '2026-10-18T14:00:00Z'],
    }]);
  });

  it('não altera o objeto original (devolve cópia)', () => {
    const original = { abertoEm: '2026-10-18T13:08:00' };
    normalizarDatasApi(original);
    expect(original.abertoEm).toBe('2026-10-18T13:08:00');
  });

  it('campos da lista de exceção ficam como vieram', () => {
    const resposta = { abertoEm: '2026-10-18T13:08:00', horaLocal: '2026-10-18T10:08:00' };
    expect(normalizarDatasApi(resposta, ['horaLocal'])).toEqual({
      abertoEm: '2026-10-18T13:08:00Z',
      horaLocal: '2026-10-18T10:08:00',
    });
  });
});

describe('inicioDoDiaLocal / fimDoDiaLocal', () => {
  it('criam o início e o fim do dia no horário local', () => {
    const inicio = inicioDoDiaLocal('2026-10-18')!;
    const fim = fimDoDiaLocal('2026-10-18')!;

    expect([inicio.getFullYear(), inicio.getMonth(), inicio.getDate(), inicio.getHours(), inicio.getMinutes()]).toEqual([2026, 9, 18, 0, 0]);
    expect([fim.getDate(), fim.getHours(), fim.getMinutes(), fim.getSeconds(), fim.getMilliseconds()]).toEqual([18, 23, 59, 59, 999]);
  });

  it('valor vazio ou inválido devolve null (filtro desligado)', () => {
    expect(inicioDoDiaLocal('')).toBeNull();
    expect(fimDoDiaLocal(null)).toBeNull();
    expect(inicioDoDiaLocal('18/10/2026')).toBeNull();
  });

  it('virada de dia: registro às 23:30 local entra em "até 18/10" (em Brasília a API manda 02:30 do dia 19)', () => {
    const registro = new Date(normalizarDatasApi(comoApiEnvia(new Date(2026, 9, 18, 23, 30))));

    expect(registro <= fimDoDiaLocal('2026-10-18')!).toBe(true);
    expect(registro >= inicioDoDiaLocal('2026-10-18')!).toBe(true);
    expect(registro >= inicioDoDiaLocal('2026-10-19')!).toBe(false);
  });

  it('virada de mês: registro às 22:00 de 31/10 local continua em outubro', () => {
    const registro = new Date(normalizarDatasApi(comoApiEnvia(new Date(2026, 9, 31, 22, 0))));

    expect(registro.getMonth()).toBe(9);
    expect(registro.getDate()).toBe(31);
  });
});

describe('formatarDataSemHora', () => {
  it('mostra o mesmo dia que veio, sem voltar um dia', () => {
    expect(formatarDataSemHora('2027-05-10')).toBe('10/05/2027');
  });

  it('vazio vira traço', () => {
    expect(formatarDataSemHora(null)).toBe('-');
  });
});
