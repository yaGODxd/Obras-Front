import { environment } from '../../../environments/environment';

// A API NÃO valida CPF: esta validação é só no front (conforto para o usuário).
// O CPF vai para a API só com dígitos (sem pontos e traço).

export function somenteDigitos(valor: string | null | undefined): string {
  return (valor ?? '').replace(/\D/g, '');
}

// Sempre exige 11 números (pontos e traço digitados são ignorados).
// Com "conferirDigitos" (interruptor environment.validarDigitosCpf), confere também os dois
// dígitos verificadores e recusa sequências repetidas (ex.: 111.111.111-11).
export function cpfValido(valor: string | null | undefined, conferirDigitos = environment.validarDigitosCpf): boolean {
  const cpf = somenteDigitos(valor);
  if (cpf.length !== 11) return false;
  if (!conferirDigitos) return true;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const digito = (tamanho: number): number => {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) soma += Number(cpf[i]) * (tamanho + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  return digito(9) === Number(cpf[9]) && digito(10) === Number(cpf[10]);
}

export function mensagemCpfInvalido(conferirDigitos = environment.validarDigitosCpf): string {
  return conferirDigitos
    ? 'CPF inválido. Confira os números digitados.'
    : 'O CPF precisa ter 11 números.';
}
