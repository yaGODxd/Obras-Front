// Campos vindos do endpoint /rastreamento/posicoes
export interface UltimaPosicao {
  diarioId: string;
  login: string;
  nomeCompleto: string;
  latitude: number;
  longitude: number;
  registradoEm: string | null;
  veiculoDescricao: string | null;
  veiculoPlaca: string | null;
  destino: string | null;
}

export interface PontoRastreamento {
  id: string;
  diarioId: string;
  latitude: number;
  longitude: number;
  velocidade: number | null;
  registradoEm: string | null;
}
