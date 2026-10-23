import { cpfValido, mensagemCpfInvalido, somenteDigitos } from './cpf';
import { environment } from '../../../environments/environment';

describe('CPF', () => {
  it('o interruptor vem desligado (fase de testes)', () => {
    expect(environment.validarDigitosCpf).toBe(false);
  });

  describe('modo testes (interruptor desligado): só 11 números', () => {
    it('aceita qualquer CPF com 11 números, com ou sem pontuação', () => {
      expect(cpfValido('12345678901', false)).toBe(true);
      expect(cpfValido('111.111.111-11', false)).toBe(true);
      expect(cpfValido('529.982.247-24', false)).toBe(true); // dígito errado, mas aceito neste modo
    });

    it('recusa quantidade diferente de 11 números', () => {
      expect(cpfValido('1234567890', false)).toBe(false);
      expect(cpfValido('123456789012', false)).toBe(false);
      expect(cpfValido('', false)).toBe(false);
      expect(cpfValido(null, false)).toBe(false);
    });

    it('usa o modo do interruptor quando não se informa', () => {
      expect(cpfValido('111.111.111-11')).toBe(true);
    });
  });

  describe('modo uso real (interruptor ligado): dígitos verificadores', () => {
    it('aceita CPF válido', () => {
      expect(cpfValido('529.982.247-25', true)).toBe(true);
      expect(cpfValido('11144477735', true)).toBe(true);
    });

    it('recusa dígito errado e sequência repetida', () => {
      expect(cpfValido('529.982.247-24', true)).toBe(false);
      expect(cpfValido('111.111.111-11', true)).toBe(false);
      expect(cpfValido('5299822472', true)).toBe(false);
    });
  });

  it('mensagem muda conforme o modo', () => {
    expect(mensagemCpfInvalido(false)).toBe('O CPF precisa ter 11 números.');
    expect(mensagemCpfInvalido(true)).toBe('CPF inválido. Confira os números digitados.');
  });

  it('somenteDigitos tira pontos, traço e espaços', () => {
    expect(somenteDigitos(' 529.982.247-25 ')).toBe('52998224725');
  });
});
