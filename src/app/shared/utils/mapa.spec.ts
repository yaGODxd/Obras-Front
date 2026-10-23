import * as L from 'leaflet';
import { PontoRastreamento } from '../../interfaces/rastreamento';
import {
  CENTRO_CRUZ_MACHADO, TrajetoNoMapa, criarIconePonto, criarMapa, criarMapaOcorrencia, desenharLinhaDosPontos,
  desenharPedacos, desenharPontos, ordenarPontos, removerCamadas, textoDoPonto, CORES_TRAJETO
} from './mapa';
import { ResultadoTrajeto } from './trajeto';

const ponto = (latitude: number, longitude: number, registradoEm: string | null = null, velocidade: number | null = null): PontoRastreamento =>
  ({ id: `${latitude},${longitude},${registradoEm}`, diarioId: 'd1', latitude, longitude, velocidade, registradoEm });

const textoTooltip = (c: L.Layer): string => {
  const conteudo = (c as L.CircleMarker).getTooltip()?.getContent();
  return conteudo instanceof HTMLElement ? conteudo.textContent ?? '' : String(conteudo);
};

function camadas(mapa: L.Map): L.Layer[] {
  const lista: L.Layer[] = [];
  mapa.eachLayer(c => { lista.push(c); });
  return lista;
}

