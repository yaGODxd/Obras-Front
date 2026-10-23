import { STATUS_VEICULO, badgeStatusVeiculo, rotuloStatusVeiculo } from './veiculos';

describe('status do veículo', () => {
  it('os 4 status gravados pela API', () => {
    expect(STATUS_VEICULO.map(s => s.valor)).toEqual(['disponivel', 'em_uso', 'em_manutencao', 'inativo']);
    expect(rotuloStatusVeiculo('em_manutencao')).toBe('Em manutenção');
    expect(badgeStatusVeiculo('em_manutencao')).toBe('badge-error');
    expect(rotuloStatusVeiculo('disponivel')).toBe('Disponível');
  });

  it('"manutencao" (sem "em_") não existe: aparece como veio, em cinza', () => {
    expect(rotuloStatusVeiculo('manutencao')).toBe('manutencao');
    expect(badgeStatusVeiculo('manutencao')).toBe('badge-ghost');
  });
});
