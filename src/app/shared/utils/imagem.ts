// Regras para fotos enviadas à API (que não impõe limite). As imagens vão como o usuário enviou: sem redução.
export const TAMANHO_MAXIMO_FOTO = 5 * 1024 * 1024; // 5 MB
export const TIPOS_FOTO = ['image/jpeg', 'image/png', 'image/webp'];

// Devolve a mensagem de erro, ou null se o arquivo pode ser usado.
export function validarArquivoFoto(arquivo: File): string | null {
  if (!TIPOS_FOTO.includes(arquivo.type)) return 'Formato não aceito. Use uma imagem JPEG, PNG ou WebP.';
  if (arquivo.size > TAMANHO_MAXIMO_FOTO) return 'A imagem passa de 5 MB. Escolha uma imagem menor.';
  return null;
}

// Lê o arquivo como base64 sem alterar (devolve só a parte depois de "base64,").
export function lerComoBase64(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result).split(',')[1] ?? '');
    leitor.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
    leitor.readAsDataURL(arquivo);
  });
}

// Foto de perfil que a API manda -> endereço para o <img>. Sem foto: null.
// Pode vir só o base64 ou já com "data:image/...;base64,", e com espaços/quebras de linha no meio
// (base64 quebrado em linhas): tira todos os espaços e, se não começar com "data:", prefixa como JPEG.
// Se mesmo assim a imagem não abrir, o <app-avatar> mostra a inicial (evento error).
export function urlDaFoto(foto: string | null | undefined): string | null {
  const limpa = (foto ?? '').replace(/\s+/g, '');
  if (!limpa) return null;
  return limpa.startsWith('data:') ? limpa : 'data:image/jpeg;base64,' + limpa;
}
