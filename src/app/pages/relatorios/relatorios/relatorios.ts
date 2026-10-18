import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsuarioService, AbastecimentoDetalhado, OcorrenciaDetalhada, ManutencaoResponse, DiarioResponse, VeiculoResponse, UsuarioResponse } from '../../../services/usuario';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-relatorios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './relatorios.html',
  styleUrl: './relatorios.css'
})
export class RelatoriosComponent implements OnInit {

  abaAtiva = signal('operacionais');
  carregando = signal(false);

  // Dados base
  veiculos = signal<VeiculoResponse[]>([]);
  usuarios = signal<UsuarioResponse[]>([]);

  // Filtros operacionais
  tipoRelatorio = signal('abastecimentos');
  filtroInicio = signal('');
  filtroFim = signal('');
  filtroVeiculoId = signal('');

  // Veículos selecionados para relatório por veículo
  veiculosSelecionados: string[] = [];
  buscaVeiculo = signal('');
  mostrarSugestoes = signal(false);

  veiculosFiltradosBusca = computed(() => {
    const termo = this.buscaVeiculo().toLowerCase();
    if (!termo) return this.veiculos();
    return this.veiculos().filter(v =>
      v.descricao.toLowerCase().includes(termo) ||
      (v.placa?.toLowerCase().includes(termo) ?? false)
    );
  });

  veiculosSelecionadosDetalhes = computed(() =>
    this.veiculos().filter(v => this.veiculosSelecionados.includes(v.id))
  );

  tipos = [
    { valor: 'abastecimentos', label: 'Abastecimentos', icone: 'ti-droplet' },
    { valor: 'ocorrencias', label: 'Ocorrências', icone: 'ti-alert-triangle' },
    { valor: 'manutencoes', label: 'Manutenções', icone: 'ti-tool' },
    { valor: 'diarios', label: 'Lançamento Mensal', icone: 'ti-clipboard-list' }
  ];

  constructor(private usuarioService: UsuarioService) {}

  ngOnInit(): void {
    this.usuarioService.listarVeiculos().subscribe({ next: (data) => this.veiculos.set(data) });
    this.usuarioService.listarUsuarios().subscribe({ next: (data) => this.usuarios.set(data) });
  }

  // ==================== VEÍCULOS SELECIONADOS ====================

  adicionarVeiculo(v: VeiculoResponse, event: MouseEvent): void {
  event.preventDefault();
  if (!this.veiculosSelecionados.includes(v.id)) {
    this.veiculosSelecionados = [...this.veiculosSelecionados, v.id];
  }
  this.buscaVeiculo.set('');
  this.mostrarSugestoes.set(false);
}

  removerVeiculo(id: string): void {
    this.veiculosSelecionados = this.veiculosSelecionados.filter(v => v !== id);
  }

  // ==================== OPERACIONAIS ====================

  gerarCSV(): void {
    this.carregando.set(true);
    const tipo = this.tipoRelatorio();
    if (tipo === 'abastecimentos') {
      this.usuarioService.listarAbastecimentos().subscribe({
        next: (data) => { this.downloadCSV(this.abastecimentosParaCSV(this.filtrar(data, 'registradoEm')), 'abastecimentos'); this.carregando.set(false); },
        error: () => this.carregando.set(false)
      });
    } else if (tipo === 'ocorrencias') {
      this.usuarioService.listarOcorrencias().subscribe({
        next: (data) => { this.downloadCSV(this.ocorrenciasParaCSV(this.filtrar(data, 'registradoEm')), 'ocorrencias'); this.carregando.set(false); },
        error: () => this.carregando.set(false)
      });
    } else if (tipo === 'manutencoes') {
      this.usuarioService.listarManutencoes().subscribe({
        next: (data) => { this.downloadCSV(this.manutencoesParaCSV(this.filtrar(data, 'abertaEm')), 'manutencoes'); this.carregando.set(false); },
        error: () => this.carregando.set(false)
      });
    } else if (tipo === 'diarios') {
      this.usuarioService.listarDiarios(this.filtroVeiculoId() || undefined).subscribe({
        next: (data) => { this.downloadCSV(this.diariosParaCSV(this.filtrar(data, 'abertoEm')), 'diarios'); this.carregando.set(false); },
        error: () => this.carregando.set(false)
      });
    }
  }

