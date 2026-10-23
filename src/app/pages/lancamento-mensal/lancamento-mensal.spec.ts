import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { LancamentoMensal } from './lancamento-mensal';
import { DiarioResponse, DiarioResumoMensal, StatusDiario } from '../../interfaces/diario';
import { authInterceptor } from '../../interceptors/auth.interceptor';
import { datasInterceptor } from '../../interceptors/datas.interceptor';
import { environment } from '../../../environments/environment';
import { FotosCache } from '../../shared/services/fotos-cache';

const API = environment.apiUrl;

function diario(id: string, status: StatusDiario): DiarioResponse {
  return {
    id, status, veiculoDescricao: 'Caminhão 1', veiculoPlaca: 'ABC1D23', motoristaNome: 'João',
    medidorInicial: 100, medidorFinal: 150, medidorPercorrido: 50, destino: 'Centro',
    abertoEm: '2026-10-18T11:00:00', fechadoEm: '2026-10-18T19:00:00',
  };
}

const resumo: DiarioResumoMensal = {
  veiculoId: 'v1', veiculoDescricao: 'Caminhão 1', veiculoPlaca: 'ABC1D23', mes: 10, ano: 2026,
  totalDiarios: 3, primeiroMedidor: 100, ultimoMedidor: 250, totalPercorrido: 150,
};


