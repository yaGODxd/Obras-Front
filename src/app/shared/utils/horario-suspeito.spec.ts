import { AVISO_HORARIO_SUSPEITO, ehHorarioSuspeito, explicacaoSuspeita, motivosSuspeita } from './horario-suspeito';

describe('horário suspeito', () => {
  it('só é suspeito quando a API diz true', () => {
    expect(ehHorarioSuspeito({ horarioSuspeito: true, motivoSuspeita: 'HORARIO_FUTURO' })).toBe(true);
    expect(ehHorarioSuspeito({ horarioSuspeito: false })).toBe(false);
  });

  it('resposta antiga, sem o campo, conta como normal e não tem motivos', () => {
    expect(ehHorarioSuspeito({})).toBe(false);
    expect(motivosSuspeita({})).toEqual([]);
    expect(explicacaoSuspeita({})).toBe('');
  });

  it('um texto em português para cada um dos 6 códigos', () => {
    const codigos = ['HORARIO_FUTURO', 'HORARIO_ANTIGO', 'DESVIO_RELOGIO', 'FORA_DA_JANELA_DIARIO', 'FORA_DA_JANELA_TURNO', 'COMBOIO_SEM_DIARIO'];
    for (const c of codigos) {
      const [texto] = motivosSuspeita({ horarioSuspeito: true, motivoSuspeita: c });
      expect(texto).not.toBe(c);
      expect(texto.length).toBeGreaterThan(10);
    }
  });

  it('vários códigos separados por vírgula, na ordem, com espaços ignorados', () => {
    expect(motivosSuspeita({ horarioSuspeito: true, motivoSuspeita: 'HORARIO_FUTURO, DESVIO_RELOGIO' })).toEqual([
      'Horário do celular está no futuro.',
      'Relógio do celular estava mais de 5 min diferente do servidor.',
    ]);
  });

  it('código desconhecido aparece cru', () => {
    expect(motivosSuspeita({ horarioSuspeito: true, motivoSuspeita: 'HORARIO_FUTURO,NOVO_MOTIVO' }))
      .toEqual(['Horário do celular está no futuro.', 'NOVO_MOTIVO']);
  });

  it('suspeito sem motivo: texto geral', () => {
    expect(motivosSuspeita({ horarioSuspeito: true })).toEqual([AVISO_HORARIO_SUSPEITO]);
    expect(motivosSuspeita({ horarioSuspeito: true, motivoSuspeita: ' , ' })).toEqual([AVISO_HORARIO_SUSPEITO]);
  });

  it('motivo preenchido mas horarioSuspeito false: não mostra nada', () => {
    expect(motivosSuspeita({ horarioSuspeito: false, motivoSuspeita: 'HORARIO_FUTURO' })).toEqual([]);
  });

  it('explicação numa linha só', () => {
    expect(explicacaoSuspeita({ horarioSuspeito: true, motivoSuspeita: 'HORARIO_ANTIGO,COMBOIO_SEM_DIARIO' }))
      .toBe('Enviado mais de 7 dias depois do horário registrado. Comboio registrado por motorista que não dirigia um comboio nesse horário.');
  });
});
