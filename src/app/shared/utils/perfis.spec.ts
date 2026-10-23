import { rotuloPerfil } from './perfis';

describe('rótulo do perfil', () => {
  it('rótulos dos 2 perfis', () => {
    expect(rotuloPerfil('gestor')).toBe('Gestor');
    expect(rotuloPerfil('motorista')).toBe('Motorista');
  });

  it('perfil desconhecido aparece como veio', () => {
    expect(rotuloPerfil('auditor')).toBe('auditor');
  });

  it('sem perfil fica vazio', () => {
    expect(rotuloPerfil('')).toBe('');
    expect(rotuloPerfil(null)).toBe('');
    expect(rotuloPerfil(undefined)).toBe('');
  });
});
