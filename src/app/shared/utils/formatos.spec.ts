import { formatarMedidor, formatarMoeda, formatarNumero, unidadeMedidor } from './formatos';

describe('formatos (padrão brasileiro)', () => {
  it('moeda com ponto de milhar e vírgula decimal', () => {
    expect(formatarMoeda(1234.5)).toBe('R$ 1.234,50');
    expect(formatarMoeda(0)).toBe('R$ 0,00');
    expect(formatarMoeda(-12.5)).toBe('R$ -12,50');
    expect(formatarMoeda(null)).toBe('-');
  });

  it('número com casas fixas', () => {
    expect(formatarNumero(1234.56, 1)).toBe('1.234,6');
    expect(formatarNumero(12, 2)).toBe('12,00');
    expect(formatarNumero(undefined, 1)).toBe('-');
  });

  it('medidor com a unidade certa (horímetro = horas)', () => {
    expect(formatarMedidor(12345.6, 'hodometro')).toBe('12.345,6 km');
    expect(formatarMedidor(1200, 'horimetro')).toBe('1.200 h');
    expect(formatarMedidor(null, 'hodometro')).toBe('-');
    expect(unidadeMedidor('horimetro')).toBe('h');
    expect(unidadeMedidor(undefined)).toBe('km');
  });
});