  gerarPDF(): void {
    this.carregando.set(true);
    const tipo = this.tipoRelatorio();
    if (tipo === 'abastecimentos') {
      this.usuarioService.listarAbastecimentos().subscribe({
        next: (data) => { this.abastecimentosPDF(this.filtrar(data, 'registradoEm')); this.carregando.set(false); },
        error: () => this.carregando.set(false)
      });
    } else if (tipo === 'ocorrencias') {
      this.usuarioService.listarOcorrencias().subscribe({
        next: (data) => { this.ocorrenciasPDF(this.filtrar(data, 'registradoEm')); this.carregando.set(false); },
        error: () => this.carregando.set(false)
      });
    } else if (tipo === 'manutencoes') {
      this.usuarioService.listarManutencoes().subscribe({
        next: (data) => { this.manutencoesPDF(this.filtrar(data, 'abertaEm')); this.carregando.set(false); },
        error: () => this.carregando.set(false)
      });
    } else if (tipo === 'diarios') {
      this.usuarioService.listarDiarios(this.filtroVeiculoId() || undefined).subscribe({
        next: (data) => { this.diariosPDF(this.filtrar(data, 'abertoEm')); this.carregando.set(false); },
        error: () => this.carregando.set(false)
      });
    }
  }

  // ==================== CADASTRAIS ====================