describe('LancamentoMensal', () => {
  let component: LancamentoMensal;
  let fixture: ComponentFixture<LancamentoMensal>;
  let api: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem('token', 'tok123');
    await TestBed.configureTestingModule({
      imports: [LancamentoMensal],
      providers: [
        provideHttpClient(withInterceptors([authInterceptor, datasInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LancamentoMensal);
    component = fixture.componentInstance;
    api = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  });

  const pedidosVerificar = () => api.match(r => r.url.endsWith('/verificar'));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('fotos: o cache é desta tela e as URLs das imagens são liberadas ao sair dela', () => {
    const liberar = vi.fn();
    Object.assign(URL, { createObjectURL: () => 'blob:foto-1', revokeObjectURL: liberar });
    const cache = fixture.debugElement.injector.get(FotosCache);
    cache.url('f1').subscribe();
    api.expectOne(`${API}/fotos/f1`).flush(new Blob(['x']));
    expect(liberar).not.toHaveBeenCalled();

    fixture.destroy();
    expect(liberar).toHaveBeenCalledWith('blob:foto-1');
  });

  it('mostra os 3 status com rótulos diferentes', () => {
    expect(component.labelStatus('aberto')).toBe('Aberto');
    expect(component.labelStatus('fechado')).toBe('Pendente de assinatura');
    expect(component.labelStatus('assinado')).toBe('Assinado');
  });

  it('tabela: badge com rótulo curto e o completo no title ("Pendente" / "Pendente de assinatura")', async () => {
    component.verDiarios(resumo);
    api.expectOne(r => r.url === `${API}/diarios`)
      .flush([diario('d1', 'aberto'), diario('d2', 'fechado'), diario('d3', 'assinado')]);
    await fixture.whenStable();

    const badges = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('tbody app-status-badge .badge'));
    expect(badges.map(b => b.textContent?.trim())).toEqual(['Aberto', 'Pendente', 'Assinado']);
    expect(badges[1].getAttribute('title')).toBe('Pendente de assinatura');
    expect(badges[1].classList).toContain('whitespace-nowrap');
  });

  it('não verifica nada automaticamente ao carregar a lista', () => {
    component.verDiarios(resumo);
    api.expectOne(r => r.url === `${API}/diarios` && r.params.get('veiculoId') === 'v1')
      .flush([diario('d1', 'aberto'), diario('d2', 'fechado'), diario('d3', 'assinado')]);
    fixture.detectChanges();

    expect(pedidosVerificar().length).toBe(0);
    expect(component.verificacoes()).toEqual({});
  });

  it('assinado e íntegro: chama /verificar com o token e guarda a mensagem da API', () => {
    component.verificar(diario('d3', 'assinado'));
    expect(component.verificacoes()['d3']).toEqual({ tipo: 'carregando' });

    const req = api.expectOne(`${API}/diarios/d3/verificar`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer tok123');
    req.flush({
      assinado: true, integro: true, assinadoEm: '2026-10-18T20:00:00',
      mensagem: 'Conteúdo íntegro: nada foi alterado depois da assinatura.',
    });

    expect(component.verificacoes()['d3']).toEqual({
      tipo: 'resultado', integro: true, assinadoEm: '2026-10-18T20:00:00Z',
      mensagem: 'Conteúdo íntegro: nada foi alterado depois da assinatura.',
    });
  });

  it('assinado e alterado: integro false', () => {
    component.verificar(diario('d3', 'assinado'));
    api.expectOne(`${API}/diarios/d3/verificar`).flush({
      assinado: true, integro: false, assinadoEm: '2026-10-18T20:00:00',
      mensagem: 'ATENÇÃO: o conteúdo do diário é diferente do que foi assinado.',
    });

    const estado = component.verificacoes()['d3'];
    expect(estado.tipo === 'resultado' && estado.integro).toBe(false);
  });

  it('erro: mostra o {"erro"} da API e permite tentar de novo', () => {
    component.verificar(diario('d3', 'assinado'));
    api.expectOne(`${API}/diarios/d3/verificar`)
      .flush({ erro: 'Diário não encontrado.' }, { status: 404, statusText: 'Not Found' });

    expect(component.verificacoes()['d3']).toEqual({ tipo: 'erro', mensagem: 'Diário não encontrado.' });

    component.verificar(diario('d3', 'assinado'));
    expect(pedidosVerificar().length).toBe(1);
  });

  it('não verifica diários que não estão assinados', () => {
    component.verificar(diario('d1', 'aberto'));
    component.verificar(diario('d2', 'fechado'));

    expect(pedidosVerificar().length).toBe(0);
  });

  it('o resultado de um diário não apaga o de outro', () => {
    component.verificar(diario('a', 'assinado'));
    component.verificar(diario('b', 'assinado'));
    api.expectOne(`${API}/diarios/a/verificar`).flush({ assinado: true, integro: true, assinadoEm: null, mensagem: 'ok' });

    expect(component.verificacoes()['a'].tipo).toBe('resultado');
    expect(component.verificacoes()['b'].tipo).toBe('carregando');
    api.expectOne(`${API}/diarios/b/verificar`).flush({ assinado: true, integro: true, assinadoEm: null, mensagem: 'ok' });
  });

  describe('modal de detalhes do diário', () => {
    const pedidosDetalhe = () => api.match(r => r.url.includes('/diario/'));

    async function mostrarDiarios(): Promise<HTMLTableRowElement> {
      component.verDiarios(resumo);
      api.expectOne(r => r.url === `${API}/diarios`).flush([diario('d1', 'assinado')]);
      await fixture.whenStable();
      return (fixture.nativeElement as HTMLElement).querySelector<HTMLTableRowElement>('tbody tr[appclicavel]')!;
    }

    function responderDetalhe(id: string): void {
      api.expectOne(`${API}/abastecimentos/diario/${id}`)
        .flush([{ tipoCombustivel: 'Diesel', litros: 40, valorTotal: 250, posto: null, registradoEm: null }]);
      api.expectOne(`${API}/ocorrencias/diario/${id}`).flush([]);
    }

    it('clicar na linha abre o modal e chama as duas rotas ao mesmo tempo', async () => {
      (await mostrarDiarios()).click();
      expect(component.diarioDetalhe()?.id).toBe('d1');
      // As duas chamadas saem juntas (nenhuma espera a outra).
      expect(pedidosDetalhe().map(r => r.request.url).sort()).toEqual([
        `${API}/abastecimentos/diario/d1`, `${API}/ocorrencias/diario/d1`,
      ]);
    });

    it('Enter na linha abre o modal', async () => {
      (await mostrarDiarios()).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      expect(component.diarioDetalhe()?.id).toBe('d1');
      responderDetalhe('d1');
    });

    it('carregar a lista não chama nenhuma rota de detalhe', async () => {
      await mostrarDiarios();
      expect(pedidosDetalhe().length).toBe(0);
    });

    it('clicar em "Checklist" na linha NÃO abre o modal; a tabela não tem mais "Verificar"', async () => {
      const linha = await mostrarDiarios();
      const botoes = Array.from(linha.querySelectorAll('button'));
      expect(botoes.map(b => b.textContent?.trim())).toEqual(['Ver rota', 'Checklist']);
      botoes.find(b => b.textContent?.includes('Checklist'))!.click();

      expect(component.diarioDetalhe()).toBeNull();
      expect(api.match(r => r.url.includes('/abastecimentos/') || r.url.includes('/ocorrencias/')).length).toBe(0);
      api.match(() => true);
    });

    it('abrir um diário assinado verifica a integridade sozinho (uma vez só)', async () => {
      const linha = await mostrarDiarios();
      expect(pedidosVerificar().length).toBe(0);
      linha.click();
      responderDetalhe('d1');
      api.expectOne(`${API}/diarios/d1/verificar`).flush({ assinado: true, integro: true, assinadoEm: null, mensagem: 'ok' });
      expect(component.verificacoes()['d1']?.tipo).toBe('resultado');

      component.fecharDetalhe();
      linha.click();
      expect(pedidosVerificar().length).toBe(0);
    });

    it('abrir um diário não assinado não verifica', () => {
      component.abrirDetalhe(diario('d2', 'fechado'));
      responderDetalhe('d2');
      expect(pedidosVerificar().length).toBe(0);
    });

    it('verificação com erro: reabrir o modal tenta de novo', () => {
      component.abrirDetalhe(diario('d1', 'assinado'));
      responderDetalhe('d1');
      api.expectOne(`${API}/diarios/d1/verificar`).flush(null, { status: 500, statusText: 'Erro' });
      expect(component.verificacoes()['d1']?.tipo).toBe('erro');

      component.fecharDetalhe();
      component.abrirDetalhe(diario('d1', 'assinado'));
      expect(pedidosVerificar().length).toBe(1);
    });

    it('guarda o resultado por diário: reabrir não chama a API de novo', async () => {
      const linha = await mostrarDiarios();
      linha.click();
      responderDetalhe('d1');
      expect(component.detalhes()['d1']?.tipo).toBe('pronto');

      component.fecharDetalhe();
      linha.click();
      expect(pedidosDetalhe().length).toBe(0);
    });

    it('erro (forkJoin): estado de erro e "Tentar de novo" chama as duas rotas outra vez', async () => {
      (await mostrarDiarios()).click();
      api.expectOne(`${API}/abastecimentos/diario/d1`).flush(null, { status: 0, statusText: 'Unknown Error' });
      api.match(`${API}/ocorrencias/diario/d1`); // cancelada pelo forkJoin

      expect(component.detalhes()['d1']?.tipo).toBe('erro');
      component.carregarDetalhe('d1');
      responderDetalhe('d1');
      expect(component.detalhes()['d1']?.tipo).toBe('pronto');
    });

    it('"Checklist" no modal fecha o detalhe e abre o modal do checklist', async () => {
      (await mostrarDiarios()).click();
      responderDetalhe('d1');
      component.checklistDoDetalhe(diario('d1', 'assinado'));

      expect(component.diarioDetalhe()).toBeNull();
      expect(component.modalChecklistAberto()).toBe(true);
      api.expectOne(r => r.url.includes('/checklist/respostas/diario/d1')).flush([]);
    });
  });
});
