import * as L from 'leaflet';
import { PontoRastreamento } from '../../interfaces/rastreamento';
import { formatarNumero } from './formatos';
import { criarElemento } from './html';
import { PedacoTrajeto, ResultadoTrajeto, tracarTrajeto } from './trajeto';

// Tudo o que as telas repetiam para montar mapas Leaflet: satélite Esri + nomes, ícones e trajetos.

export const CENTRO_CRUZ_MACHADO: [number, number] = [-26.0078, -51.3356];

const SATELITE = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const NOMES = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';

// Cria o mapa já com o satélite e, por cima, ruas, cidades e bairros.
export function criarMapa(container: string | HTMLElement, opcoes?: L.MapOptions): L.Map {
  const mapa = L.map(container, opcoes);
  L.tileLayer(SATELITE, { attribution: 'Tiles © Esri' }).addTo(mapa);
  L.tileLayer(NOMES, { attribution: '' }).addTo(mapa);
  return mapa;
}

// Bolinha colorida com borda branca.
export function criarIconePonto(cor: string, tam = 12): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<span style="display:block;width:${tam}px;height:${tam}px;border-radius:50%;background:${cor};border:2px solid #fff;box-shadow:0 0 0 3px ${cor}40;"></span>`,
    iconSize: [tam, tam], iconAnchor: [tam / 2, tam / 2]
  });
}

// Mapa do modal de ocorrência: centrado no local, com o marcador vermelho.
export function criarMapaOcorrencia(container: HTMLElement, lat: number, lng: number): L.Map {
  const mapa = criarMapa(container).setView([lat, lng], 16);
  L.marker([lat, lng], { icon: criarIconePonto('#ef4444', 16) })
    .bindPopup('Local da ocorrência')
    .openPopup()
    .addTo(mapa);
  return mapa;
}

export interface OpcoesPontos {
  tamanhoMarco: number;   // tamanho dos marcadores de início e fim
  rotuloFim: string;      // "Posição atual" (diário aberto) ou "Fim"
}

// Unidade da "velocidade" gravada nos pontos: A CONFIRMAR com a API (m/s ou km/h).
// Enquanto vazia, o tooltip mostra o número como veio, sem unidade e sem conversão.
export const UNIDADE_VELOCIDADE = '';

// Ordem do trajeto: pela hora em que cada ponto foi gravado (empate: ordem da API).
// Se algum ponto vier sem hora, mantém a ordem da API inteira (não dá para ordenar com segurança).
export function ordenarPontos(pontos: PontoRastreamento[]): PontoRastreamento[] {
  if (pontos.some(p => !p.registradoEm)) return [...pontos];
  return pontos
    .map((p, i) => ({ p, i, t: new Date(p.registradoEm!).getTime() }))
    .sort((a, b) => a.t - b.t || a.i - b.i)
    .map(x => x.p);
}

// Texto do tooltip de cada ponto: "18/10/2026, 10:00:05 · velocidade 12,3".
export function textoDoPonto(p: PontoRastreamento): string {
  const hora = p.registradoEm ? new Date(p.registradoEm).toLocaleString('pt-BR') : 'sem horário';
  const velocidade = p.velocidade === null || p.velocidade === undefined
    ? 'sem velocidade'
    : `velocidade ${formatarNumero(p.velocidade, 1)}${UNIDADE_VELOCIDADE ? ' ' + UNIDADE_VELOCIDADE : ''}`;
  return `${hora} · ${velocidade}`;
}

// TODOS os pontos gravados, exatamente nas coordenadas da API (sem filtro, sem arredondar):
// uma bolinha pequena por ponto (tooltip com hora e velocidade) + marcadores de início (verde) e fim.
// O fim ("Posição atual" no diário aberto) é o ÚLTIMO PONTO REAL, nunca o traçado ajustado.
export function desenharPontos(mapa: L.Map, pontos: PontoRastreamento[], opcoes: OpcoesPontos): L.Layer[] {
  if (pontos.length === 0) return [];
  const camadas: L.Layer[] = [];
  for (const p of pontos) {
    const c = L.circleMarker([p.latitude, p.longitude], {
      radius: 3, color: '#1e3a5f', fillColor: CORES_TRAJETO.ponto, fillOpacity: 0.9, weight: 1
    });
    // Montado via DOM (texto, nunca HTML).
    c.bindTooltip(criarElemento('span', textoDoPonto(p)), { direction: 'top' });
    camadas.push(c.addTo(mapa));
  }
  const primeiro = pontos[0];
  const ultimo = pontos[pontos.length - 1];
  camadas.push(
    L.marker([primeiro.latitude, primeiro.longitude], { icon: criarIconePonto('#22c55e', opcoes.tamanhoMarco) })
      .bindTooltip('Início').addTo(mapa),
    L.marker([ultimo.latitude, ultimo.longitude], { icon: criarIconePonto('#1e3a5f', opcoes.tamanhoMarco) })
      .bindTooltip(opcoes.rotuloFim).addTo(mapa)
  );
  return camadas;
}

// Cores do trajeto (a legenda <app-legenda-trajeto> usa as mesmas).
export const CORES_TRAJETO = {
  ajustado: '#2563eb',   // linha pelas ruas (OSRM)
  reta: '#64748b',       // linha reta entre os pontos reais (provisória ou plano B)
  ponto: '#1d4ed8'       // pontos reais gravados
} as const;

// Linha reta que liga TODOS os pontos reais, na ordem recebida (use ordenarPontos antes).
// Tracejada: aparece enquanto o traçado pelas ruas é calculado.
export function desenharLinhaDosPontos(mapa: L.Map, pontos: PontoRastreamento[]): L.Layer[] {
  if (pontos.length < 2) return [];
  return [L.polyline(pontos.map(p => [p.latitude, p.longitude] as L.LatLngTuple),
    { color: CORES_TRAJETO.reta, weight: 2.5, opacity: 0.8, dashArray: '6 6' }).addTo(mapa)];
}

// Pedaços vindos de tracarTrajeto: pelas ruas (azul contínuo) ou plano B (reta cinza tracejada).
export function desenharPedacos(mapa: L.Map, pedacos: PedacoTrajeto[]): L.Layer[] {
  return pedacos.map(p => L.polyline(p.coordenadas, p.ajustado
    ? { color: CORES_TRAJETO.ajustado, weight: 4, opacity: 0.85 }
    : { color: CORES_TRAJETO.reta, weight: 2.5, opacity: 0.8, dashArray: '6 6' }).addTo(mapa));
}

// Situação do traçado, para a legenda: calculando, pelas ruas, ou aproximado (plano B em algum trecho).
export type SituacaoTrajeto = 'calculando' | 'ajustado' | 'aproximado';

// Trajeto de um diário num mapa. Ao desenhar:
// 1. todos os pontos reais (bolinhas, tooltip com hora e velocidade) e a linha reta provisória;
// 2. o traçado pelas ruas (OSRM) chega SOZINHO e substitui só a linha provisória;
// 3. se o OSRM falhar ou o traçado ficar grande demais, o trecho fica em linha reta e a situação é "aproximado".
// Os pontos reais ficam sempre POR CIMA das linhas. Início e "Posição atual" são pontos reais.
// Resultado atrasado (outro diário, mapa fechado) é descartado.
export class TrajetoNoMapa {
  private mapa?: L.Map;
  private pontos: PontoRastreamento[] = [];
  private camadasPontos: L.Layer[] = [];
  private camadasLinha: L.Layer[] = [];
  private geracao = 0;

  constructor(
    private opcoes: OpcoesPontos,
    private tracar: (diarioId: string, pontos: PontoRastreamento[]) => Promise<ResultadoTrajeto> = tracarTrajeto
  ) {}

  get quantidadePontos(): number { return this.pontos.length; }

  // Devolve a situação final do traçado, ou null se o resultado foi descartado (ou não há linha a traçar).
  async desenhar(mapa: L.Map, pontos: PontoRastreamento[]): Promise<SituacaoTrajeto | null> {
    this.limpar();
    const geracao = this.geracao;
    this.mapa = mapa;
    this.pontos = ordenarPontos(pontos);
    this.camadasLinha.push(...desenharLinhaDosPontos(mapa, this.pontos));
    this.camadasPontos.push(...desenharPontos(mapa, this.pontos, this.opcoes));
    if (this.pontos.length < 2) return null;

    const resultado = await this.tracar(this.pontos[0].diarioId, this.pontos);
    if (geracao !== this.geracao || this.mapa !== mapa) return null;
    // Nunca deixa o mapa sem linha: sem pedaços, fica a reta provisória.
    if (resultado.pedacos.length === 0) return 'aproximado';
    removerCamadas(mapa, this.camadasLinha);
    this.camadasLinha.push(...desenharPedacos(mapa, resultado.pedacos));
    this.trazerPontosParaFrente();
    return resultado.aproximado ? 'aproximado' : 'ajustado';
  }

  // Trajeto ao vivo (diário aberto): só redesenha se chegaram pontos novos. "sem mudança" = nada a fazer.
  // O traçado pelas ruas vem do cache (tracarTrajeto recalcula no máximo a cada 30 s, só o fim).
  async atualizar(mapa: L.Map, pontos: PontoRastreamento[]): Promise<SituacaoTrajeto | null | 'sem mudança'> {
    const novos = ordenarPontos(pontos);
    const ultimoAtual = this.pontos[this.pontos.length - 1];
    const ultimoNovo = novos[novos.length - 1];
    const igual = this.mapa === mapa && novos.length === this.pontos.length && (!ultimoNovo ||
      (ultimoAtual.latitude === ultimoNovo.latitude && ultimoAtual.longitude === ultimoNovo.longitude));
    return igual ? 'sem mudança' : this.desenhar(mapa, pontos);
  }

  limpar(): void {
    this.geracao++;
    if (this.mapa) {
      removerCamadas(this.mapa, this.camadasPontos);
      removerCamadas(this.mapa, this.camadasLinha);
    }
    this.mapa = undefined;
    this.pontos = [];
  }

  private trazerPontosParaFrente(): void {
    for (const c of this.camadasPontos) {
      if (c instanceof L.Path) c.bringToFront();
    }
  }
}

export function removerCamadas(mapa: L.Map, camadas: L.Layer[]): void {
  for (const c of camadas) { try { mapa.removeLayer(c); } catch {} }
  camadas.length = 0;
}

// Enquadra todos os pontos com uma folga de 15%.
export function enquadrarPontos(mapa: L.Map, pontos: PontoRastreamento[]): void {
  if (pontos.length === 0) return;
  mapa.fitBounds(L.latLngBounds(pontos.map(p => L.latLng(p.latitude, p.longitude))).pad(0.15));
}