  gerarCadastralVeiculos(): void {
    this.carregando.set(true);
    const doc = this.criarPDF('Relatório Cadastral de Veículos', false);
    autoTable(doc, {
      startY: 38,
      head: [['Descrição', 'Marca', 'Modelo', 'Ano', 'Cor', 'Placa', 'Tipo', 'RENAVAM', 'Chassi', 'Status']],
      body: this.veiculos().map(v => [
        v.descricao, v.marca ?? '-', v.modelo ?? '-', v.ano?.toString() ?? '-',
        v.cor ?? '-', v.placa ?? 'S/P', v.tipoNome,
        v.renavam ?? '-', v.chassi ?? '-', this.labelStatus(v.status)
      ]),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [63, 81, 181] }
    });
    doc.save(`cadastro_veiculos_${new Date().toISOString().slice(0, 10)}.pdf`);
    this.carregando.set(false);
  }

  gerarCadastralUsuarios(): void {
    this.carregando.set(true);
    const doc = this.criarPDF('Relatório Cadastral de Usuários', false);
    autoTable(doc, {
      startY: 38,
      head: [['Nome', 'Login', 'Perfil', 'Matrícula', 'Vínculo', 'Secretaria', 'Cat. CNH', 'Validade CNH', 'Telefone', 'Status']],
      body: this.usuarios().map(u => [
        u.nomeCompleto, u.login, u.perfil,
        u.matricula ?? '-', u.vinculo ?? '-', u.secretariaNome ?? '-',
        u.categoriaCnh ?? '-',
        u.validadeCnh ? new Date(u.validadeCnh).toLocaleDateString('pt-BR') : '-',
        u.telefone ?? '-', u.ativo ? 'Ativo' : 'Inativo'
      ]),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [63, 81, 181] }
    });
    doc.save(`cadastro_usuarios_${new Date().toISOString().slice(0, 10)}.pdf`);
    this.carregando.set(false);
  }

  gerarRelatorioVeiculosSelecionados(): void {
    if (this.veiculosSelecionados.length === 0) return;
    this.carregando.set(true);

    const requests = this.veiculosSelecionados.map(id =>
      forkJoin({
        abastecimentos: this.usuarioService.listarAbastecimentosPorVeiculo(id),
        ocorrencias: this.usuarioService.listarOcorrenciasPorVeiculo(id),
        manutencoes: this.usuarioService.listarManutencoesPorVeiculo(id)
      })
    );

    let concluidos = 0;
    this.veiculosSelecionados.forEach((id, index) => {
      const veiculo = this.veiculos().find(v => v.id === id)!;
      forkJoin({
        abastecimentos: this.usuarioService.listarAbastecimentosPorVeiculo(id),
        ocorrencias: this.usuarioService.listarOcorrenciasPorVeiculo(id),
        manutencoes: this.usuarioService.listarManutencoesPorVeiculo(id)
      }).subscribe({
        next: (data) => {
          this.gerarPDFVeiculoIndividual(veiculo, data.abastecimentos, data.ocorrencias, data.manutencoes);
          concluidos++;
          if (concluidos === this.veiculosSelecionados.length) this.carregando.set(false);
        },
        error: () => { concluidos++; if (concluidos === this.veiculosSelecionados.length) this.carregando.set(false); }
      });
    });
  }

  private gerarPDFVeiculoIndividual(
    v: VeiculoResponse,
    abastecimentos: AbastecimentoDetalhado[],
    ocorrencias: OcorrenciaDetalhada[],
    manutencoes: ManutencaoResponse[]
  ): void {
    const doc = new jsPDF({ orientation: 'landscape' });
    const unidade = v.tipoMedidor === 'horimetro' ? 'h' : 'km';

    doc.setFontSize(16); doc.setTextColor(63, 81, 181);
    doc.text('Secretaria de Obras — Cruz Machado/PR', 14, 15);
    doc.setFontSize(13); doc.setTextColor(0, 0, 0);
    doc.text(`Relatório do Veículo: ${v.descricao}`, 14, 23);
    doc.setFontSize(9); doc.setTextColor(100, 100, 100);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 30);

    autoTable(doc, {
      startY: 36,
      head: [['Descrição', 'Marca/Modelo', 'Ano', 'Placa', 'Medidor', 'Status']],
      body: [[v.descricao, `${v.marca ?? '-'} ${v.modelo ?? ''}`.trim(), v.ano?.toString() ?? '-', v.placa ?? 'S/P', `${v.medidorAtual} ${unidade}`, this.labelStatus(v.status)]],
      styles: { fontSize: 8 }, headStyles: { fillColor: [63, 81, 181] }
    });

    // Resumo
    const yRes = (doc as any).lastAutoTable.finalY + 6;
    autoTable(doc, {
      startY: yRes,
      head: [['Abastecimentos', 'Total Litros', 'Gasto Combustível', 'Ocorrências', 'Manutenções', 'Custo Manutenções']],
      body: [[
        abastecimentos.length.toString(),
        `${abastecimentos.reduce((a, b) => a + b.litros, 0).toFixed(1)} L`,
        `R$ ${abastecimentos.reduce((a, b) => a + b.valorTotal, 0).toFixed(2)}`,
        ocorrencias.length.toString(),
        manutencoes.length.toString(),
        `R$ ${manutencoes.reduce((a, b) => a + b.custoTotal, 0).toFixed(2)}`
      ]],
      styles: { fontSize: 8 }, headStyles: { fillColor: [100, 116, 139] }
    });

    if (abastecimentos.length > 0) {
      const y = (doc as any).lastAutoTable.finalY + 6;
      doc.setFontSize(10); doc.setTextColor(0,0,0); doc.text('Abastecimentos', 14, y);
      autoTable(doc, {
        startY: y + 4,
        head: [['Data', 'Motorista', 'Combustível', 'Litros', 'Valor', 'Posto']],
        body: abastecimentos.map(a => [this.formatarData(a.registradoEm), a.motoristaNome, a.tipoCombustivel, `${a.litros.toFixed(1)} L`, `R$ ${a.valorTotal.toFixed(2)}`, a.posto ?? '-']),
        styles: { fontSize: 7 }, headStyles: { fillColor: [63, 81, 181] }
      });
    }

    if (ocorrencias.length > 0) {
      const y = (doc as any).lastAutoTable.finalY + 6;
      doc.setFontSize(10); doc.text('Ocorrências', 14, y);
      autoTable(doc, {
        startY: y + 4,
        head: [['Data', 'Motorista', 'Tipo', 'Descrição']],
        body: ocorrencias.map(o => [this.formatarData(o.registradoEm), o.motoristaNome, o.tipo, o.descricao]),
        styles: { fontSize: 7 }, headStyles: { fillColor: [239, 68, 68] }
      });
    }

    if (manutencoes.length > 0) {
      const y = (doc as any).lastAutoTable.finalY + 6;
      doc.setFontSize(10); doc.text('Manutenções', 14, y);
      autoTable(doc, {
        startY: y + 4,
        head: [['Data', 'Tipo', 'Descrição', 'Mecânico', 'Total', 'Status']],
        body: manutencoes.map(m => [this.formatarData(m.abertaEm), m.tipo, m.descricao, m.mecanicoResponsavel ?? '-', `R$ ${m.custoTotal.toFixed(2)}`, m.status]),
        styles: { fontSize: 7 }, headStyles: { fillColor: [245, 158, 11] }
      });
    }

    doc.save(`relatorio_${v.descricao.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  // ==================== ANÁLISES ====================

  gerarCustosGerais(): void {
    this.carregando.set(true);
    forkJoin({
      abastecimentos: this.usuarioService.listarAbastecimentos(),
      manutencoes: this.usuarioService.listarManutencoes()
    }).subscribe({
      next: ({ abastecimentos, manutencoes }) => {
        const porVeiculo: Record<string, { descricao: string; placa: string | null; litros: number; custoCombus: number; custoManut: number }> = {};
        abastecimentos.forEach(a => {
          if (!porVeiculo[a.veiculoId]) porVeiculo[a.veiculoId] = { descricao: a.veiculoDescricao, placa: a.veiculoPlaca, litros: 0, custoCombus: 0, custoManut: 0 };
          porVeiculo[a.veiculoId].litros += a.litros;
          porVeiculo[a.veiculoId].custoCombus += a.valorTotal;
        });
        manutencoes.forEach(m => {
          if (!porVeiculo[m.veiculoId]) porVeiculo[m.veiculoId] = { descricao: m.veiculoDescricao, placa: m.veiculoPlaca, litros: 0, custoCombus: 0, custoManut: 0 };
          porVeiculo[m.veiculoId].custoManut += m.custoTotal;
        });

        const lista = Object.values(porVeiculo).sort((a, b) => (b.custoCombus + b.custoManut) - (a.custoCombus + a.custoManut));
        const doc = this.criarPDF('Relatório de Custos Gerais por Veículo', false);
        autoTable(doc, {
          startY: 38,
          head: [['Veículo', 'Placa', 'Litros', 'Custo Combustível', 'Custo Manutenção', 'Total Geral']],
          body: lista.map(v => [
            v.descricao, v.placa ?? 'S/P',
            `${v.litros.toFixed(1)} L`,
            `R$ ${v.custoCombus.toFixed(2)}`,
            `R$ ${v.custoManut.toFixed(2)}`,
            `R$ ${(v.custoCombus + v.custoManut).toFixed(2)}`
          ]),
          foot: [['Total', '', `${lista.reduce((a, b) => a + b.litros, 0).toFixed(1)} L`,
            `R$ ${lista.reduce((a, b) => a + b.custoCombus, 0).toFixed(2)}`,
            `R$ ${lista.reduce((a, b) => a + b.custoManut, 0).toFixed(2)}`,
            `R$ ${lista.reduce((a, b) => a + b.custoCombus + b.custoManut, 0).toFixed(2)}`
          ]],
          styles: { fontSize: 8 }, headStyles: { fillColor: [63, 81, 181] },
          footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
        });
        doc.save(`custos_gerais_${new Date().toISOString().slice(0, 10)}.pdf`);
        this.carregando.set(false);
      },
      error: () => this.carregando.set(false)
    });
  }

  gerarRankingMotoristas(): void {
    this.carregando.set(true);
    forkJoin({
      abastecimentos: this.usuarioService.listarAbastecimentos(),
      ocorrencias: this.usuarioService.listarOcorrencias(),
      diarios: this.usuarioService.listarDiarios()
    }).subscribe({
      next: ({ abastecimentos, ocorrencias, diarios }) => {
        const porMotorista: Record<string, { nome: string; kmRodado: number; abastecimentos: number; litros: number; ocorrencias: number; diarios: number }> = {};

        diarios.forEach(d => {
          if (!porMotorista[d.motoristaNome]) porMotorista[d.motoristaNome] = { nome: d.motoristaNome, kmRodado: 0, abastecimentos: 0, litros: 0, ocorrencias: 0, diarios: 0 };
          porMotorista[d.motoristaNome].kmRodado += d.medidorPercorrido ?? 0;
          porMotorista[d.motoristaNome].diarios += 1;
        });

        abastecimentos.forEach(a => {
          if (!porMotorista[a.motoristaNome]) porMotorista[a.motoristaNome] = { nome: a.motoristaNome, kmRodado: 0, abastecimentos: 0, litros: 0, ocorrencias: 0, diarios: 0 };
          porMotorista[a.motoristaNome].abastecimentos += 1;
          porMotorista[a.motoristaNome].litros += a.litros;
        });

        ocorrencias.forEach(o => {
          if (!porMotorista[o.motoristaNome]) porMotorista[o.motoristaNome] = { nome: o.motoristaNome, kmRodado: 0, abastecimentos: 0, litros: 0, ocorrencias: 0, diarios: 0 };
          porMotorista[o.motoristaNome].ocorrencias += 1;
        });

        const lista = Object.values(porMotorista).sort((a, b) => b.kmRodado - a.kmRodado);
        const doc = this.criarPDF('Ranking de Motoristas', false);
        autoTable(doc, {
          startY: 38,
          head: [['Motorista', 'Diários', 'Km/h Rodado', 'Abastecimentos', 'Litros', 'Ocorrências']],
          body: lista.map((m, i) => [
            `${i + 1}º ${m.nome}`,
            m.diarios.toString(),
            m.kmRodado.toFixed(1),
            m.abastecimentos.toString(),
            `${m.litros.toFixed(1)} L`,
            m.ocorrencias.toString()
          ]),
          styles: { fontSize: 8 }, headStyles: { fillColor: [63, 81, 181] }
        });
        doc.save(`ranking_motoristas_${new Date().toISOString().slice(0, 10)}.pdf`);
        this.carregando.set(false);
      },
      error: () => this.carregando.set(false)
    });
  }

  gerarPecasMaisUsadas(): void {
    this.carregando.set(true);
    this.usuarioService.listarManutencoes().subscribe({
      next: (manutencoes) => {
        const pecasMap: Record<string, { nome: string; codigo: string | null; marca: string | null; qtdTotal: number; vezes: number; valorTotal: number }> = {};
        manutencoes.forEach(m => {
          m.pecas.forEach(p => {
            const chave = `${p.nomePeca}|${p.codigoPeca ?? ''}|${p.marcaPeca ?? ''}`;
            if (!pecasMap[chave]) pecasMap[chave] = { nome: p.nomePeca, codigo: p.codigoPeca, marca: p.marcaPeca, qtdTotal: 0, vezes: 0, valorTotal: 0 };
            pecasMap[chave].qtdTotal += p.quantidade;
            pecasMap[chave].vezes += 1;
            pecasMap[chave].valorTotal += p.valorTotal;
          });
        });

        const lista = Object.values(pecasMap).sort((a, b) => b.vezes - a.vezes);
        const doc = this.criarPDF('Relatório de Peças Mais Utilizadas', false);
        autoTable(doc, {
          startY: 38,
          head: [['Peça', 'Código', 'Marca', 'Qtd Total', 'Vezes Usada', 'Valor Total']],
          body: lista.map((p, i) => [
            `${i + 1}º ${p.nome}`, p.codigo ?? '-', p.marca ?? '-',
            p.qtdTotal.toString(), p.vezes.toString(),
            `R$ ${p.valorTotal.toFixed(2)}`
          ]),
          styles: { fontSize: 8 }, headStyles: { fillColor: [63, 81, 181] }
        });
        doc.save(`pecas_mais_usadas_${new Date().toISOString().slice(0, 10)}.pdf`);
        this.carregando.set(false);
      },
      error: () => this.carregando.set(false)
    });
  }

  gerarVeiculosMaisManutencoes(): void {
    this.carregando.set(true);
    this.usuarioService.listarManutencoes().subscribe({
      next: (manutencoes) => {
        const porVeiculo: Record<string, { descricao: string; placa: string | null; total: number; custo: number; abertas: number }> = {};
        manutencoes.forEach(m => {
          if (!porVeiculo[m.veiculoId]) porVeiculo[m.veiculoId] = { descricao: m.veiculoDescricao, placa: m.veiculoPlaca, total: 0, custo: 0, abertas: 0 };
          porVeiculo[m.veiculoId].total += 1;
          porVeiculo[m.veiculoId].custo += m.custoTotal;
          if (m.status !== 'concluida') porVeiculo[m.veiculoId].abertas += 1;
        });

        const lista = Object.values(porVeiculo).sort((a, b) => b.total - a.total);
        const doc = this.criarPDF('Veículos com Mais Manutenções', false);
        autoTable(doc, {
          startY: 38,
          head: [['', 'Veículo', 'Placa', 'Total Manutenções', 'Em Aberto', 'Custo Total']],
          body: lista.map((v, i) => [
            `${i + 1}º`, v.descricao, v.placa ?? 'S/P',
            v.total.toString(), v.abertas.toString(),
            `R$ ${v.custo.toFixed(2)}`
          ]),
          styles: { fontSize: 8 }, headStyles: { fillColor: [63, 81, 181] }
        });
        doc.save(`veiculos_manutencoes_${new Date().toISOString().slice(0, 10)}.pdf`);
        this.carregando.set(false);
      },
      error: () => this.carregando.set(false)
    });
  }

  gerarGastosPorMes(): void {
    this.carregando.set(true);
    forkJoin({
      abastecimentos: this.usuarioService.listarAbastecimentos(),
      manutencoes: this.usuarioService.listarManutencoes()
    }).subscribe({
      next: ({ abastecimentos, manutencoes }) => {
        const porMes: Record<string, { mes: string; combustivel: number; manutencao: number; litros: number }> = {};

        abastecimentos.forEach(a => {
          if (!a.registradoEm) return;
          const mes = new Date(a.registradoEm).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
          if (!porMes[mes]) porMes[mes] = { mes, combustivel: 0, manutencao: 0, litros: 0 };
          porMes[mes].combustivel += a.valorTotal;
          porMes[mes].litros += a.litros;
        });

        manutencoes.forEach(m => {
          if (!m.abertaEm) return;
          const mes = new Date(m.abertaEm).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
          if (!porMes[mes]) porMes[mes] = { mes, combustivel: 0, manutencao: 0, litros: 0 };
          porMes[mes].manutencao += m.custoTotal;
        });

        const lista = Object.values(porMes).sort((a, b) => {
          const [ma, ya] = a.mes.split('/').map(Number);
          const [mb, yb] = b.mes.split('/').map(Number);
          return ya !== yb ? ya - yb : ma - mb;
        });

        const doc = this.criarPDF('Evolução de Gastos por Mês', false);
        autoTable(doc, {
          startY: 38,
          head: [['Mês/Ano', 'Litros', 'Combustível', 'Manutenção', 'Total']],
          body: lista.map(m => [
            m.mes, `${m.litros.toFixed(1)} L`,
            `R$ ${m.combustivel.toFixed(2)}`,
            `R$ ${m.manutencao.toFixed(2)}`,
            `R$ ${(m.combustivel + m.manutencao).toFixed(2)}`
          ]),
          foot: [['Total', `${lista.reduce((a, b) => a + b.litros, 0).toFixed(1)} L`,
            `R$ ${lista.reduce((a, b) => a + b.combustivel, 0).toFixed(2)}`,
            `R$ ${lista.reduce((a, b) => a + b.manutencao, 0).toFixed(2)}`,
            `R$ ${lista.reduce((a, b) => a + b.combustivel + b.manutencao, 0).toFixed(2)}`
          ]],
          styles: { fontSize: 8 }, headStyles: { fillColor: [63, 81, 181] },
          footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
        });
        doc.save(`gastos_por_mes_${new Date().toISOString().slice(0, 10)}.pdf`);
        this.carregando.set(false);
      },
      error: () => this.carregando.set(false)
    });
  }

  gerarCustoPorKm(): void {
    this.carregando.set(true);
    forkJoin({
      abastecimentos: this.usuarioService.listarAbastecimentos(),
      manutencoes: this.usuarioService.listarManutencoes(),
      diarios: this.usuarioService.listarDiarios()
    }).subscribe({
      next: ({ abastecimentos, manutencoes, diarios }) => {
        const porVeiculo: Record<string, { descricao: string; placa: string | null; km: number; custoCombus: number; custoManut: number }> = {};

        diarios.forEach(d => {
          const id = this.veiculos().find(v => v.descricao === d.veiculoDescricao)?.id ?? d.veiculoDescricao;
          if (!porVeiculo[id]) porVeiculo[id] = { descricao: d.veiculoDescricao, placa: d.veiculoPlaca, km: 0, custoCombus: 0, custoManut: 0 };
          porVeiculo[id].km += d.medidorPercorrido ?? 0;
        });

        abastecimentos.forEach(a => {
          if (!porVeiculo[a.veiculoId]) porVeiculo[a.veiculoId] = { descricao: a.veiculoDescricao, placa: a.veiculoPlaca, km: 0, custoCombus: 0, custoManut: 0 };
          porVeiculo[a.veiculoId].custoCombus += a.valorTotal;
        });

        manutencoes.forEach(m => {
          if (!porVeiculo[m.veiculoId]) porVeiculo[m.veiculoId] = { descricao: m.veiculoDescricao, placa: m.veiculoPlaca, km: 0, custoCombus: 0, custoManut: 0 };
          porVeiculo[m.veiculoId].custoManut += m.custoTotal;
        });

        const lista = Object.values(porVeiculo)
          .filter(v => v.km > 0)
          .map(v => ({ ...v, custoPorKm: (v.custoCombus + v.custoManut) / v.km }))
          .sort((a, b) => a.custoPorKm - b.custoPorKm);

        const doc = this.criarPDF('Custo por Km Rodado', false);
        autoTable(doc, {
          startY: 38,
          head: [['Veículo', 'Placa', 'Km Rodado', 'Custo Combustível', 'Custo Manutenção', 'Total', 'R$/Km']],
          body: lista.map(v => [
            v.descricao, v.placa ?? 'S/P', v.km.toFixed(1),
            `R$ ${v.custoCombus.toFixed(2)}`, `R$ ${v.custoManut.toFixed(2)}`,
            `R$ ${(v.custoCombus + v.custoManut).toFixed(2)}`,
            `R$ ${v.custoPorKm.toFixed(2)}`
          ]),
          styles: { fontSize: 8 }, headStyles: { fillColor: [63, 81, 181] }
        });
        doc.save(`custo_por_km_${new Date().toISOString().slice(0, 10)}.pdf`);
        this.carregando.set(false);
      },
      error: () => this.carregando.set(false)
    });
  }

  // ==================== FILTRO ====================

  private filtrar(lista: any[], campoData: string): any[] {
    let resultado = lista;
    if (this.filtroInicio()) {
      const inicio = new Date(this.filtroInicio());
      resultado = resultado.filter(i => i[campoData] && new Date(i[campoData]) >= inicio);
    }
    if (this.filtroFim()) {
      const fim = new Date(this.filtroFim());
      fim.setHours(23, 59, 59);
      resultado = resultado.filter(i => i[campoData] && new Date(i[campoData]) <= fim);
    }
    if (this.filtroVeiculoId()) {
      resultado = resultado.filter(i => i['veiculoId'] === this.filtroVeiculoId());
    }
    return resultado;
  }

  // ==================== CSV HELPERS ====================

  private abastecimentosParaCSV(data: AbastecimentoDetalhado[]): string {
    const header = 'Data,Motorista,Veículo,Placa,Combustível,Litros,Valor Total,Posto\n';
    const rows = data.map(a => `${this.formatarData(a.registradoEm)},${a.motoristaNome},${a.veiculoDescricao},${a.veiculoPlaca ?? ''},${a.tipoCombustivel},${a.litros},${a.valorTotal},${a.posto ?? ''}`).join('\n');
    return header + rows;
  }

  private ocorrenciasParaCSV(data: OcorrenciaDetalhada[]): string {
    const header = 'Data,Motorista,Veículo,Placa,Tipo,Descrição\n';
    const rows = data.map(o => `${this.formatarData(o.registradoEm)},${o.motoristaNome},${o.veiculoDescricao},${o.veiculoPlaca ?? ''},${o.tipo},"${o.descricao}"`).join('\n');
    return header + rows;
  }

  private manutencoesParaCSV(data: ManutencaoResponse[]): string {
    const header = 'Data,Veículo,Placa,Tipo,Descrição,Mecânico,Oficina,Custo MO,Custo Peças,Total,Status\n';
    const rows = data.map(m => `${this.formatarData(m.abertaEm)},${m.veiculoDescricao},${m.veiculoPlaca ?? ''},${m.tipo},"${m.descricao}",${m.mecanicoResponsavel ?? ''},${m.oficina ?? ''},${m.custoMaoObra},${m.custoPecas},${m.custoTotal},${m.status}`).join('\n');
    return header + rows;
  }

  private diariosParaCSV(data: DiarioResponse[]): string {
    const header = 'Data Abertura,Data Fechamento,Motorista,Veículo,Placa,Destino,Med. Inicial,Med. Final,Percorrido,Status\n';
    const rows = data.map(d => `${this.formatarData(d.abertoEm)},${this.formatarData(d.fechadoEm)},${d.motoristaNome},${d.veiculoDescricao},${d.veiculoPlaca ?? ''},${d.destino ?? ''},${d.medidorInicial},${d.medidorFinal ?? ''},${d.medidorPercorrido ?? ''},${d.status}`).join('\n');
    return header + rows;
  }

  private downloadCSV(csv: string, nome: string): void {
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${nome}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  // ==================== PDF HELPERS ====================

  private criarPDF(titulo: string, comPeriodo: boolean = true): jsPDF {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16); doc.setTextColor(63, 81, 181);
    doc.text('Secretaria de Obras — Cruz Machado/PR', 14, 15);
    doc.setFontSize(12); doc.setTextColor(0, 0, 0);
    doc.text(titulo, 14, 23);
    doc.setFontSize(9); doc.setTextColor(100, 100, 100);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 30);
    if (comPeriodo && (this.filtroInicio() || this.filtroFim())) {
      doc.text(`Período: ${this.filtroInicio() || '—'} até ${this.filtroFim() || '—'}`, 14, 36);
    }
    return doc;
  }

  private abastecimentosPDF(data: AbastecimentoDetalhado[]): void {
    const doc = this.criarPDF('Relatório de Abastecimentos');
    autoTable(doc, {
      startY: 42,
      head: [['Data', 'Motorista', 'Veículo', 'Combustível', 'Litros', 'Valor', 'Posto']],
      body: data.map(a => [this.formatarData(a.registradoEm), a.motoristaNome, `${a.veiculoDescricao}${a.veiculoPlaca ? ' — ' + a.veiculoPlaca : ''}`, a.tipoCombustivel, `${a.litros.toFixed(1)} L`, `R$ ${a.valorTotal.toFixed(2)}`, a.posto ?? '-']),
      foot: [['', '', '', 'Total', `${data.reduce((acc, a) => acc + a.litros, 0).toFixed(1)} L`, `R$ ${data.reduce((acc, a) => acc + a.valorTotal, 0).toFixed(2)}`, '']],
      styles: { fontSize: 8 }, headStyles: { fillColor: [63, 81, 181] },
      footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
    });
    doc.save(`abastecimentos_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  private ocorrenciasPDF(data: OcorrenciaDetalhada[]): void {
    const doc = this.criarPDF('Relatório de Ocorrências');
    autoTable(doc, {
      startY: 42,
      head: [['Data', 'Motorista', 'Veículo', 'Tipo', 'Descrição']],
      body: data.map(o => [this.formatarData(o.registradoEm), o.motoristaNome, `${o.veiculoDescricao}${o.veiculoPlaca ? ' — ' + o.veiculoPlaca : ''}`, o.tipo, o.descricao]),
      styles: { fontSize: 8 }, headStyles: { fillColor: [63, 81, 181] }
    });
    doc.save(`ocorrencias_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  private manutencoesPDF(data: ManutencaoResponse[]): void {
    const doc = this.criarPDF('Relatório de Manutenções');
    autoTable(doc, {
      startY: 42,
      head: [['Data', 'Veículo', 'Tipo', 'Descrição', 'Mecânico', 'MO', 'Peças', 'Total', 'Status']],
      body: data.map(m => [this.formatarData(m.abertaEm), `${m.veiculoDescricao}${m.veiculoPlaca ? ' — ' + m.veiculoPlaca : ''}`, m.tipo, m.descricao, m.mecanicoResponsavel ?? '-', `R$ ${m.custoMaoObra.toFixed(2)}`, `R$ ${m.custoPecas.toFixed(2)}`, `R$ ${m.custoTotal.toFixed(2)}`, m.status]),
      foot: [['', '', '', '', 'Total', `R$ ${data.reduce((acc, m) => acc + m.custoMaoObra, 0).toFixed(2)}`, `R$ ${data.reduce((acc, m) => acc + m.custoPecas, 0).toFixed(2)}`, `R$ ${data.reduce((acc, m) => acc + m.custoTotal, 0).toFixed(2)}`, '']],
      styles: { fontSize: 8 }, headStyles: { fillColor: [63, 81, 181] },
      footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
    });
    doc.save(`manutencoes_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  private diariosPDF(data: DiarioResponse[]): void {
    const doc = this.criarPDF('Relatório de Lançamento Mensal');
    autoTable(doc, {
      startY: 42,
      head: [['Data Abertura', 'Fechamento', 'Motorista', 'Veículo', 'Destino', 'Med. Inicial', 'Med. Final', 'Percorrido', 'Status']],
      body: data.map(d => [this.formatarData(d.abertoEm), this.formatarData(d.fechadoEm), d.motoristaNome, `${d.veiculoDescricao}${d.veiculoPlaca ? ' — ' + d.veiculoPlaca : ''}`, d.destino ?? '-', d.medidorInicial.toFixed(1), d.medidorFinal?.toFixed(1) ?? '-', d.medidorPercorrido?.toFixed(1) ?? '-', d.status]),
      foot: [['', '', '', '', 'Total percorrido', '', '', `${data.reduce((acc, d) => acc + (d.medidorPercorrido ?? 0), 0).toFixed(1)}`, '']],
      styles: { fontSize: 8 }, headStyles: { fillColor: [63, 81, 181] },
      footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
    });
    doc.save(`diarios_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  private labelStatus(status: string): string {
    const map: any = { 'disponivel': 'Disponível', 'em_uso': 'Em uso', 'em_manutencao': 'Em manutenção', 'inativo': 'Inativo' };
    return map[status] ?? status;
  }

  private formatarData(data: string | null | undefined): string {
    if (!data) return '-';
    return new Date(data).toLocaleString('pt-BR');
  }
  adicionarVeiculoPorId(id: string): void {
  if (!id || this.veiculosSelecionados.includes(id)) return;
  this.veiculosSelecionados = [...this.veiculosSelecionados, id];
}
}