import { badgeCombustivel, somarAbastecimentos } from './abastecimentos';
import { badgeTipoOcorrencia } from './ocorrencias';

describe('cores dos badges', () => {
  it('combustível (sem diferenciar maiúsculas)', () => {
    expect(badgeCombustivel('Diesel S10')).toBe('badge-warning');
    expect(badgeCombustivel('GASOLINA')).toBe('badge-error');
    expect(badgeCombustivel('Etanol')).toBe('badge-success');
    expect(badgeCombustivel('GNV')).toBe('badge-info');
    expect(badgeCombustivel('Arla 32')).toBe('badge-neutral');
  });

  it('tipo de ocorrência', () => {
    expect(badgeTipoOcorrencia('Acidente')).toBe('badge-error');
    expect(badgeTipoOcorrencia('Pane mecânica')).toBe('badge-warning');
    expect(badgeTipoOcorrencia('Pneu furado')).toBe('badge-info');
    expect(badgeTipoOcorrencia('Falta de combustível')).toBe('badge-warning');
    expect(badgeTipoOcorrencia('Outro')).toBe('badge-neutral');
  });
});

describe('somarAbastecimentos', () => {
  it('soma litros e valor', () => {
    expect(somarAbastecimentos([{ litros: 50, valorTotal: 300 }, { litros: 20.5, valorTotal: 123.5 }])).toEqual({ litros: 70.5, valor: 423.5 });
  });

  it('lista vazia dá zero', () => {
    expect(somarAbastecimentos([])).toEqual({ litros: 0, valor: 0 });
  });
});
