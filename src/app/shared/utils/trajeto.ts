// Traçado do trajeto de um diário pelas ruas, com o serviço /match do OSRM público (feito para trilhas de GPS).
// Aparece sozinho ao abrir o trajeto; os pontos reais são desenhados por cima (ver TrajetoNoMapa em mapa.ts).
//
// O servidor público é de DEMONSTRAÇÃO: poucas chamadas, uma por vez, com intervalo.
// Os pontos de GPS dos motoristas são enviados a esse servidor de terceiros.

export interface PontoGps {
  latitude: number;
  longitude: number;
  // Hora da gravação (vai como timestamps para o OSRM, se todos os pontos do bloco tiverem).
  registradoEm?: string | null;
}

// [latitude, longitude]: formato que o Leaflet aceita direto em L.polyline.
export type Coordenada = [number, number];
export type Segmento = Coordenada[];

// Um pedaço da linha: "ajustado" = pelas ruas (OSRM); senão, linha reta entre os pontos reais (plano B).
export interface PedacoTrajeto {
  coordenadas: Segmento;
  ajustado: boolean;
}

export interface ResultadoTrajeto {
  pedacos: PedacoTrajeto[];
  // true se algum bloco caiu no plano B (OSRM falhou ou o traçado ficou grande demais).
  aproximado: boolean;
}

export const CONFIG_TRAJETO = {
  url: 'https://router.project-osrm.org/match/v1/driving/',
  tamanhoBloco: 100,          // limite do OSRM público por pedido
  distanciaMinimaM: 15,       // pontos mais próximos que isso não vão ao OSRM (os reais continuam no mapa)
  raioM: 30,                  // tolerância do GPS (radiuses), por ponto
  intervaloMs: 1000,          // espera entre chamadas
  timeoutMs: 10000,           // tempo máximo de cada chamada
  intervaloRecalculoMs: 30000, // diário ao vivo: no máximo um recálculo a cada 30 s
  razaoMaxima: 1.5,           // traçado ajustado maior que 1,5 x a linha dos pontos reais = suspeito
  folgaRazaoM: 100,           // ...e pelo menos 100 m a mais (evita falso alarme com o veículo parado)
  maxTrajetosEmMemoria: 30
};

export interface DependenciasTrajeto {
  buscar: (url: string, init: RequestInit) => Promise<Response>;
  esperar: (ms: number) => Promise<void>;
  agora?: () => number;
}

const DEPENDENCIAS_PADRAO: DependenciasTrajeto = {
  buscar: (url, init) => fetch(url, init),
  esperar: ms => new Promise(resolve => setTimeout(resolve, ms)),
  agora: () => Date.now()
};

interface ResultadoBloco {
  pedacos: PedacoTrajeto[];
  aproximado: boolean;
  // Falha de rede/servidor (pode dar certo depois): não é reaproveitado no próximo cálculo.
  falhou: boolean;
}

// Guardado por diário, enquanto a página estiver aberta.
interface Entrada {
  assinatura: string;          // muda quando chegam pontos novos
  blocos: PontoGps[][];
  resultados: Promise<ResultadoBloco[]>;
  calculadoEm: number;
}

const cache = new Map<string, Entrada>();

export function limparCacheTrajetos(): void {
  cache.clear();
}

