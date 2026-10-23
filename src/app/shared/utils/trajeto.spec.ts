import {
  CONFIG_TRAJETO, DependenciasTrajeto, PontoGps, comprimentoMetros, dividirEmBlocos, filtrarPontosProximos,
  limparCacheTrajetos, montarUrl, timestampsDoBloco, tracarTrajeto
} from './trajeto';

// Pontos em linha reta, a "passoM" metros um do outro (para o norte), 1 por segundo a partir de 10:00.
function pontosEmLinha(qtd: number, passoM = 30, comHora = true): PontoGps[] {
  return Array.from({ length: qtd }, (_, i) => ({
    latitude: -26 + (i * passoM) / 111320,
    longitude: -51.3,
    registradoEm: comHora ? new Date(Date.UTC(2026, 9, 20, 13, 0, i)).toISOString() : null,
  }));
}

function resposta(corpo: unknown, ok = true): Response {
  return { ok, json: async () => corpo } as unknown as Response;
}

// Resposta "Ok" do OSRM que devolve a própria trilha do bloco (traçado do mesmo tamanho dos pontos reais).
function ecoDoBloco(url: string): Response {
  const coords = url.slice(CONFIG_TRAJETO.url.length).split('?')[0].split(';').map(par => par.split(',').map(Number) as [number, number]);
  return resposta({ code: 'Ok', matchings: [{ geometry: { coordinates: coords } }] });
}

// Dublê do OSRM: grava as URLs pedidas e responde com o que o teste mandar. Nunca chama a rede.
function falsoOsrm(responder: (url: string, init: RequestInit) => Promise<Response> = async url => ecoDoBloco(url)) {
  const urls: string[] = [];
  const esperas: number[] = [];
  let simultaneas = 0;
  let maxSimultaneas = 0;
  let relogio = 1_000_000;
  const deps: DependenciasTrajeto = {
    buscar: async (url, init) => {
      urls.push(url);
      simultaneas++;
      maxSimultaneas = Math.max(maxSimultaneas, simultaneas);
      try { return await responder(url, init); } finally { simultaneas--; }
    },
    esperar: async ms => { esperas.push(ms); },
    agora: () => relogio,
  };
  return { deps, urls, esperas, maxSimultaneas: () => maxSimultaneas, avancar: (ms: number) => { relogio += ms; } };
}

describe('filtrarPontosProximos', () => {
  it('descarta repetidos e pontos a menos de 15 m, mantendo o último (posição atual)', () => {
    const a = { latitude: -26, longitude: -51.3 };
    const repetido = { ...a };
    const perto = { latitude: -26 + 5 / 111320, longitude: -51.3 };      // 5 m
    const longe = { latitude: -26 + 40 / 111320, longitude: -51.3 };     // 40 m
    const final = { latitude: -26 + 45 / 111320, longitude: -51.3 };     // 5 m depois do "longe"

    expect(filtrarPontosProximos([a, repetido, perto, longe, final], 15)).toEqual([a, final]);
  });
});

describe('dividirEmBlocos', () => {
  it('blocos de até 100 pontos (limite do OSRM público) com 1 ponto de sobreposição', () => {
    expect(CONFIG_TRAJETO.tamanhoBloco).toBe(100);
    const lista = Array.from({ length: 250 }, (_, i) => i);
    const blocos = dividirEmBlocos(lista, CONFIG_TRAJETO.tamanhoBloco);

    expect(blocos.map(b => b.length)).toEqual([100, 100, 52]);
    expect(blocos[1][0]).toBe(blocos[0][99]);
    expect(blocos[2][0]).toBe(blocos[1][99]);
    expect(blocos[2][51]).toBe(249);
  });

  it('trilha pequena é um bloco só', () => {
    expect(dividirEmBlocos([1, 2, 3], 100)).toEqual([[1, 2, 3]]);
  });
});

