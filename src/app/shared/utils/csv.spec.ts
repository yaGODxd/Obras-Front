import { dataHoraCsv, fixo, montarCsv, numero, texto } from './csv';

describe('montarCsv', () => {
  it('usa ";" entre colunas e \\r\\n entre linhas', () => {
    expect(montarCsv(['A', 'B'], [[texto('x'), texto('y')]])).toBe('A;B\r\nx;y');
  });

  it('números com vírgula decimal, sem prefixo (negativo continua número)', () => {
    const csv = montarCsv(['N'], [[numero(1234.56)], [numero(-12.5)], [numero(10, 2)], [numero(null)]]);
    expect(csv.split('\r\n').slice(1)).toEqual(['1234,56', '-12,5', '10,00', '']);
  });

  it('texto digitado que começa com = + - @ ganha o prefixo \' (proteção contra fórmula)', () => {
    const csv = montarCsv(['T'], [[texto('=SOMA(A1)')], [texto('+55 41')], [texto('-x')], [texto('@cmd')], [texto('Centro')]]);
    expect(csv.split('\r\n').slice(1)).toEqual(["'=SOMA(A1)", "'+55 41", "'-x", "'@cmd", 'Centro']);
  });

  it('valores fixos do sistema não recebem o prefixo', () => {
    expect(montarCsv(['F'], [[fixo('-')]])).toBe('F\r\n-');
  });

  it('coloca aspas (e duplica as internas) quando há ";", aspas ou quebra de linha', () => {
    const csv = montarCsv(['T'], [[texto('a;b')], [texto('disse "oi"')], [texto('linha1\nlinha2')]]);
    expect(csv.split('\r\n').slice(1).join('|')).toBe('"a;b"|"disse ""oi"""|"linha1\nlinha2"');
  });

  it('nulo vira célula vazia', () => {
    expect(montarCsv(['T'], [[texto(null)]])).toBe('T\r\n');
  });
});

describe('dataHoraCsv', () => {
  it('formata dd/MM/aaaa HH:mm no horário local', () => {
    const local = new Date(2026, 9, 18, 8, 5);
    expect(dataHoraCsv(local.toISOString())).toBe('18/10/2026 08:05');
  });

  it('vazio ou inválido vira célula vazia', () => {
    expect(dataHoraCsv(null)).toBe('');
    expect(dataHoraCsv('não é data')).toBe('');
  });
});
