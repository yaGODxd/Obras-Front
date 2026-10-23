import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { ManutencaoDetalhe } from './manutencao-detalhe';
import { ManutencaoResponse, StatusManutencao } from '../../../interfaces/manutencao';
import { AvisosService } from '../../../shared/services/avisos';
import { environment } from '../../../../environments/environment';

const API = environment.apiUrl;

// Sem :id na rota de teste, a tela busca /manutencoes/ (id vazio).
const URL_MANUTENCAO = `${API}/manutencoes/`;
const URL_RECARREGAR = `${API}/manutencoes/m1`;
const URL_PECA = `${API}/manutencoes/pecas/p1`;

function manutencao(status: StatusManutencao, custoPecas = 50): ManutencaoResponse {
  return {
    id: 'm1', veiculoId: 'v1', veiculoDescricao: 'Caminhão 1', veiculoPlaca: null, ocorrenciaId: null,
    tipo: 'corretiva', descricao: 'Freio', mecanicoResponsavel: null, status, custoMaoObra: 100,
    custoPecas, custoTotal: 100 + custoPecas,
    pecas: [{ id: 'p1', nomePeca: 'Filtro', codigoPeca: null, marcaPeca: 'Bosch', quantidade: 2, valorUnitario: 25, valorTotal: 50 }],
  } as ManutencaoResponse;
}

describe('ManutencaoDetalhe', () => {
  let component: ManutencaoDetalhe;
  let fixture: ComponentFixture<ManutencaoDetalhe>;
  let api: HttpTestingController;
  let avisos: AvisosService;
  const el = () => fixture.nativeElement as HTMLElement;
  const lapis = () => el().querySelector<HTMLButtonElement>('button[aria-label="Editar Filtro"]')!;

  async function abrirCom(m: ManutencaoResponse): Promise<void> {
    api.expectOne(URL_MANUTENCAO).flush(m);
    await fixture.whenStable();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManutencaoDetalhe],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ManutencaoDetalhe);
    component = fixture.componentInstance;
    api = TestBed.inject(HttpTestingController);
    avisos = TestBed.inject(AvisosService);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('editar peça: carrega os campos, envia o PUT e busca a manutenção de novo (totais da API)', async () => {
    await abrirCom(manutencao('aberta'));
    expect(lapis().disabled).toBe(false);

    lapis().click();
    await fixture.whenStable();
    expect(component.formPeca).toEqual({ nomePeca: 'Filtro', codigoPeca: null, marcaPeca: 'Bosch', quantidade: 2, valorUnitario: 25 });
    expect(el().querySelector('h3')?.textContent).toContain('Editar peça');

    component.formPeca = { nomePeca: ' Filtro de ar ', codigoPeca: '  ', marcaPeca: 'Bosch', quantidade: 3, valorUnitario: 30 };
    component.salvarPeca();
    const put = api.expectOne(URL_PECA);
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({ nomePeca: 'Filtro de ar', codigoPeca: null, marcaPeca: 'Bosch', quantidade: 3, valorUnitario: 30 });
    put.flush(null);

    expect(component.pecaEditando()).toBeNull();
    api.expectOne(URL_RECARREGAR).flush(manutencao('aberta', 90));
    expect(component.manutencao()?.custoPecas).toBe(90);
    expect(avisos.avisos()[0]).toEqual(expect.objectContaining({ tipo: 'sucesso', texto: 'Peça atualizada.' }));
  });

  it('valida antes de enviar (quantidade e valor)', async () => {
    await abrirCom(manutencao('aberta'));
    component.abrirEdicaoPeca(component.manutencao()!.pecas[0]);
    component.formPeca.quantidade = 0;
    component.salvarPeca();
    expect(api.match(URL_PECA).length).toBe(0);
    expect(avisos.avisos()[0].texto).toBe('A quantidade da peça precisa ser maior que zero.');
  });

  it('manutenção concluída: lápis desligado, aviso na tela e a edição não abre', async () => {
    await abrirCom(manutencao('concluida'));
    expect(lapis().disabled).toBe(true);
    expect(el().textContent).toContain('as peças não podem mais ser alteradas');

    component.abrirEdicaoPeca(component.manutencao()!.pecas[0]);
    expect(component.pecaEditando()).toBeNull();
  });

  it('409 (concluída em outra aba): mostra o erro da API, fecha e busca de novo', async () => {
    await abrirCom(manutencao('aberta'));
    component.abrirEdicaoPeca(component.manutencao()!.pecas[0]);
    component.salvarPeca();
    api.expectOne(URL_PECA).flush(
      { erro: 'Não é possível alterar peça de manutenção concluída.' }, { status: 409, statusText: 'Conflict' });

    expect(avisos.avisos()[0].texto).toBe('Não é possível alterar peça de manutenção concluída.');
    expect(component.pecaEditando()).toBeNull();
    api.expectOne(URL_RECARREGAR).flush(manutencao('concluida'));
    expect(component.concluida()).toBe(true);
  });

  it('outro erro (400) mostra a mensagem e mantém o modal aberto', async () => {
    await abrirCom(manutencao('aberta'));
    component.abrirEdicaoPeca(component.manutencao()!.pecas[0]);
    component.salvarPeca();
    api.expectOne(URL_PECA).flush({ erro: 'Quantidade mínima é 1.' }, { status: 400, statusText: 'Bad Request' });

    expect(avisos.avisos()[0].texto).toBe('Quantidade mínima é 1.');
    expect(component.pecaEditando()).not.toBeNull();
    expect(api.match(URL_RECARREGAR).length).toBe(0);
  });
});
