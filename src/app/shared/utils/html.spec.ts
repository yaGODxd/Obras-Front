import { criarElemento, fotoBase64Valida } from './html';

describe('criarElemento', () => {
  it('mostra HTML malicioso como texto, sem criar elementos', () => {
    const ataque = '<img src=x onerror="alert(1)"><script>alert(2)</script>';
    const el = criarElemento('p', ataque);

    expect(el.textContent).toBe(ataque);
    expect(el.children.length).toBe(0);
    expect(el.querySelector('img, script')).toBeNull();
  });

  it('aplica tag e estilo', () => {
    const el = criarElemento('span', 'Olá', 'font-size: 12px');

    expect(el.tagName).toBe('SPAN');
    expect(el.getAttribute('style')).toBe('font-size: 12px');
  });
});

describe('fotoBase64Valida', () => {
  it('aceita base64 válido', () => {
    expect(fotoBase64Valida('iVBORw0KGgo=')).toBe(true);
    expect(fotoBase64Valida('/9j/4AAQSkZJRg+a')).toBe(true);
  });

  it('recusa vazio e nulo', () => {
    expect(fotoBase64Valida(null)).toBe(false);
    expect(fotoBase64Valida(undefined)).toBe(false);
    expect(fotoBase64Valida('')).toBe(false);
  });

  it('recusa texto que poderia sair do atributo src', () => {
    expect(fotoBase64Valida('abc" onerror="alert(1)')).toBe(false);
    expect(fotoBase64Valida('abc><script>')).toBe(false);
  });
});
