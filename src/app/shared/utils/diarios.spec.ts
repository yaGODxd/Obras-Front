import { avisoPendentes, badgeStatusDiario, diariosParaRelatorio, rotuloCurtoStatusDiario, rotuloStatusDiario } from './diarios';

describe('status do diário', () => {
  it('rótulos dos 3 status', () => {
    expect(rotuloStatusDiario('aberto')).toBe('Aberto');
    expect(rotuloStatusDiario('fechado')).toBe('Pendente de assinatura');
    expect(rotuloStatusDiario('assinado')).toBe('Assinado');
  });

  it('rótulos curtos para tabelas', () => {
    expect(rotuloCurtoStatusDiario('aberto')).toBe('Aberto');
    expect(rotuloCurtoStatusDiario('fechado')).toBe('Pendente');
    expect(rotuloCurtoStatusDiario('assinado')).toBe('Assinado');
    expect(rotuloCurtoStatusDiario('cancelado')).toBe('cancelado');
  });

  it('cores dos 3 status', () => {
    expect(badgeStatusDiario('aberto')).toBe('badge-warning');
    expect(badgeStatusDiario('fechado')).toBe('badge-info');
    expect(badgeStatusDiario('assinado')).toBe('badge-success');
  });

  it('status desconhecido aparece como veio, em cinza', () => {
    expect(rotuloStatusDiario('cancelado')).toBe('cancelado');
    expect(badgeStatusDiario('cancelado')).toBe('badge-ghost');
  });
});

describe('diariosParaRelatorio', () => {
  const lista = [
    { id: '1', status: 'aberto' },
    { id: '2', status: 'fechado' },
    { id: '3', status: 'assinado' },
    { id: '4', status: 'fechado' },
    { id: '5', status: 'outro' },
  ];

  it('inclui fechados e assinados, nunca abertos, e conta os pendentes', () => {
    const r = diariosParaRelatorio(lista, false);
    expect(r.diarios.map(d => d.id)).toEqual(['2', '3', '4']);
    expect(r.pendentes).toBe(2);
  });

  it('"Somente assinados" deixa só os assinados, mas ainda informa os pendentes', () => {
    const r = diariosParaRelatorio(lista, true);
    expect(r.diarios.map(d => d.id)).toEqual(['3']);
    expect(r.pendentes).toBe(2);
  });

  it('aviso de pendentes', () => {
    expect(avisoPendentes(0, false)).toBe('');
    expect(avisoPendentes(2, false)).toBe('2 diário(s) pendente(s) de assinatura no período.');
    expect(avisoPendentes(2, true)).toBe('2 diário(s) pendente(s) de assinatura no período (não incluídos neste relatório).');
  });
});
