// Rótulos do perfil do usuário na tela. Só exibição: a API e as comparações usam 'gestor' e 'motorista'.

const ROTULOS: Record<string, string> = {
  gestor: 'Gestor',
  motorista: 'Motorista',
};

// Perfil desconhecido aparece como veio da API.
export function rotuloPerfil(perfil: string | null | undefined): string {
  if (!perfil) return '';
  return ROTULOS[perfil] ?? perfil;
}
