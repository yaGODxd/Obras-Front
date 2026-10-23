import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { Manutencao } from './manutencao';
import { AvisosService } from '../../shared/services/avisos';
import { OcorrenciaDetalhada } from '../../interfaces/ocorrencia';
import { environment } from '../../../environments/environment';

// Simula o <input type="file"> com um arquivo escolhido.
function eventoArquivo(arquivo: File): Event {
  const input = document.createElement('input');
  Object.defineProperty(input, 'files', { value: [arquivo] });
  return { target: input } as unknown as Event;
}

describe('Manutencao', () => {
  let component: Manutencao;
  let fixture: ComponentFixture<Manutencao>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Manutencao],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Manutencao);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('a prévia da nota fiscal aparece depois de ler o arquivo (original, sem redução)', async () => {
    const bytes = new Uint8Array([10, 20, 30, 40]);
    component.abrirModal();
    component.onFotoNotaFiscal(eventoArquivo(new File([bytes], 'nota.jpg', { type: 'image/jpeg' })));

    await vi.waitFor(() => expect(component.fotoNotaFiscal()).toBe(btoa(String.fromCharCode(10, 20, 30, 40))));
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('img[alt="Prévia da nota fiscal"]')).not.toBeNull();
  });

  describe('peças do modal "Nova manutenção"', () => {
    function adicionar(nomePeca: string, quantidade: number, valorUnitario: number): void {
      component.novaPeca = { nomePeca, codigoPeca: null, marcaPeca: null, quantidade, valorUnitario };
      component.salvarPeca();
    }

    beforeEach(() => {
      component.abrirModal();
      adicionar('Filtro de óleo', 2, 25);
      adicionar('Óleo 15W40', 4, 30);
      component.novaManutencao.custoMaoObra = 100;
    });

    it('adicionar: entra no fim da lista e os totais somam', () => {
      expect(component.pecasForm.map(p => p.nomePeca)).toEqual(['Filtro de óleo', 'Óleo 15W40']);
      expect(component.totalPecas()).toBe(170);
      expect(component.totalGeral()).toBe(270);
      expect(component.novaPeca).toEqual(component.resetPeca()); // volta ao padrão: qtd 1, valor 0
    });

    it('editar: carrega a peça nos campos e salvar substitui na MESMA posição', () => {
      component.editarPeca(0);
      expect(component.indicePecaEmEdicao()).toBe(0);
      expect(component.novaPeca.nomePeca).toBe('Filtro de óleo');

      component.novaPeca.quantidade = 3;
      component.salvarPeca();

      expect(component.pecasForm.length).toBe(2);
      expect(component.pecasForm[0]).toEqual(expect.objectContaining({ nomePeca: 'Filtro de óleo', quantidade: 3 }));
      expect(component.totalPecas()).toBe(195);  // 3x25 + 4x30
      expect(component.totalGeral()).toBe(295);
      expect(component.indicePecaEmEdicao()).toBeNull();
      expect(component.novaPeca).toEqual(component.resetPeca());
    });

    it('editar não altera a lista enquanto não salvar', () => {
      component.editarPeca(0);
      component.novaPeca.quantidade = 99;
      expect(component.pecasForm[0].quantidade).toBe(2);
    });

    it('cancelar edição limpa o formulário e não muda a lista', () => {
      component.editarPeca(1);
      component.novaPeca.valorUnitario = 999;
      component.cancelarEdicaoPeca();

      expect(component.indicePecaEmEdicao()).toBeNull();
      expect(component.novaPeca).toEqual(component.resetPeca());
      expect(component.pecasForm[1].valorUnitario).toBe(30);
    });

    it('remover a peça em edição cancela a edição', () => {
      component.editarPeca(0);
      component.removerPeca(0);

      expect(component.pecasForm.map(p => p.nomePeca)).toEqual(['Óleo 15W40']);
      expect(component.indicePecaEmEdicao()).toBeNull();
      expect(component.novaPeca).toEqual(component.resetPeca());
    });

    it('remover outra peça mantém a edição apontando para a peça certa', () => {
      component.editarPeca(1);
      component.removerPeca(0);

      expect(component.indicePecaEmEdicao()).toBe(0);
      component.novaPeca.quantidade = 1;
      component.salvarPeca();
      expect(component.pecasForm).toEqual([expect.objectContaining({ nomePeca: 'Óleo 15W40', quantidade: 1 })]);
    });

    it('clicar no lápis de outra peça no meio de uma edição passa para a nova', () => {
      component.editarPeca(0);
      component.novaPeca.quantidade = 50; // descartado
      component.editarPeca(1);

      expect(component.indicePecaEmEdicao()).toBe(1);
      expect(component.novaPeca.nomePeca).toBe('Óleo 15W40');
      expect(component.pecasForm[0].quantidade).toBe(2);
    });

    it('salvar alteração usa as mesmas validações (mensagem e lista intacta)', () => {
      component.editarPeca(0);
      component.novaPeca.quantidade = 0;
      component.salvarPeca();

      expect(TestBed.inject(AvisosService).avisos().at(-1)?.texto).toBe('A quantidade da peça precisa ser maior que zero.');
      expect(component.pecasForm[0].quantidade).toBe(2);
      expect(component.indicePecaEmEdicao()).toBe(0); // continua editando para corrigir
    });

    it('tela: lápis e lixeira com nome para o leitor de tela; botões mudam durante a edição', async () => {
      component.modalAberto.set(true);
      await fixture.whenStable();
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('button[aria-label="Editar peça Filtro de óleo"]')).not.toBeNull();
      expect(el.querySelector('button[aria-label="Remover peça Filtro de óleo"]')).not.toBeNull();

      el.querySelector<HTMLButtonElement>('button[aria-label="Editar peça Filtro de óleo"]')!.click();
      await fixture.whenStable();
      expect(el.textContent).toContain('Salvar alteração');
      expect(el.textContent).toContain('Cancelar edição');
      expect(el.textContent).not.toContain('Adicionar peça');
    });
  });

  it('recusa arquivo acima de 5 MB com aviso', () => {
    const grande = new File(['x'], 'nota.jpg', { type: 'image/jpeg' });
    Object.defineProperty(grande, 'size', { value: 5 * 1024 * 1024 + 1 });

    component.onFotoNotaFiscal(eventoArquivo(grande));

    expect(component.fotoNotaFiscal()).toBeNull();
    expect(TestBed.inject(AvisosService).avisos()[0].texto).toContain('5 MB');
  });

  describe('ocorrência na "Nova manutenção"', () => {
    const ocorrencia = (id: string, status?: 'pendente' | 'em_andamento' | 'resolvida'): OcorrenciaDetalhada => ({
      id, diarioId: 'd1', tipo: `Tipo ${id}`, descricao: '', latitude: null, longitude: null,
      registradoEm: '2026-10-18T10:00:00Z', motoristaLogin: 'joao', motoristaNome: 'João', motoristaFoto: null,
      veiculoId: 'v1', veiculoDescricao: 'Caminhão 1', veiculoPlaca: null, status,
    });

    it('resolvidas não aparecem para vincular; sem status conta como pendente', () => {
      component.ocorrencias.set([ocorrencia('o1'), ocorrencia('o2', 'em_andamento'), ocorrencia('o3', 'resolvida')]);
      expect(component.ocorrenciasFiltradas().map(o => o.id)).toEqual(['o1', 'o2']);
    });

    it('depois de criar a manutenção ligada, a lista de ocorrências é buscada de novo', () => {
      const api = TestBed.inject(HttpTestingController);
      component.ocorrencias.set([ocorrencia('o1')]);
      component.abrirModal();
      component.novaManutencao.veiculoId = 'v1';
      component.novaManutencao.descricao = 'Troca do pneu';
      component.selecionarOcorrencia(ocorrencia('o1'));
      component.salvar();

      const post = api.expectOne(r => r.method === 'POST' && r.url === `${environment.apiUrl}/manutencoes`);
      expect(post.request.body.ocorrenciaId).toBe('o1');
      post.flush({ id: 'm1' });
      expect(component.ocorrencias()).toEqual([]);

      component.abrirModalOcorrencia();
      expect(api.match(r => r.method === 'GET' && r.url === `${environment.apiUrl}/ocorrencias`).length).toBe(1);
    });
  });
});
