import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import {
  UsuarioService, VeiculoResponse, AbastecimentoDetalhado,
  OcorrenciaDetalhada, ManutencaoResponse, MotoristaVeiculoInfo
} from '../../../services/usuario';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-veiculo-detalhe',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './veiculo-detalhe.html',
  styleUrl: './veiculo-detalhe.css'
})
export class VeiculoDetalhe implements OnInit {

  veiculoId = '';
  veiculo            = signal<VeiculoResponse | null>(null);
  abastecimentos     = signal<AbastecimentoDetalhado[]>([]);
  ocorrencias        = signal<OcorrenciaDetalhada[]>([]);
  manutencoes        = signal<ManutencaoResponse[]>([]);
  motoristaMaisUsou  = signal<MotoristaVeiculoInfo | null>(null);
  ultimoMotorista    = signal<MotoristaVeiculoInfo | null>(null);
  carregando         = signal(true);
  gerandoPDF         = signal(false);
  abaAtiva           = signal('abastecimentos');

  ocorrenciaSelecionada = signal<OcorrenciaDetalhada | null>(null);
  mapaIniciado = false;
  private mapaLeaflet: any = null;

  periodoInicio = signal('');
  periodoFim    = signal('');
  modalPeriodo  = signal<'relatorio' | 'pecas' | null>(null);