// "diarioId" identifica o trajeto. Mesmos pontos: devolve o guardado. Pontos novos (diário ao vivo):
// recalcula no máximo a cada 30 s e só os blocos do fim (os blocos completos já calculados são reaproveitados).
export function tracarTrajeto(
  diarioId: string,
  pontos: PontoGps[],
  deps: DependenciasTrajeto = DEPENDENCIAS_PADRAO
): Promise<ResultadoTrajeto> {
  const filtrados = filtrarPontosProximos(pontos, CONFIG_TRAJETO.distanciaMinimaM);
  if (filtrados.length < 2) return Promise.resolve({ pedacos: [], aproximado: false });

  const agora = (deps.agora ?? Date.now)();
  const ultimo = filtrados[filtrados.length - 1];
  const assinatura = `${filtrados.length}|${ultimo.latitude},${ultimo.longitude}`;
  const anterior = cache.get(diarioId);
  if (anterior && (anterior.assinatura === assinatura || agora - anterior.calculadoEm < CONFIG_TRAJETO.intervaloRecalculoMs)) {
    return juntar(anterior.resultados);
  }

  const blocos = dividirEmBlocos(filtrados, CONFIG_TRAJETO.tamanhoBloco);
  const resultados = calcular(blocos, anterior, deps);
  cache.delete(diarioId);
  cache.set(diarioId, { assinatura, blocos, resultados, calculadoEm: agora });
  if (cache.size > CONFIG_TRAJETO.maxTrajetosEmMemoria) {
    const maisAntigo = cache.keys().next().value;
    if (maisAntigo !== undefined) cache.delete(maisAntigo);
  }
  return juntar(resultados);
}

async function juntar(resultados: Promise<ResultadoBloco[]>): Promise<ResultadoTrajeto> {
  const blocos = await resultados;
  return { pedacos: blocos.flatMap(b => b.pedacos), aproximado: blocos.some(b => b.aproximado) };
}

async function calcular(blocos: PontoGps[][], anterior: Entrada | undefined, deps: DependenciasTrajeto): Promise<ResultadoBloco[]> {
  const antigos = anterior ? await anterior.resultados : [];
  const resultados: ResultadoBloco[] = [];
  let chamou = false;
  for (let i = 0; i < blocos.length; i++) {
    const antigo = antigos[i];
    if (anterior && antigo && !antigo.falhou && blocoCompletoIgual(anterior.blocos[i], blocos[i])) {
      resultados.push(antigo);
      continue;
    }
    if (chamou) await deps.esperar(CONFIG_TRAJETO.intervaloMs);
    chamou = true;
    resultados.push(await casarBloco(blocos[i], deps));
  }
  return resultados;
}

// Bloco já cheio (100 pontos) com os mesmos pontos: o resultado não muda.
function blocoCompletoIgual(a: PontoGps[] | undefined, b: PontoGps[]): boolean {
  if (!a || a.length !== CONFIG_TRAJETO.tamanhoBloco || a.length !== b.length) return false;
  const igual = (p: PontoGps, q: PontoGps) => p.latitude === q.latitude && p.longitude === q.longitude;
  return igual(a[0], b[0]) && igual(a[a.length - 1], b[b.length - 1]);
}

// Plano B do bloco: linha reta entre os pontos reais. Usado se o OSRM falhar (code diferente de "Ok",
// 429, timeout, sem rede) ou se o traçado ajustado ficar grande demais em relação aos pontos reais.
async function casarBloco(bloco: PontoGps[], deps: DependenciasTrajeto): Promise<ResultadoBloco> {
  const linhaReta = (falhou: boolean): ResultadoBloco => ({
    pedacos: [{ coordenadas: bloco.map(p => [p.latitude, p.longitude]), ajustado: false }],
    aproximado: true,
    falhou
  });
  const controle = new AbortController();
  const timer = setTimeout(() => controle.abort(), CONFIG_TRAJETO.timeoutMs);
  try {
    const resposta = await deps.buscar(montarUrl(bloco), { signal: controle.signal });
    if (!resposta.ok) return linhaReta(true);
    const segmentos = lerMatchings(await resposta.json());
    if (segmentos.length === 0) return linhaReta(true);
    const ajustado = segmentos.reduce((soma, s) => soma + comprimentoMetros(s.map(([latitude, longitude]) => ({ latitude, longitude }))), 0);
    const real = comprimentoMetros(bloco);
    if (ajustado > real * CONFIG_TRAJETO.razaoMaxima && ajustado - real > CONFIG_TRAJETO.folgaRazaoM) return linhaReta(false);
    return { pedacos: segmentos.map(coordenadas => ({ coordenadas, ajustado: true })), aproximado: false, falhou: false };
  } catch {
    return linhaReta(true);
  } finally {
    clearTimeout(timer);
  }
}

