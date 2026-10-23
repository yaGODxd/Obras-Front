import { montarParams } from './params';

describe('montarParams', () => {
  it('codifica espaço, & e acento', () => {
    const params = montarParams({ login: 'joão silva', acao: 'A&B' });
    expect(params.get('login')).toBe('joão silva');
    expect(params.toString()).toContain('acao=A%26B');
  });

  it('não envia valores vazios ou 0 (como antes)', () => {
    expect(montarParams({ veiculoId: '', mes: 0, ano: 2026, fim: undefined }).keys()).toEqual(['ano']);
  });
});
