// Endereço da API. Mudar só aqui (serviços e interceptor leem deste arquivo).
export const environment = {
  apiUrl: 'https://sistema-obras-api.onrender.com',

  // CPF: desligado = só exige 11 números (fase de testes, aceita CPFs inventados).
  // Ligar (true) antes do uso real para conferir também os dígitos verificadores.
  validarDigitosCpf: false
};