  totalLitros = computed(() =>
    this.abastecimentos().reduce((acc, a) => acc + a.litros, 0)
  );
  totalGasto = computed(() =>
    this.abastecimentos().reduce((acc, a) => acc + a.valorTotal, 0)
  );
  totalCustoManutencao = computed(() =>
    this.manutencoes().reduce((acc, m) => acc + m.custoTotal, 0)
  );

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public usuarioService: UsuarioService
  ) {}

  ngOnInit(): void {
    this.veiculoId = this.route.snapshot.paramMap.get('id') ?? '';
    this.carregarDados();
  }

  private carregarDados(): void {
    this.usuarioService.buscarVeiculo(this.veiculoId).subscribe({
      next: (v) => { this.veiculo.set(v); this.carregando.set(false); },
      error: () => { this.carregando.set(false); this.router.navigate(['/veiculos']); }
    });
    this.usuarioService.listarAbastecimentosPorVeiculo(this.veiculoId).subscribe({ next: d => this.abastecimentos.set(d) });
    this.usuarioService.listarOcorrenciasPorVeiculo(this.veiculoId).subscribe({ next: d => this.ocorrencias.set(d) });
    this.usuarioService.listarManutencoesPorVeiculo(this.veiculoId).subscribe({ next: d => this.manutencoes.set(d) });
    this.usuarioService.buscarMotoristasVeiculo(this.veiculoId).subscribe({
      next: data => { this.motoristaMaisUsou.set(data.maisUsou); this.ultimoMotorista.set(data.ultimo); }
    });
  }

  setAba(aba: string): void { this.abaAtiva.set(aba); }

  // ─── período / PDF ────────────────────────────────────────────────────────

  abrirModalPeriodo(tipo: 'relatorio' | 'pecas'): void {
    this.periodoInicio.set('');
    this.periodoFim.set('');
    this.modalPeriodo.set(tipo);
  }

  fecharModalPeriodo(): void { this.modalPeriodo.set(null); }

  confirmarRelatorio(): void {
    const tipo = this.modalPeriodo();
    this.fecharModalPeriodo();
    if (tipo === 'relatorio') this.gerarRelatorio();
    else if (tipo === 'pecas') this.gerarRelatorioPecas();
  }

  private filtrarPorPeriodo<T>(lista: T[], campo: keyof T): T[] {
    let res = lista;
    if (this.periodoInicio()) {
      const ini = new Date(this.periodoInicio());
      res = res.filter(i => i[campo] && new Date(i[campo] as string) >= ini);
    }
    if (this.periodoFim()) {
      const fim = new Date(this.periodoFim());
      fim.setHours(23, 59, 59);
      res = res.filter(i => i[campo] && new Date(i[campo] as string) <= fim);
    }
    return res;
  }

  gerarRelatorio(): void {
    const v = this.veiculo();
    if (!v) return;
    this.gerandoPDF.set(true);

    const abastecimentos = this.filtrarPorPeriodo(this.abastecimentos(), 'registradoEm' as any);
    const ocorrencias    = this.filtrarPorPeriodo(this.ocorrencias(), 'registradoEm' as any);
    const manutencoes    = this.filtrarPorPeriodo(this.manutencoes(), 'abertaEm' as any);

    const totalLitros     = abastecimentos.reduce((acc, a) => acc + a.litros, 0);
    const totalGasto      = abastecimentos.reduce((acc, a) => acc + a.valorTotal, 0);
    const totalCustoManut = manutencoes.reduce((acc, m) => acc + m.custoTotal, 0);
    const unidade         = v.tipoMedidor === 'horimetro' ? 'h' : 'km';

    const doc = new jsPDF({ orientation: 'landscape' });

    doc.setFontSize(16); doc.setTextColor(63, 81, 181);
    doc.text('Secretaria de Obras — Cruz Machado/PR', 14, 15);
    doc.setFontSize(13); doc.setTextColor(0, 0, 0);
    doc.text(`Relatório do Veículo: ${v.descricao}`, 14, 23);
    doc.setFontSize(9); doc.setTextColor(100, 100, 100);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 30);
    if (this.periodoInicio() || this.periodoFim())
      doc.text(`Período: ${this.periodoInicio() || '—'} até ${this.periodoFim() || '—'}`, 14, 36);

    doc.setFontSize(11); doc.setTextColor(0, 0, 0);
    doc.text('Informações do Veículo', 14, 42);
    autoTable(doc, {
      startY: 46,
      head: [['Descrição', 'Tipo', 'Marca/Modelo', 'Ano', 'Placa', 'Medidor', 'Status']],
      body: [[
        v.descricao, v.tipoNome,
        `${v.marca ?? ''} ${v.modelo ?? ''}`.trim() || '-',
        v.ano?.toString() ?? '-', v.placa ?? 'S/P',
        `${v.medidorAtual.toLocaleString('pt-BR')} ${unidade}`,
        this.labelStatus(v.status)
      ]],
      styles: { fontSize: 9 }, headStyles: { fillColor: [63, 81, 181] }
    });

    const yRes = (doc as any).lastAutoTable.finalY + 8;
    doc.setFontSize(11); doc.text('Resumo do período', 14, yRes);
    autoTable(doc, {
      startY: yRes + 4,
      head: [['Abastecimentos', 'Litros', 'Gasto Combustível', 'Ocorrências', 'Manutenções', 'Custo Manutenções']],
      body: [[
        abastecimentos.length.toString(),
        `${totalLitros.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} L`,
        `R$ ${totalGasto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        ocorrencias.length.toString(),
        manutencoes.length.toString(),
        `R$ ${totalCustoManut.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      ]],
      styles: { fontSize: 9 }, headStyles: { fillColor: [100, 116, 139] }
    });

    if (abastecimentos.length > 0) {
      const y = (doc as any).lastAutoTable.finalY + 8;
      doc.setFontSize(11); doc.text('Abastecimentos', 14, y);
      autoTable(doc, {
        startY: y + 4,
        head: [['Data', 'Motorista', 'Combustível', 'Litros', 'Valor', 'Posto']],
        body: abastecimentos.map(a => [
          a.registradoEm ? new Date(a.registradoEm).toLocaleDateString('pt-BR') : '-',
          a.motoristaNome, a.tipoCombustivel,
          `${a.litros.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} L`,
          `R$ ${a.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          a.posto ?? '-'
        ]),
        foot: [['', '', 'Total',
          `${totalLitros.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} L`,
          `R$ ${totalGasto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, ''
        ]],
        styles: { fontSize: 8 }, headStyles: { fillColor: [63, 81, 181] },
        footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
      });
    }

    if (ocorrencias.length > 0) {
      const y = (doc as any).lastAutoTable.finalY + 8;
      doc.setFontSize(11); doc.text('Ocorrências', 14, y);
      autoTable(doc, {
        startY: y + 4,
        head: [['Data', 'Motorista', 'Tipo', 'Descrição', 'GPS']],
        body: ocorrencias.map(o => [
          o.registradoEm ? new Date(o.registradoEm).toLocaleDateString('pt-BR') : '-',
          o.motoristaNome, o.tipo, o.descricao,
          o.latitude && o.longitude ? 'Sim' : 'Não'
        ]),
        styles: { fontSize: 8 }, headStyles: { fillColor: [239, 68, 68] }
      });
    }

    if (manutencoes.length > 0) {
      const y = (doc as any).lastAutoTable.finalY + 8;
      doc.setFontSize(11); doc.text('Manutenções', 14, y);
      autoTable(doc, {
        startY: y + 4,
        head: [['Data', 'Tipo', 'Descrição', 'Mecânico', 'MO', 'Peças', 'Total', 'Status']],
        body: manutencoes.map(m => [
          m.abertaEm ? new Date(m.abertaEm).toLocaleDateString('pt-BR') : '-',
          m.tipo === 'preventiva' ? 'Preventiva' : 'Corretiva',
          m.descricao, m.mecanicoResponsavel ?? '-',
          `R$ ${m.custoMaoObra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          `R$ ${m.custoPecas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          `R$ ${m.custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          this.labelStatusManutencao(m.status)
        ]),
        foot: [['', '', '', 'Total',
          `R$ ${manutencoes.reduce((a, m) => a + m.custoMaoObra, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          `R$ ${manutencoes.reduce((a, m) => a + m.custoPecas, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          `R$ ${totalCustoManut.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, ''
        ]],
        styles: { fontSize: 8 }, headStyles: { fillColor: [245, 158, 11] },
        footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
      });
    }

    doc.save(`relatorio_${v.descricao.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().slice(0, 10)}.pdf`);
    this.gerandoPDF.set(false);
  }

  gerarRelatorioPecas(): void {
    const v = this.veiculo();
    if (!v) return;

    const manutencoes = this.filtrarPorPeriodo(this.manutencoes(), 'abertaEm' as any);
    const pecasMap = new Map<string, { nomePeca: string; codigoPeca: string | null; marcaPeca: string | null; quantidadeTotal: number; valorUnitario: number; vezes: number }>();

    manutencoes.forEach(m => {
      m.pecas.forEach(p => {
        const chave = `${p.nomePeca}|${p.codigoPeca ?? ''}|${p.marcaPeca ?? ''}`;
        if (pecasMap.has(chave)) {
          const e = pecasMap.get(chave)!;
          e.quantidadeTotal += p.quantidade;
          e.vezes += 1;
        } else {
          pecasMap.set(chave, { nomePeca: p.nomePeca, codigoPeca: p.codigoPeca, marcaPeca: p.marcaPeca, quantidadeTotal: p.quantidade, valorUnitario: p.valorUnitario, vezes: 1 });
        }
      });
    });

    const pecas = Array.from(pecasMap.values()).sort((a, b) => a.nomePeca.localeCompare(b.nomePeca));
    if (pecas.length === 0) { alert('Nenhuma peça registrada no período.'); return; }

    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16); doc.setTextColor(63, 81, 181);
    doc.text('Secretaria de Obras — Cruz Machado/PR', 14, 15);
    doc.setFontSize(13); doc.setTextColor(0, 0, 0);
    doc.text(`Relação de Peças — ${v.descricao}`, 14, 23);
    doc.setFontSize(9); doc.setTextColor(100, 100, 100);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 30);

    autoTable(doc, {
      startY: 38,
      head: [['Peça', 'Código', 'Marca', 'Qtd total', 'Valor unit.', 'Vezes utilizada']],
      body: pecas.map(p => [
        p.nomePeca, p.codigoPeca ?? '-', p.marcaPeca ?? '-',
        p.quantidadeTotal.toString(),
        `R$ ${p.valorUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        p.vezes.toString()
      ]),
      styles: { fontSize: 9 }, headStyles: { fillColor: [63, 81, 181] }
    });

    doc.save(`pecas_${v.descricao.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  // ─── mapa ocorrência ──────────────────────────────────────────────────────

  abrirModalOcorrencia(o: OcorrenciaDetalhada): void {
    this.ocorrenciaSelecionada.set(o);
    this.mapaIniciado = false;
    if (o.latitude && o.longitude) {
      setTimeout(() => this.iniciarMapa(o.latitude!, o.longitude!), 300);
    }
  }

  fecharModalOcorrencia(): void {
    this.ocorrenciaSelecionada.set(null);
    if (this.mapaLeaflet) { this.mapaLeaflet.remove(); this.mapaLeaflet = null; }
  }

  private iniciarMapa(lat: number, lng: number): void {
    if (this.mapaIniciado) return;
    this.mapaIniciado = true;
    const container = document.getElementById('mapa-ocorrencia-detalhe');
    if (!container) return;
    if (this.mapaLeaflet) { this.mapaLeaflet.remove(); this.mapaLeaflet = null; }
    this.mapaLeaflet = L.map(container).setView([lat, lng], 16);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: 'Tiles © Esri' }).addTo(this.mapaLeaflet);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      { attribution: '' }).addTo(this.mapaLeaflet);
    const icone = L.divIcon({
      className: '',
      html: `<span style="display:block;width:16px;height:16px;border-radius:50%;background:#ef4444;border:2px solid #fff;box-shadow:0 0 0 3px #ef444440;"></span>`,
      iconSize: [16, 16], iconAnchor: [8, 8]
    });
    L.marker([lat, lng], { icon: icone }).bindPopup('Local da ocorrência').openPopup().addTo(this.mapaLeaflet);
  }

  // ─── helpers ─────────────────────────────────────────────────────────────

  voltar(): void { this.router.navigate(['/veiculos']); }
  verManutencao(id: string): void { this.router.navigate(['/manutencao', id]); }

  getMedidor(v: VeiculoResponse): string {
    return `${v.medidorAtual.toLocaleString('pt-BR')} ${v.tipoMedidor === 'horimetro' ? 'h' : 'km'}`;
  }

  getIniciais(nome: string): string {
    return nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  }

  badgeStatus(status: string): string {
    const m: any = { disponivel: 'badge-success', em_uso: 'badge-warning', manutencao: 'badge-error', inativo: 'badge-ghost' };
    return m[status] ?? 'badge-ghost';
  }
  labelStatus(status: string): string {
    const m: any = { disponivel: 'Disponível', em_uso: 'Em uso', manutencao: 'Em manutenção', inativo: 'Inativo' };
    return m[status] ?? status;
  }
  badgeStatusManutencao(status: string): string {
    const m: any = { aberta: 'badge-error', em_andamento: 'badge-warning', concluida: 'badge-success' };
    return m[status] ?? 'badge-ghost';
  }
  labelStatusManutencao(status: string): string {
    const m: any = { aberta: 'Aberta', em_andamento: 'Em andamento', concluida: 'Concluída' };
    return m[status] ?? status;
  }
  badgeTipoManutencao(tipo: string): string { return tipo === 'preventiva' ? 'badge-info' : 'badge-warning'; }
  labelTipoManutencao(tipo: string): string { return tipo === 'preventiva' ? 'Preventiva' : 'Corretiva'; }

  getCorCombustivel(tipo: string): string {
    const t = tipo.toLowerCase();
    if (t.includes('diesel')) return 'badge-warning';
    if (t.includes('gasolina')) return 'badge-error';
    if (t.includes('etanol')) return 'badge-success';
    if (t.includes('gnv')) return 'badge-info';
    return 'badge-neutral';
  }
  getCorTipo(tipo: string): string {
    const t = tipo.toLowerCase();
    if (t.includes('acidente')) return 'badge-error';
    if (t.includes('pane')) return 'badge-warning';
    if (t.includes('pneu')) return 'badge-info';
    return 'badge-neutral';
  }
}