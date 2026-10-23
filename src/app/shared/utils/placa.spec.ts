import { normalizarPlaca, rotuloPlaca, rotuloVeiculo, SEM_PLACA, temPlaca } from './placa';

describe('placa do veículo', () => {
  const vazias = [null, undefined, '', '   ', '-', ' - '];

  it('sem placa: null, undefined, vazio, só espaços ou só hífen', () => {
    for (const p of vazias) {
      expect(temPlaca(p)).toBe(false);
      expect(rotuloPlaca(p)).toBe(SEM_PLACA);
      expect(rotuloVeiculo('Caminhão 1', p)).toBe('Caminhão 1');
      expect(normalizarPlaca(p)).toBeNull();
    }
  });

  it('normaliza igual à API: maiúsculas, sem hífen e sem espaço', () => {
    expect(normalizarPlaca('abc1d23 ')).toBe('ABC1D23');
    expect(normalizarPlaca('abc-1234')).toBe('ABC1234');
    expect(normalizarPlaca(' Abc 1D-23 ')).toBe('ABC1D23');
    expect(rotuloPlaca('abc1d23 ')).toBe('ABC1D23');
    expect(rotuloVeiculo('Caminhão 1', 'abc1d23 ')).toBe('Caminhão 1 — ABC1D23');
  });

  it('não valida o formato (máquinas e placas fora do padrão passam)', () => {
    expect(normalizarPlaca('maq 07')).toBe('MAQ07');
    expect(temPlaca('X')).toBe(true);
  });

  it('texto que aparece na tela', () => {
    expect(SEM_PLACA).toBe('Sem placa');
  });
});