// Coordenadas na ordem longitude,latitude; um raio por ponto; timestamps em segundos desde 1970
// só se TODOS os pontos do bloco tiverem hora e ela sempre aumentar (exigência do OSRM).
export function montarUrl(bloco: PontoGps[]): string {
  const coordenadas = bloco.map(p => `${p.longitude},${p.latitude}`).join(';');
  const raios = bloco.map(() => CONFIG_TRAJETO.raioM).join(';');
  let url = `${CONFIG_TRAJETO.url}${coordenadas}?overview=full&geometries=geojson&steps=false&gaps=split&tidy=true&radiuses=${raios}`;
  const tempos = timestampsDoBloco(bloco);
  if (tempos) url += `&timestamps=${tempos.join(';')}`;
  return url;
}

export function timestampsDoBloco(bloco: PontoGps[]): number[] | null {
  const tempos: number[] = [];
  for (const p of bloco) {
    const ms = p.registradoEm ? new Date(p.registradoEm).getTime() : NaN;
    if (Number.isNaN(ms)) return null;
    const s = Math.floor(ms / 1000);
    if (tempos.length > 0 && s <= tempos[tempos.length - 1]) return null;
    tempos.push(s);
  }
  return tempos;
}

interface RespostaMatch {
  code?: unknown;
  matchings?: { geometry?: { coordinates?: [number, number][] } }[];
}

// Com gaps=split, cada "matching" é um pedaço contínuo do trajeto. GeoJSON vem [lng, lat].
function lerMatchings(dados: unknown): Segmento[] {
  const resposta = dados as RespostaMatch | null;
  if (!resposta || resposta.code !== 'Ok' || !Array.isArray(resposta.matchings)) return [];
  return resposta.matchings
    .map(m => (m.geometry?.coordinates ?? []).map(([lng, lat]): Coordenada => [lat, lng]))
    .filter(seg => seg.length >= 2);
}

// Descarta pontos repetidos ou a menos de "minMetros" do último mantido. O último ponto da
// trilha (posição atual) sempre fica. Só para o pedido ao OSRM: o mapa mostra todos os pontos.
export function filtrarPontosProximos<T extends PontoGps>(pontos: T[], minMetros: number): T[] {
  if (pontos.length === 0) return [];
  const resultado = [pontos[0]];
  for (let i = 1; i < pontos.length; i++) {
    if (distanciaMetros(resultado[resultado.length - 1], pontos[i]) >= minMetros) resultado.push(pontos[i]);
  }
  const ultimo = pontos[pontos.length - 1];
  if (resultado[resultado.length - 1] !== ultimo) {
    if (resultado.length > 1) resultado[resultado.length - 1] = ultimo;
    else if (distanciaMetros(resultado[0], ultimo) > 0) resultado.push(ultimo);
  }
  return resultado;
}

// Blocos de até "tamanho" pontos; cada bloco começa no último ponto do anterior (1 de sobreposição).
export function dividirEmBlocos<T>(pontos: T[], tamanho: number): T[][] {
  if (pontos.length <= tamanho) return [pontos];
  const blocos: T[][] = [];
  for (let inicio = 0; inicio < pontos.length - 1; inicio += tamanho - 1) {
    blocos.push(pontos.slice(inicio, inicio + tamanho));
  }
  return blocos;
}

export function comprimentoMetros(pontos: PontoGps[]): number {
  let total = 0;
  for (let i = 1; i < pontos.length; i++) total += distanciaMetros(pontos[i - 1], pontos[i]);
  return total;
}

export function distanciaMetros(a: PontoGps, b: PontoGps): number {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLon = (b.longitude - a.longitude) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
