import { lerComoBase64, urlDaFoto, validarArquivoFoto } from './imagem';

function arquivo(tipo: string, tamanhoBytes: number): File {
  const f = new File(['x'], 'foto', { type: tipo });
  Object.defineProperty(f, 'size', { value: tamanhoBytes });
  return f;
}

describe('validarArquivoFoto', () => {
  it('aceita JPEG, PNG e WebP de até 5 MB', () => {
    expect(validarArquivoFoto(arquivo('image/jpeg', 1000))).toBeNull();
    expect(validarArquivoFoto(arquivo('image/png', 5 * 1024 * 1024))).toBeNull();
    expect(validarArquivoFoto(arquivo('image/webp', 10))).toBeNull();
  });

  it('recusa acima de 5 MB', () => {
    expect(validarArquivoFoto(arquivo('image/jpeg', 5 * 1024 * 1024 + 1))).toContain('5 MB');
  });

  it('recusa outros formatos', () => {
    expect(validarArquivoFoto(arquivo('image/gif', 10))).toContain('Formato não aceito');
    expect(validarArquivoFoto(arquivo('application/pdf', 10))).toContain('Formato não aceito');
  });
});

describe('lerComoBase64', () => {
  it('devolve o arquivo original em base64, sem alterar', async () => {
    const original = new File([new Uint8Array([1, 2, 3, 250])], 'foto.png', { type: 'image/png' });
    expect(await lerComoBase64(original)).toBe(btoa(String.fromCharCode(1, 2, 3, 250)));
  });
});

describe('urlDaFoto', () => {
  it('monta o endereço da foto em base64; sem foto, null', () => {
    expect(urlDaFoto('QUJD')).toBe('data:image/jpeg;base64,QUJD');
    expect(urlDaFoto(null)).toBeNull();
    expect(urlDaFoto('')).toBeNull();
  });

  it('tira espaços e quebras de linha (base64 quebrado em linhas)', () => {
    expect(urlDaFoto('QUJD\nREVG\r\nR0hJ')).toBe('data:image/jpeg;base64,QUJDREVGR0hJ');
    expect(urlDaFoto('  QUJD REVG \t')).toBe('data:image/jpeg;base64,QUJDREVG');
  });

  it('já com "data:": usa como veio (sem prefixar de novo), também limpando quebras', () => {
    expect(urlDaFoto('data:image/png;base64,UE5H')).toBe('data:image/png;base64,UE5H');
    expect(urlDaFoto('data:image/png;base64,UE5H\nSUhE')).toBe('data:image/png;base64,UE5HSUhE');
    expect(urlDaFoto(' \n data:image/webp;base64,V0VC')).toBe('data:image/webp;base64,V0VC');
  });

  it('só espaços ou quebras de linha: sem foto', () => {
    expect(urlDaFoto('   ')).toBeNull();
    expect(urlDaFoto('\n\r\n')).toBeNull();
    expect(urlDaFoto(undefined)).toBeNull();
  });
});
