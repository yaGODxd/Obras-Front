import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import * as L from 'leaflet';
import { ModalOcorrenciaComponent } from './modal-ocorrencia';
import { OcorrenciaDetalhada } from '../../../interfaces/ocorrencia';
import { environment } from '../../../../environments/environment';

const ocorrencia = (latitude: number | null, longitude: number | null): OcorrenciaDetalhada => ({
  id: 'o1', diarioId: 'd1', tipo: 'Pneu furado', descricao: 'Pneu traseiro', latitude, longitude,
  registradoEm: '2026-10-18T10:00:00', motoristaLogin: 'joao', motoristaNome: 'João', motoristaFoto: null,
  veiculoId: 'v1', veiculoDescricao: 'Caminhão 1', veiculoPlaca: 'ABC1D23',
});

describe('ModalOcorrenciaComponent', () => {
  let fixture: ComponentFixture<ModalOcorrenciaComponent>;

  beforeEach(async () => {
    vi.useFakeTimers();
    await TestBed.configureTestingModule({
      imports: [ModalOcorrenciaComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(ModalOcorrenciaComponent);
  });

  afterEach(() => vi.useRealTimers());

  it('com GPS: cria o mapa do local depois de 300 ms e o remove ao fechar', async () => {
    fixture.componentRef.setInput('ocorrencia', ocorrencia(-26.05, -51.35));
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.leaflet-container')).toBeNull();

    vi.advanceTimersByTime(300);
    expect(el.querySelector('.leaflet-container')).not.toBeNull();
    expect(el.querySelector('.badge-info')?.textContent?.trim()).toBe('Pneu furado');

    const remover = vi.spyOn(L.Map.prototype, 'remove');
    fixture.destroy();
    expect(remover).toHaveBeenCalledTimes(1);
    remover.mockRestore();
  });

  it('sem GPS: avisa e não cria mapa; fechar antes dos 300 ms não quebra', () => {
    fixture.componentRef.setInput('ocorrencia', ocorrencia(null, null));
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Sem localização registrada');

    fixture.destroy();
    expect(() => vi.advanceTimersByTime(300)).not.toThrow();
  });

  it('esconde o veículo na tela do veículo', () => {
    fixture.componentRef.setInput('ocorrencia', ocorrencia(null, null));
    fixture.componentRef.setInput('mostrarVeiculo', false);
    fixture.detectChanges();
    const texto = (fixture.nativeElement as HTMLElement).textContent;
    expect(texto).toContain('João');
    expect(texto).not.toContain('Caminhão 1');
  });

  describe('status', () => {
    const URL = `${environment.apiUrl}/ocorrencias/o1/status`;
    const el = () => fixture.nativeElement as HTMLElement;
    const botaoSalvar = () => Array.from(el().querySelectorAll('button')).find(b => b.textContent?.includes('Salvar status'))!;

    it('resposta antiga (sem status) aparece como Pendente; Salvar fica desligado até mudar', () => {
      fixture.componentRef.setInput('ocorrencia', ocorrencia(null, null));
      fixture.detectChanges();
      expect(el().textContent).toContain('Pendente');
      expect(botaoSalvar().disabled).toBe(true);
    });

    it('mostra "Resolvida em" e o número de manutenções ligadas', () => {
      fixture.componentRef.setInput('ocorrencia', {
        ...ocorrencia(null, null), status: 'resolvida', resolvidaEm: '2026-10-19T15:30:00Z',
        manutencoes: [{ id: 'm1', status: 'concluida' }, { id: 'm2', status: 'concluida' }],
      });
      fixture.detectChanges();
      expect(el().textContent).toContain('Resolvida em');
      expect(el().textContent).toMatch(/Manutenções ligadas\s*2/);
    });

    it('salvar envia { status } e avisa a tela com a ocorrência atualizada', () => {
      const api = TestBed.inject(HttpTestingController);
      fixture.componentRef.setInput('ocorrencia', ocorrencia(null, null));
      fixture.detectChanges();
      let recebida: OcorrenciaDetalhada | undefined;
      fixture.componentInstance.statusAlterado.subscribe(o => (recebida = o));

      fixture.componentInstance.statusEscolhido.set('resolvida');
      fixture.componentInstance.salvarStatus();
      const req = api.expectOne(URL);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ status: 'resolvida' });
      req.flush(null);

      expect(recebida?.status).toBe('resolvida');
      expect(recebida?.resolvidaEm).not.toBeNull();
      expect(fixture.componentInstance.statusAtual()).toBe('resolvida');
    });

    it('erro ao salvar mantém o status e não avisa a tela', () => {
      const api = TestBed.inject(HttpTestingController);
      fixture.componentRef.setInput('ocorrencia', ocorrencia(null, null));
      fixture.detectChanges();
      const avisar = vi.fn();
      fixture.componentInstance.statusAlterado.subscribe(avisar);

      fixture.componentInstance.statusEscolhido.set('em_andamento');
      fixture.componentInstance.salvarStatus();
      api.expectOne(URL).flush({ erro: 'Sem permissão.' }, { status: 403, statusText: 'Forbidden' });

      expect(avisar).not.toHaveBeenCalled();
      expect(fixture.componentInstance.statusAtual()).toBe('pendente');
      expect(fixture.componentInstance.salvandoStatus()).toBe(false);
    });
  });
});
