import { badgeStatusManutencao, badgeTipoManutencao, rotuloStatusManutencao, rotuloTipoManutencao } from './manutencoes';

describe('rótulos de manutenção', () => {
  it('status conhecidos', () => {
    expect(rotuloStatusManutencao('aberta')).toBe('Aberta');
    expect(rotuloStatusManutencao('em_andamento')).toBe('Em andamento');
    expect(rotuloStatusManutencao('concluida')).toBe('Concluída');
    expect(badgeStatusManutencao('aberta')).toBe('badge-error');
    expect(badgeStatusManutencao('em_andamento')).toBe('badge-warning');
    expect(badgeStatusManutencao('concluida')).toBe('badge-success');
  });

  it('status desconhecido aparece como veio, em cinza', () => {
    expect(rotuloStatusManutencao('cancelada')).toBe('cancelada');
    expect(badgeStatusManutencao('cancelada')).toBe('badge-ghost');
  });

  it('tipo: preventiva ou corretiva', () => {
    expect(rotuloTipoManutencao('preventiva')).toBe('Preventiva');
    expect(rotuloTipoManutencao('corretiva')).toBe('Corretiva');
    expect(badgeTipoManutencao('preventiva')).toBe('badge-info');
    expect(badgeTipoManutencao('corretiva')).toBe('badge-warning');
  });
});
