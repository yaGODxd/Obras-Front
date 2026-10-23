import { badgeStatusOcorrencia, badgeTipoOcorrencia, rotuloStatusOcorrencia, statusDaOcorrencia } from './ocorrencias';

describe('status da ocorrência', () => {
  it('rótulos e cores dos 3 status', () => {
    expect(rotuloStatusOcorrencia('pendente')).toBe('Pendente');
    expect(rotuloStatusOcorrencia('em_andamento')).toBe('Em andamento');
    expect(rotuloStatusOcorrencia('resolvida')).toBe('Resolvida');
    expect(badgeStatusOcorrencia('pendente')).toBe('badge-warning');
    expect(badgeStatusOcorrencia('em_andamento')).toBe('badge-info');
    expect(badgeStatusOcorrencia('resolvida')).toBe('badge-success');
  });

  it('status desconhecido aparece como veio, em cinza', () => {
    expect(rotuloStatusOcorrencia('arquivada')).toBe('arquivada');
    expect(badgeStatusOcorrencia('arquivada')).toBe('badge-ghost');
  });

  it('resposta antiga, sem status, conta como pendente', () => {
    expect(statusDaOcorrencia({})).toBe('pendente');
    expect(statusDaOcorrencia({ status: null })).toBe('pendente');
    expect(statusDaOcorrencia({ status: 'resolvida' })).toBe('resolvida');
  });
});

describe('tipo da ocorrência', () => {
  it('cor pelo texto do tipo', () => {
    expect(badgeTipoOcorrencia('Acidente leve')).toBe('badge-error');
    expect(badgeTipoOcorrencia('Pneu furado')).toBe('badge-info');
    expect(badgeTipoOcorrencia('Outro')).toBe('badge-neutral');
  });
});
