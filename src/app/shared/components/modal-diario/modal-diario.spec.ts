import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NEVER } from 'rxjs';
import { ModalDiarioComponent } from './modal-diario';
import { DiarioResponse, StatusDiario } from '../../../interfaces/diario';
import { FotosCache } from '../../services/fotos-cache';

function diario(status: StatusDiario): DiarioResponse {
  return {
    id: 'd1', status, veiculoDescricao: 'Caminhão 1', veiculoPlaca: 'ABC1D23', motoristaNome: 'João',
    medidorInicial: 1200, medidorFinal: 1250.5, medidorPercorrido: 50.5, destino: 'Centro',
    abertoEm: '2026-10-18T11:00:00', fechadoEm: '2026-10-18T19:00:00',
  };
}

describe('ModalDiarioComponent', () => {
  let fixture: ComponentFixture<ModalDiarioComponent>;
  const el = () => fixture.nativeElement as HTMLElement;
  const botao = (texto: string) =>
    Array.from(el().querySelectorAll('button')).find(b => b.textContent?.includes(texto))!;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalDiarioComponent],
      providers: [{ provide: FotosCache, useValue: { fotosDoDiario: () => NEVER, url: () => NEVER } }],
    }).compileComponents();
    fixture = TestBed.createComponent(ModalDiarioComponent);
    fixture.componentRef.setInput('diario', diario('fechado'));
  });

  it('cabeçalho com a data e o rótulo completo da situação; resumo com a unidade do medidor', async () => {
    fixture.componentRef.setInput('tipoMedidor', 'horimetro');
    await fixture.whenStable();
    expect(el().querySelector('h3')?.textContent).toContain('Diário de 18/10/2026');
    expect(el().querySelector('app-status-badge')?.textContent?.trim()).toBe('Pendente de assinatura');
    expect(el().textContent).toContain('João');
    expect(el().textContent).toContain('ABC1D23');
    expect(el().textContent).toContain('1.250,5 h');
    expect(el().textContent).toContain('50,5 h');
  });

  it('veículo sem placa (null): mostra "Sem placa"', async () => {
    fixture.componentRef.setInput('diario', { ...diario('fechado'), veiculoPlaca: null });
    await fixture.whenStable();
    expect(el().textContent).toContain('Caminhão 1');
    expect(el().textContent).toContain('Sem placa');
  });

  it('carregando: contadores com traço e spinner', async () => {
    await fixture.whenStable();
    expect(el().textContent).toContain('Abastecimentos: -');
    expect(el().querySelector('.loading')).not.toBeNull();
  });

  it('totais de litros e valor, e as contagens de relance', async () => {
    fixture.componentRef.setInput('estado', {
      tipo: 'pronto',
      abastecimentos: [
        { tipoCombustivel: 'Diesel S10', litros: 50, valorTotal: 300, posto: 'Posto Central', registradoEm: '2026-10-18T12:00:00' },
        { tipoCombustivel: 'Diesel S10', litros: 20.5, valorTotal: 123.5, posto: null, registradoEm: null },
      ],
      ocorrencias: [
        { tipo: 'Pneu furado', descricao: 'Pneu traseiro', latitude: -26.04, longitude: -51.34, registradoEm: '2026-10-18T13:00:00' },
      ],
    });
    await fixture.whenStable();
    const texto = el().textContent ?? '';
    expect(texto).toContain('Abastecimentos: 2');
    expect(texto).toContain('Ocorrências: 1');
    const total = el().querySelector('tfoot')!.textContent ?? '';
    expect(total).toContain('70,5 L');
    expect(total).toContain('R$ 423,50');
    expect(texto).toContain('Pneu traseiro');
    expect(texto).toContain('Local registrado');
  });

  it('ocorrências: selo de status (sem status = Pendente) e filtro por status', async () => {
    const base = { descricao: '', latitude: null, longitude: null, registradoEm: null };
    fixture.componentRef.setInput('estado', {
      tipo: 'pronto', abastecimentos: [],
      ocorrencias: [
        { ...base, id: 'o1', tipo: 'Pneu furado' },
        { ...base, id: 'o2', tipo: 'Pane elétrica', status: 'resolvida', resolvidaEm: '2026-10-18T20:00:00Z' },
      ],
    });
    await fixture.whenStable();
    const selos = () => Array.from(el().querySelectorAll('li app-status-badge')).map(b => b.textContent?.trim());
    expect(selos()).toEqual(['Pneu furado', 'Pendente', 'Pane elétrica', 'Resolvida']);

    fixture.componentInstance.filtroStatusOcorrencia.set('resolvida');
    await fixture.whenStable();
    expect(el().textContent).toContain('Pane elétrica');
    expect(el().textContent).not.toContain('Pneu furado');

    fixture.componentInstance.filtroStatusOcorrencia.set('em_andamento');
    await fixture.whenStable();
    expect(el().textContent).toContain('Nenhuma ocorrência com este status.');
  });

  it('vazio: mensagens e "nenhum"/"nenhuma"', async () => {
    fixture.componentRef.setInput('estado', { tipo: 'pronto', abastecimentos: [], ocorrencias: [] });
    await fixture.whenStable();
    const texto = el().textContent ?? '';
    expect(texto).toContain('Abastecimentos: nenhum');
    expect(texto).toContain('Ocorrências: nenhuma');
    expect(texto).toContain('Nenhum abastecimento neste diário.');
    expect(texto).toContain('Nenhuma ocorrência neste diário.');
  });

  it('erro: mostra a mensagem e "Tentar de novo" avisa o pai', async () => {
    fixture.componentRef.setInput('estado', { tipo: 'erro', mensagem: 'Sem conexão com o servidor.' });
    await fixture.whenStable();
    let tentou = 0;
    fixture.componentInstance.tentarDeNovo.subscribe(() => tentou++);
    expect(el().textContent).toContain('Sem conexão com o servidor.');
    botao('Tentar de novo').click();
    expect(tentou).toBe(1);
  });

  it('integridade só em diário assinado, como texto (sem botão para verificar)', async () => {
    await fixture.whenStable();
    expect(el().textContent).not.toContain('Integridade da assinatura');

    fixture.componentRef.setInput('diario', diario('assinado'));
    await fixture.whenStable();
    expect(el().textContent).toContain('Verificando a assinatura');
    expect(botao('Verificar')).toBeUndefined();

    fixture.componentRef.setInput('verificacao', { tipo: 'resultado', integro: false, mensagem: 'Conteúdo alterado.', assinadoEm: null });
    await fixture.whenStable();
    expect(el().textContent).toContain('Alterado depois da assinatura');
    expect(el().textContent).toContain('Conteúdo alterado.');
  });

  it('erro na verificação: "Tentar de novo" avisa o pai', async () => {
    fixture.componentRef.setInput('diario', diario('assinado'));
    fixture.componentRef.setInput('estado', { tipo: 'pronto', abastecimentos: [], ocorrencias: [] });
    fixture.componentRef.setInput('verificacao', { tipo: 'erro', mensagem: 'Diário não encontrado.' });
    await fixture.whenStable();
    let verificou = 0;
    fixture.componentInstance.verificar.subscribe(() => verificou++);
    expect(el().textContent).toContain('Diário não encontrado.');
    botao('Tentar de novo').click();
    expect(verificou).toBe(1);
  });

  it('atalhos e fechar avisam o pai', async () => {
    await fixture.whenStable();
    const eventos: string[] = [];
    const c = fixture.componentInstance;
    c.verRota.subscribe(() => eventos.push('rota'));
    c.checklist.subscribe(() => eventos.push('checklist'));
    c.fechar.subscribe(() => eventos.push('fechar'));
    botao('Ver rota').click();
    botao('Checklist').click();
    el().querySelector<HTMLButtonElement>('button[aria-label="Fechar"]')!.click();
    expect(eventos).toEqual(['rota', 'checklist', 'fechar']);
  });
});