describe('montarUrl', () => {
  it('longitude,latitude; overview=full, geojson, steps=false, gaps=split, tidy=true e raio de 30 m por ponto', () => {
    const pontos = pontosEmLinha(3);
    const url = montarUrl(pontos);
    expect(url.startsWith(`${CONFIG_TRAJETO.url}-51.3,-26;-51.3,`)).toBe(true);
    for (const p of ['overview=full', 'geometries=geojson', 'steps=false', 'gaps=split', 'tidy=true', 'radiuses=30;30;30']) {
      expect(url).toContain(p);
    }
  });

  it('coordenadas inteiras na URL (sem arredondar)', () => {
    const url = montarUrl([{ latitude: -26.0123456, longitude: -51.3356789 }, { latitude: -26.0123999, longitude: -51.3356999 }]);
    expect(url).toContain('-51.3356789,-26.0123456;-51.3356999,-26.0123999');
  });

  it('timestamps em segundos desde 1970, um por ponto', () => {
    const pontos = pontosEmLinha(3);
    const base = Date.UTC(2026, 9, 20, 13, 0, 0) / 1000;
    expect(montarUrl(pontos)).toContain(`&timestamps=${base};${base + 1};${base + 2}`);
  });

  it('sem timestamps se faltar hora em algum ponto ou se a hora não aumentar sempre', () => {
    const semHora = pontosEmLinha(3);
    semHora[1] = { ...semHora[1], registradoEm: null };
    expect(montarUrl(semHora)).not.toContain('timestamps');

    const foraDeOrdem = pontosEmLinha(3);
    foraDeOrdem[2] = { ...foraDeOrdem[2], registradoEm: foraDeOrdem[0].registradoEm };
    expect(timestampsDoBloco(foraDeOrdem)).toBeNull();
  });
});