describe('utilitário de mapa', () => {
  let div: HTMLDivElement;
  let mapa: L.Map | undefined;

  beforeEach(() => {
    div = document.createElement('div');
    document.body.appendChild(div);
  });

  afterEach(() => {
    mapa?.remove();
    mapa = undefined;
    div.remove();
  });

  it('criarMapa: satélite Esri + camada de nomes', () => {
    mapa = criarMapa(div).setView(CENTRO_CRUZ_MACHADO, 13);
    const tiles = camadas(mapa).filter((c): c is L.TileLayer => c instanceof L.TileLayer);
    expect(tiles.length).toBe(2);
    expect(tiles[0].getAttribution?.()).toBe('Tiles © Esri');
  });

  it('criarIconePonto: cor e tamanho no ícone', () => {
    const icone = criarIconePonto('#22c55e', 16);
    expect(String(icone.options.html)).toContain('background:#22c55e');
    expect(icone.options.iconSize).toEqual([16, 16]);
    expect(icone.options.iconAnchor).toEqual([8, 8]);
  });

  it('desenharPontos: uma bolinha por ponto (inclusive repetidos), tooltip com hora e velocidade, início e fim', () => {
    mapa = criarMapa(div).setView(CENTRO_CRUZ_MACHADO, 13);
    const pontos = [
      ponto(-26.0, -51.3), ponto(-26.01, -51.31, '2026-10-18T10:00:05Z', 12.34),
      ponto(-26.01, -51.31, '2026-10-18T10:00:06Z', 0), ponto(-26.02, -51.32),
    ];
    const criadas = desenharPontos(mapa, pontos, { tamanhoMarco: 16, rotuloFim: 'Fim' });

    expect(criadas.filter(c => c instanceof L.CircleMarker).length).toBe(4);
    const marcos = criadas.filter((c): c is L.Marker => c instanceof L.Marker);
    expect(marcos.map(m => m.getTooltip()?.getContent())).toEqual(['Início', 'Fim']);
    expect(textoTooltip(criadas[1])).toContain('2026');
    expect(textoTooltip(criadas[1])).toContain('velocidade 12,3');
    expect(textoTooltip(criadas[2])).toContain('velocidade 0,0');
    expect(textoTooltip(criadas[0])).toBe('sem horário · sem velocidade');
    expect(desenharPontos(mapa, [], { tamanhoMarco: 14, rotuloFim: 'Posição atual' })).toEqual([]);
  });

  it('coordenadas passam inteiras até o mapa (sem arredondar)', () => {
    mapa = criarMapa(div).setView(CENTRO_CRUZ_MACHADO, 13);
    const lat = -26.012345678901234;
    const lng = -51.335678901234567;
    const criadas = desenharPontos(mapa, [ponto(lat, lng), ponto(lat + 0.000000001, lng)], { tamanhoMarco: 16, rotuloFim: 'Fim' });
    const bolinha = criadas[0] as L.CircleMarker;
    expect(bolinha.getLatLng().lat).toBe(lat);
    expect(bolinha.getLatLng().lng).toBe(lng);
    const linha = desenharLinhaDosPontos(mapa, [ponto(lat, lng), ponto(lat + 0.000000001, lng)])[0] as L.Polyline;
    const [a, b] = linha.getLatLngs() as L.LatLng[];
    expect(a.lat).toBe(lat);
    expect(b.lat).toBe(lat + 0.000000001);
  });

  it('linha real: liga TODOS os pontos, na ordem, sem filtrar repetidos ou próximos', () => {
    mapa = criarMapa(div).setView(CENTRO_CRUZ_MACHADO, 13);
    const pontos = [ponto(-26, -51), ponto(-26, -51), ponto(-26.00001, -51), ponto(-26.1, -51.1)];
    const linha = desenharLinhaDosPontos(mapa, pontos)[0] as L.Polyline;
    expect((linha.getLatLngs() as L.LatLng[]).map(p => [p.lat, p.lng])).toEqual([[-26, -51], [-26, -51], [-26.00001, -51], [-26.1, -51.1]]);
    expect(desenharLinhaDosPontos(mapa, [ponto(-26, -51)])).toEqual([]);
  });

  it('ordenarPontos: pela hora de gravação; se faltar hora em algum, mantém a ordem da API', () => {
    const a = ponto(-26.1, -51, '2026-10-18T10:00:02Z');
    const b = ponto(-26.2, -51, '2026-10-18T10:00:01Z');
    const c = ponto(-26.3, -51, '2026-10-18T10:00:01Z');
    expect(ordenarPontos([a, b, c])).toEqual([b, c, a]);
    const semHora = ponto(-26.4, -51);
    expect(ordenarPontos([a, semHora, b])).toEqual([a, semHora, b]);
  });

  it('textoDoPonto: sem unidade enquanto a unidade da velocidade não for confirmada', () => {
    expect(textoDoPonto(ponto(-26, -51, null, 5))).toBe('sem horário · velocidade 5,0');
  });

  describe('TrajetoNoMapa', () => {
    const pontos = [ponto(-26, -51, '2026-10-18T10:00:00Z', 10), ponto(-26.01, -51.01, '2026-10-18T10:01:00Z', 20), ponto(-26.02, -51.02, '2026-10-18T10:02:00Z', 30)];
    const ajustado = (): ResultadoTrajeto => ({ pedacos: [{ coordenadas: [[-26, -51], [-26.005, -51.004], [-26.02, -51.02]], ajustado: true }], aproximado: false });
    const linhas = (m: L.Map) => camadas(m).filter((c): c is L.Polyline => c instanceof L.Polyline && !(c instanceof L.CircleMarker));
    const bolinhas = (m: L.Map) => camadas(m).filter((c): c is L.CircleMarker => c instanceof L.CircleMarker);
    const azuis = (m: L.Map) => linhas(m).filter(l => l.options.color === CORES_TRAJETO.ajustado);
    const retas = (m: L.Map) => linhas(m).filter(l => l.options.color === CORES_TRAJETO.reta);

    it('traçado pelas ruas AUTOMÁTICO: chama o OSRM ao desenhar e troca a reta provisória pela linha ajustada', async () => {
      mapa = criarMapa(div).setView(CENTRO_CRUZ_MACHADO, 13);
      let responder: (r: ResultadoTrajeto) => void = () => {};
      const tracar = vi.fn(() => new Promise<ResultadoTrajeto>(r => (responder = r)));
      const trajeto = new TrajetoNoMapa({ tamanhoMarco: 16, rotuloFim: 'Fim' }, tracar);

      const desenho = trajeto.desenhar(mapa, pontos);
      // Enquanto calcula: pontos reais + linha reta provisória (o mapa nunca fica sem linha).
      expect(tracar).toHaveBeenCalledWith('d1', pontos);
      expect(bolinhas(mapa).length).toBe(3);
      expect(retas(mapa).length).toBe(1);

      responder(ajustado());
      expect(await desenho).toBe('ajustado');
      expect(azuis(mapa).length).toBe(1);
      expect(retas(mapa).length).toBe(0);
      expect(bolinhas(mapa).length).toBe(3);
    });

    it('os pontos reais ficam POR CIMA do traçado', async () => {
      mapa = criarMapa(div).setView(CENTRO_CRUZ_MACHADO, 13);
      const trajeto = new TrajetoNoMapa({ tamanhoMarco: 16, rotuloFim: 'Fim' }, async () => ajustado());
      await trajeto.desenhar(mapa, pontos);
      const svg = mapa.getPanes().overlayPane.querySelector('svg g')!;
      const caminhos = Array.from(svg.children);
      const indiceLinha = caminhos.indexOf((azuis(mapa)[0] as unknown as { _path: Element })._path);
      const indicesPontos = bolinhas(mapa).map(b => caminhos.indexOf((b as unknown as { _path: Element })._path));
      expect(indicesPontos.every(i => i > indiceLinha)).toBe(true);
    });

    it('"Posição atual" é o ÚLTIMO PONTO REAL (por hora), não o fim do traçado ajustado', async () => {
      mapa = criarMapa(div).setView(CENTRO_CRUZ_MACHADO, 13);
      const trajeto = new TrajetoNoMapa({ tamanhoMarco: 14, rotuloFim: 'Posição atual' },
        async () => ({ pedacos: [{ coordenadas: [[-26, -51], [-26.5, -51.5]], ajustado: true }], aproximado: false }));
      await trajeto.desenhar(mapa, [pontos[2], pontos[0], pontos[1]]);
      const atual = camadas(mapa).find((c): c is L.Marker => c instanceof L.Marker && c.getTooltip()?.getContent() === 'Posição atual')!;
      expect(atual.getLatLng()).toEqual(L.latLng(-26.02, -51.02));
    });

    it('plano B: "aproximado" mantém a linha reta entre os pontos reais', async () => {
      mapa = criarMapa(div).setView(CENTRO_CRUZ_MACHADO, 13);
      const reta: ResultadoTrajeto = { pedacos: [{ coordenadas: pontos.map(p => [p.latitude, p.longitude] as [number, number]), ajustado: false }], aproximado: true };
      const trajeto = new TrajetoNoMapa({ tamanhoMarco: 16, rotuloFim: 'Fim' }, async () => reta);
      expect(await trajeto.desenhar(mapa, pontos)).toBe('aproximado');
      expect(retas(mapa).length).toBe(1);
      expect(azuis(mapa).length).toBe(0);
      expect(bolinhas(mapa).length).toBe(3);
    });

    it('nunca deixa o mapa vazio: sem pedaços, fica a reta dos pontos reais e "aproximado"', async () => {
      mapa = criarMapa(div).setView(CENTRO_CRUZ_MACHADO, 13);
      const trajeto = new TrajetoNoMapa({ tamanhoMarco: 16, rotuloFim: 'Fim' }, async () => ({ pedacos: [], aproximado: false }));
      expect(await trajeto.desenhar(mapa, pontos)).toBe('aproximado');
      expect(retas(mapa).length).toBe(1);
    });

    it('resultado atrasado do OSRM é descartado se trocou de diário ou fechou antes de chegar', async () => {
      mapa = criarMapa(div).setView(CENTRO_CRUZ_MACHADO, 13);
      let responder: (r: ResultadoTrajeto) => void = () => {};
      const trajeto = new TrajetoNoMapa({ tamanhoMarco: 16, rotuloFim: 'Fim' }, () => new Promise<ResultadoTrajeto>(r => (responder = r)));
      const desenho = trajeto.desenhar(mapa, pontos);
      trajeto.limpar();
      responder(ajustado());
      expect(await desenho).toBeNull();
      expect(linhas(mapa).length).toBe(0);
    });

    it('atualizar (ao vivo): sem pontos novos não redesenha nem chama o OSRM; com ponto novo, redesenha', async () => {
      mapa = criarMapa(div).setView(CENTRO_CRUZ_MACHADO, 13);
      const tracar = vi.fn(async () => ajustado());
      const trajeto = new TrajetoNoMapa({ tamanhoMarco: 14, rotuloFim: 'Posição atual' }, tracar);
      await trajeto.desenhar(mapa, pontos);

      expect(await trajeto.atualizar(mapa, [...pontos])).toBe('sem mudança');
      expect(tracar).toHaveBeenCalledTimes(1);

      const novo = ponto(-26.03, -51.03, '2026-10-18T10:03:00Z', 15);
      expect(await trajeto.atualizar(mapa, [...pontos, novo])).toBe('ajustado');
      expect(tracar).toHaveBeenCalledTimes(2);
      expect(bolinhas(mapa).length).toBe(4);
    });

    it('limpar tira tudo do mapa', async () => {
      mapa = criarMapa(div).setView(CENTRO_CRUZ_MACHADO, 13);
      const trajeto = new TrajetoNoMapa({ tamanhoMarco: 16, rotuloFim: 'Fim' }, async () => ajustado());
      await trajeto.desenhar(mapa, pontos);
      trajeto.limpar();
      expect(linhas(mapa).length).toBe(0);
      expect(camadas(mapa).filter(c => c instanceof L.CircleMarker || c instanceof L.Marker).length).toBe(0);
      expect(trajeto.quantidadePontos).toBe(0);
    });
  });

  it('desenharPedacos + removerCamadas: ajustado em azul contínuo, plano B em reta tracejada; entram e saem do mapa', () => {
    mapa = criarMapa(div).setView(CENTRO_CRUZ_MACHADO, 13);
    const criadas = desenharPedacos(mapa, [
      { coordenadas: [[-26, -51], [-26.1, -51.1]], ajustado: true },
      { coordenadas: [[-26.2, -51.2], [-26.3, -51.3]], ajustado: false },
    ]) as L.Polyline[];
    expect(criadas.length).toBe(2);
    expect(criadas[0].options.color).toBe(CORES_TRAJETO.ajustado);
    expect(criadas[0].options.dashArray).toBeFalsy();
    expect(criadas[1].options.color).toBe(CORES_TRAJETO.reta);
    expect(criadas[1].options.dashArray).toBeTruthy();

    const copia = [...criadas];
    removerCamadas(mapa, criadas);
    expect(criadas.length).toBe(0);
    expect(copia.some(l => mapa!.hasLayer(l))).toBe(false);
  });

  it('criarMapaOcorrencia: centra no local com o marcador "Local da ocorrência"', () => {
    mapa = criarMapaOcorrencia(div, -26.05, -51.35);
    expect(mapa.getCenter()).toEqual(L.latLng(-26.05, -51.35));
    expect(mapa.getZoom()).toBe(16);
    const marcador = camadas(mapa).find((c): c is L.Marker => c instanceof L.Marker);
    expect(marcador?.getPopup()?.getContent()).toBe('Local da ocorrência');
  });
});