describe('tracarTrajeto', () => {
  beforeEach(() => limparCacheTrajetos());
  afterEach(() => vi.useRealTimers());

  it('menos de 2 pontos: não chama o OSRM', async () => {
    const osrm = falsoOsrm();
    expect(await tracarTrajeto('d1', pontosEmLinha(1), osrm.deps)).toEqual({ pedacos: [], aproximado: false });
    expect(osrm.urls.length).toBe(0);
  });

  it('OSRM "Ok": pedaços ajustados às ruas, convertidos de [lng, lat] para [lat, lng]', async () => {
    const osrm = falsoOsrm(async () => resposta({ code: 'Ok', matchings: [{ geometry: { coordinates: [[-51.3, -26], [-51.3, -25.9997]] } }] }));
    const r = await tracarTrajeto('d1', pontosEmLinha(2), osrm.deps);
    expect(r).toEqual({ pedacos: [{ coordenadas: [[-26, -51.3], [-25.9997, -51.3]], ajustado: true }], aproximado: false });
  });

  it('com gaps=split, cada matching vira um pedaço', async () => {
    const osrm = falsoOsrm(async () => resposta({ code: 'Ok', matchings: [
      { geometry: { coordinates: [[-51.3, -26], [-51.3, -25.9999]] } },
      { geometry: { coordinates: [[-51.3, -25.9998], [-51.3, -25.9997]] } },
    ] }));
    const r = await tracarTrajeto('d1', pontosEmLinha(5), osrm.deps);
    expect(r.pedacos.length).toBe(2);
    expect(r.aproximado).toBe(false);
  });

  it('plano B: code diferente de "Ok", 429, sem rede -> linha reta entre os pontos reais e "aproximado"', async () => {
    const pontos = pontosEmLinha(4);
    const reta = { pedacos: [{ coordenadas: pontos.map(p => [p.latitude, p.longitude]), ajustado: false }], aproximado: true };

    expect(await tracarTrajeto('a', pontos, falsoOsrm(async () => resposta({ code: 'NoMatch' })).deps)).toEqual(reta);
    expect(await tracarTrajeto('b', pontos, falsoOsrm(async () => resposta({}, false)).deps)).toEqual(reta);
    expect(await tracarTrajeto('c', pontos, falsoOsrm(async () => { throw new TypeError('Failed to fetch'); }).deps)).toEqual(reta);
  });

  it('plano B: timeout cancela a chamada e desenha linha reta', async () => {
    vi.useFakeTimers();
    const osrm = falsoOsrm((_url, init) => new Promise((_ok, falha) => {
      init.signal?.addEventListener('abort', () => falha(new DOMException('Tempo esgotado', 'AbortError')));
    }));
    const promessa = tracarTrajeto('d1', pontosEmLinha(3), osrm.deps);
    await vi.advanceTimersByTimeAsync(CONFIG_TRAJETO.timeoutMs);
    const r = await promessa;
    expect(r.aproximado).toBe(true);
    expect(r.pedacos[0].ajustado).toBe(false);
  });

  it('plano B: traçado ajustado mais de 1,5 vez maior que a linha dos pontos reais', async () => {
    const pontos = pontosEmLinha(5);  // ~120 m de linha real
    const real = comprimentoMetros(pontos);
    // Volta grande: vai 400 m para o leste e volta (mais de 1,5 x e mais de 100 m a mais).
    const desvio: [number, number][] = [[-51.3, -26], [-51.296, -26], [-51.3, pontos[4].latitude]];
    const osrm = falsoOsrm(async () => resposta({ code: 'Ok', matchings: [{ geometry: { coordinates: desvio } }] }));
    const r = await tracarTrajeto('d1', pontos, osrm.deps);
    expect(real).toBeGreaterThan(100);
    expect(r.aproximado).toBe(true);
    expect(r.pedacos).toEqual([{ coordenadas: pontos.map(p => [p.latitude, p.longitude]), ajustado: false }]);
  });

  it('traçado um pouco maior que os pontos (normal ao seguir a rua) continua ajustado', async () => {
    const pontos = pontosEmLinha(5);
    const quaseReto: [number, number][] = [[-51.3, -26], [-51.2999, pontos[2].latitude], [-51.3, pontos[4].latitude]];
    const osrm = falsoOsrm(async () => resposta({ code: 'Ok', matchings: [{ geometry: { coordinates: quaseReto } }] }));
    expect((await tracarTrajeto('d1', pontos, osrm.deps)).aproximado).toBe(false);
  });

  it('trilha longa: blocos de até 100, um pedido por vez, com 1 s de intervalo', async () => {
    const osrm = falsoOsrm();
    await tracarTrajeto('d1', pontosEmLinha(250), osrm.deps);

    expect(osrm.urls.length).toBe(3);
    expect(osrm.urls.map(u => u.split('?')[0].split(';').length)).toEqual([100, 100, 52]);
    expect(osrm.esperas).toEqual([1000, 1000]);
    expect(osrm.maxSimultaneas()).toBe(1);
  });

  it('um bloco que falha cai no plano B; os outros continuam pelas ruas', async () => {
    let n = 0;
    const osrm = falsoOsrm(async url => (++n === 2 ? resposta({}, false) : ecoDoBloco(url)));
    const r = await tracarTrajeto('d1', pontosEmLinha(250), osrm.deps);

    expect(r.aproximado).toBe(true);
    expect(r.pedacos.map(p => p.ajustado)).toEqual([true, false, true]);
    expect(r.pedacos[1].coordenadas.length).toBe(100);
  });

  describe('cache por diário', () => {
    it('mesmos pontos: não chama o OSRM de novo', async () => {
      const osrm = falsoOsrm();
      const pontos = pontosEmLinha(5);
      await tracarTrajeto('d1', pontos, osrm.deps);
      osrm.avancar(60_000);
      await tracarTrajeto('d1', pontos, osrm.deps);
      expect(osrm.urls.length).toBe(1);
    });

    it('diário ao vivo: pontos novos antes de 30 s devolvem o traçado guardado; depois de 30 s, recalcula', async () => {
      const osrm = falsoOsrm();
      await tracarTrajeto('d1', pontosEmLinha(5), osrm.deps);

      osrm.avancar(10_000);
      const antigo = await tracarTrajeto('d1', pontosEmLinha(6), osrm.deps);
      expect(osrm.urls.length).toBe(1);
      expect(antigo.pedacos[0].coordenadas.length).toBe(5);

      osrm.avancar(25_000);
      const novo = await tracarTrajeto('d1', pontosEmLinha(6), osrm.deps);
      expect(osrm.urls.length).toBe(2);
      expect(novo.pedacos[0].coordenadas.length).toBe(6);
    });

    it('diário ao vivo longo: recalcula só os blocos do fim, não o diário inteiro', async () => {
      const osrm = falsoOsrm();
      await tracarTrajeto('d1', pontosEmLinha(250), osrm.deps);
      expect(osrm.urls.length).toBe(3);

      osrm.avancar(31_000);
      await tracarTrajeto('d1', pontosEmLinha(260), osrm.deps);
      // Blocos 1 e 2 (completos, 100 pontos) reaproveitados; só o 3º (que cresceu) vai ao OSRM.
      expect(osrm.urls.length).toBe(4);
      expect(osrm.urls[3].split('?')[0].split(';').length).toBe(62);
    });

    it('bloco que falhou (rede) é tentado de novo no próximo cálculo', async () => {
      let falhar = true;
      const osrm = falsoOsrm(async url => (falhar ? resposta({}, false) : ecoDoBloco(url)));
      expect((await tracarTrajeto('d1', pontosEmLinha(5), osrm.deps)).aproximado).toBe(true);

      falhar = false;
      osrm.avancar(31_000);
      expect((await tracarTrajeto('d1', pontosEmLinha(6), osrm.deps)).aproximado).toBe(false);
    });

    it('diários diferentes têm cache separado', async () => {
      const osrm = falsoOsrm();
      await tracarTrajeto('d1', pontosEmLinha(5), osrm.deps);
      await tracarTrajeto('d2', pontosEmLinha(5), osrm.deps);
      expect(osrm.urls.length).toBe(2);
    });
  });
});
