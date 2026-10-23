import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AbastecimentoService } from '../../../services/abastecimento';
import { DiarioService } from '../../../services/diario';
import { ManutencaoService } from '../../../services/manutencao';
import { OcorrenciaService } from '../../../services/ocorrencia';
import { UsuarioService } from '../../../services/usuario';
import { VeiculoService } from '../../../services/veiculo';
import { AbastecimentoDetalhado } from '../../../interfaces/abastecimento';
import { DiarioResponse } from '../../../interfaces/diario';
import { ManutencaoResponse } from '../../../interfaces/manutencao';
import { OcorrenciaDetalhada } from '../../../interfaces/ocorrencia';
import { UsuarioResponse } from '../../../interfaces/usuario';
import { VeiculoResponse } from '../../../interfaces/veiculo';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { forkJoin } from 'rxjs';
import { inicioDoDiaLocal, fimDoDiaLocal, formatarDataSemHora } from '../../../shared/utils/datas';
import { avisoPendentes, diariosParaRelatorio, rotuloStatusDiario } from '../../../shared/utils/diarios';
import { AvisosService } from '../../../shared/services/avisos';
import { rotuloStatusVeiculo } from '../../../shared/utils/veiculos';
import { ClicavelDirective } from '../../../shared/directives/clicavel';
import { CelulaCsv, dataHoraCsv, fixo, montarCsv, numero, texto } from '../../../shared/utils/csv';
import { formatarMoeda, formatarNumero } from '../../../shared/utils/formatos';
import { rotuloPerfil } from '../../../shared/utils/perfis';
import { rotuloVeiculo } from '../../../shared/utils/placa';

@Component({
  selector: 'app-relatorios',
  standalone: true,
  imports: [CommonModule, FormsModule, ClicavelDirective],
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
  // Relatório de diários: abertos nunca entram; com esta opção, entram só os assinados.
  somenteAssinados = signal(false);

  tipos = [
    { valor: 'abastecimentos', label: 'Abastecimentos', icone: 'ti-droplet' },
    { valor: 'ocorrencias', label: 'Ocorrências', icone: 'ti-alert-triangle' },
    { valor: 'manutencoes', label: 'Manutenções', icone: 'ti-tool' },
    { valor: 'diarios', label: 'Lançamento Mensal', icone: 'ti-clipboard-list' }
  ];

  constructor(
    private abastecimentoService: AbastecimentoService,
    private diarioService: DiarioService,
    private manutencaoService: ManutencaoService,
    private ocorrenciaService: OcorrenciaService,
    private usuarioService: UsuarioService,
    private veiculoService: VeiculoService,
    private avisos: AvisosService
  ) {}

  ngOnInit(): void {
    // Sem estas listas, os PDFs cadastrais sairiam vazios: avisa uma vez só.
    let avisou = false;
    const falhaCarga = (e: unknown) => { if (!avisou) { avisou = true; this.avisos.erroHttp(e); } };
    this.veiculoService.listarVeiculos().subscribe({ next: (data) => this.veiculos.set(data), error: falhaCarga });
    this.usuarioService.listarUsuarios().subscribe({ next: (data) => this.usuarios.set(data), error: falhaCarga });
  }

  // Falha ao gerar um relatório: para o carregamento e mostra o motivo.
  private falhou(erro: unknown): void {
    this.carregando.set(false);
    this.avisos.erroHttp(erro);
  }

  // ==================== OPERACIONAIS ====================

  gerarCSV(): void {
    this.carregando.set(true);
    const tipo = this.tipoRelatorio();
    if (tipo === 'abastecimentos') {
      this.abastecimentoService.listarAbastecimentos().subscribe({
        next: (data) => { this.downloadCSV(this.abastecimentosParaCSV(this.filtrar(data, 'registradoEm')), 'abastecimentos'); this.carregando.set(false); },
        error: (e) => this.falhou(e)
      });
    } else if (tipo === 'ocorrencias') {
      this.ocorrenciaService.listarOcorrencias().subscribe({
        next: (data) => { this.downloadCSV(this.ocorrenciasParaCSV(this.filtrar(data, 'registradoEm')), 'ocorrencias'); this.carregando.set(false); },
        error: (e) => this.falhou(e)
      });
    } else if (tipo === 'manutencoes') {
      this.manutencaoService.listarManutencoes().subscribe({
        next: (data) => { this.downloadCSV(this.manutencoesParaCSV(this.filtrar(data, 'abertaEm')), 'manutencoes'); this.carregando.set(false); },
        error: (e) => this.falhou(e)
      });
    } else if (tipo === 'diarios') {
      this.diarioService.listarDiarios(this.filtroVeiculoId() || undefined).subscribe({
        next: (data) => { this.downloadCSV(this.diariosParaCSV(this.diariosDoRelatorio(data).diarios), 'diarios'); this.carregando.set(false); },
        error: (e) => this.falhou(e)
      });
    }
  }

  gerarPDF(): void {
    this.carregando.set(true);
    const tipo = this.tipoRelatorio();
    if (tipo === 'abastecimentos') {
      this.abastecimentoService.listarAbastecimentos().subscribe({
        next: (data) => { this.abastecimentosPDF(this.filtrar(data, 'registradoEm')); this.carregando.set(false); },
        error: (e) => this.falhou(e)
      });
    } else if (tipo === 'ocorrencias') {
      this.ocorrenciaService.listarOcorrencias().subscribe({
        next: (data) => { this.ocorrenciasPDF(this.filtrar(data, 'registradoEm')); this.carregando.set(false); },
        error: (e) => this.falhou(e)
      });
    } else if (tipo === 'manutencoes') {
      this.manutencaoService.listarManutencoes().subscribe({
        next: (data) => { this.manutencoesPDF(this.filtrar(data, 'abertaEm')); this.carregando.set(false); },
        error: (e) => this.falhou(e)
      });
    } else if (tipo === 'diarios') {
      this.diarioService.listarDiarios(this.filtroVeiculoId() || undefined).subscribe({
        next: (data) => { const r = this.diariosDoRelatorio(data); this.diariosPDF(r.diarios, r.pendentes); this.carregando.set(false); },
        error: (e) => this.falhou(e)
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
        u.nomeCompleto, u.login, rotuloPerfil(u.perfil),
        u.matricula ?? '-', u.vinculo ?? '-', u.secretariaNome ?? '-',
        u.categoriaCnh ?? '-',
        formatarDataSemHora(u.validadeCnh),
        u.telefone ?? '-', u.ativo ? 'Ativo' : 'Inativo'
      ]),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [63, 81, 181] }
    });
    doc.save(`cadastro_usuarios_${new Date().toISOString().slice(0, 10)}.pdf`);
    this.carregando.set(false);
  }

  // ==================== ANÁLISES ====================

  gerarCustosGerais(): void {
    this.carregando.set(true);
    forkJoin({
      abastecimentos: this.abastecimentoService.listarAbastecimentos(),
      manutencoes: this.manutencaoService.listarManutencoes()
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
            `${formatarNumero(v.litros, 1)} L`,
            `${formatarMoeda(v.custoCombus)}`,
            `${formatarMoeda(v.custoManut)}`,
            `${formatarMoeda((v.custoCombus + v.custoManut))}`
          ]),
          foot: [['Total', '', `${formatarNumero(lista.reduce((a, b) => a + b.litros, 0), 1)} L`,
            `${formatarMoeda(lista.reduce((a, b) => a + b.custoCombus, 0))}`,
            `${formatarMoeda(lista.reduce((a, b) => a + b.custoManut, 0))}`,
            `${formatarMoeda(lista.reduce((a, b) => a + b.custoCombus + b.custoManut, 0))}`
          ]],
          styles: { fontSize: 8 }, headStyles: { fillColor: [63, 81, 181] },
          footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
        });
        doc.save(`custos_gerais_${new Date().toISOString().slice(0, 10)}.pdf`);
        this.carregando.set(false);
      },
      error: (e) => this.falhou(e)
    });
  }

  gerarRankingMotoristas(): void {
    this.carregando.set(true);
    forkJoin({
      abastecimentos: this.abastecimentoService.listarAbastecimentos(),
      ocorrencias: this.ocorrenciaService.listarOcorrencias(),
      diarios: this.diarioService.listarDiarios()
    }).subscribe({
      next: ({ abastecimentos, ocorrencias, diarios }) => {
        const porMotorista: Record<string, { nome: string; kmRodado: number; horas: number; abastecimentos: number; litros: number; ocorrencias: number; diarios: number }> = {};
        const novo = (nome: string) => ({ nome, kmRodado: 0, horas: 0, abastecimentos: 0, litros: 0, ocorrencias: 0, diarios: 0 });
        // O diário não traz o tipo de medidor: busca pelo veículo (pela descrição, como no Custo por Km).
        const ehHorimetro = (descricao: string) =>
          this.veiculos().find(v => v.descricao === descricao)?.tipoMedidor === 'horimetro';

        // Só diários completos (fechados + assinados), a mesma regra do relatório de diários.
        // Km (hodômetro) e horas (horímetro das máquinas) ficam em colunas separadas: não se somam.
        diariosParaRelatorio(diarios, false).diarios.forEach(d => {
          porMotorista[d.motoristaNome] ??= novo(d.motoristaNome);
          if (ehHorimetro(d.veiculoDescricao)) porMotorista[d.motoristaNome].horas += d.medidorPercorrido ?? 0;
          else porMotorista[d.motoristaNome].kmRodado += d.medidorPercorrido ?? 0;
          porMotorista[d.motoristaNome].diarios += 1;
        });

        abastecimentos.forEach(a => {
          porMotorista[a.motoristaNome] ??= novo(a.motoristaNome);
          porMotorista[a.motoristaNome].abastecimentos += 1;
          porMotorista[a.motoristaNome].litros += a.litros;
        });

        ocorrencias.forEach(o => {
          porMotorista[o.motoristaNome] ??= novo(o.motoristaNome);
          porMotorista[o.motoristaNome].ocorrencias += 1;
        });

        const lista = Object.values(porMotorista).sort((a, b) => b.kmRodado - a.kmRodado || b.horas - a.horas);
        const doc = this.criarPDF('Ranking de Motoristas', false);
        autoTable(doc, {
          startY: 38,
          head: [['Motorista', 'Diários', 'Km rodados', 'Horas trabalhadas', 'Abastecimentos', 'Litros', 'Ocorrências']],
          body: lista.map((m, i) => [
            `${i + 1}º ${m.nome}`,
            m.diarios.toString(),
            `${formatarNumero(m.kmRodado, 1)} km`,
            `${formatarNumero(m.horas, 1)} h`,
            m.abastecimentos.toString(),
            `${formatarNumero(m.litros, 1)} L`,
            m.ocorrencias.toString()
          ]),
          styles: { fontSize: 8 }, headStyles: { fillColor: [63, 81, 181] }
        });
        doc.save(`ranking_motoristas_${new Date().toISOString().slice(0, 10)}.pdf`);
        this.carregando.set(false);
      },
      error: (e) => this.falhou(e)
    });
  }

  gerarPecasMaisUsadas(): void {
    this.carregando.set(true);
    this.manutencaoService.listarManutencoes().subscribe({
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
            `${formatarMoeda(p.valorTotal)}`
          ]),
          styles: { fontSize: 8 }, headStyles: { fillColor: [63, 81, 181] }
        });
        doc.save(`pecas_mais_usadas_${new Date().toISOString().slice(0, 10)}.pdf`);
        this.carregando.set(false);
      },
      error: (e) => this.falhou(e)
    });
  }

  gerarVeiculosMaisManutencoes(): void {
    this.carregando.set(true);
    this.manutencaoService.listarManutencoes().subscribe({
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
            `${formatarMoeda(v.custo)}`
          ]),
          styles: { fontSize: 8 }, headStyles: { fillColor: [63, 81, 181] }
        });
        doc.save(`veiculos_manutencoes_${new Date().toISOString().slice(0, 10)}.pdf`);
        this.carregando.set(false);
      },
      error: (e) => this.falhou(e)
    });
  }

  gerarGastosPorMes(): void {
    this.carregando.set(true);
    forkJoin({
      abastecimentos: this.abastecimentoService.listarAbastecimentos(),
      manutencoes: this.manutencaoService.listarManutencoes()
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
            m.mes, `${formatarNumero(m.litros, 1)} L`,
            `${formatarMoeda(m.combustivel)}`,
            `${formatarMoeda(m.manutencao)}`,
            `${formatarMoeda((m.combustivel + m.manutencao))}`
          ]),
          foot: [['Total', `${formatarNumero(lista.reduce((a, b) => a + b.litros, 0), 1)} L`,
            `${formatarMoeda(lista.reduce((a, b) => a + b.combustivel, 0))}`,
            `${formatarMoeda(lista.reduce((a, b) => a + b.manutencao, 0))}`,
            `${formatarMoeda(lista.reduce((a, b) => a + b.combustivel + b.manutencao, 0))}`
          ]],
          styles: { fontSize: 8 }, headStyles: { fillColor: [63, 81, 181] },
          footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
        });
        doc.save(`gastos_por_mes_${new Date().toISOString().slice(0, 10)}.pdf`);
        this.carregando.set(false);
      },
      error: (e) => this.falhou(e)
    });
  }

  gerarCustoPorKm(): void {
    this.carregando.set(true);
    forkJoin({
      abastecimentos: this.abastecimentoService.listarAbastecimentos(),
      manutencoes: this.manutencaoService.listarManutencoes(),
      diarios: this.diarioService.listarDiarios()
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
            v.descricao, v.placa ?? 'S/P', formatarNumero(v.km, 1),
            `${formatarMoeda(v.custoCombus)}`, `${formatarMoeda(v.custoManut)}`,
            `${formatarMoeda((v.custoCombus + v.custoManut))}`,
            `${formatarMoeda(v.custoPorKm)}`
          ]),
          styles: { fontSize: 8 }, headStyles: { fillColor: [63, 81, 181] }
        });
        doc.save(`custo_por_km_${new Date().toISOString().slice(0, 10)}.pdf`);
        this.carregando.set(false);
      },
      error: (e) => this.falhou(e)
    });
  }

  // ==================== FILTRO ====================

  // Diários: o veículo já vai como parâmetro para a API (a resposta não traz veiculoId),
  // então aqui só filtra o período e aplica a regra fechados + assinados.
  private diariosDoRelatorio(data: DiarioResponse[]): { diarios: DiarioResponse[]; pendentes: number } {
    return diariosParaRelatorio(this.filtrar(data, 'abertoEm', false), this.somenteAssinados());
  }

  // Os diários não trazem veiculoId (o filtro de veículo deles vai para a API).
  private filtrar<T extends object>(lista: T[], campoData: keyof T, filtrarVeiculo = true): T[] {
    let resultado = lista;
    const inicio = inicioDoDiaLocal(this.filtroInicio());
    if (inicio) {
      resultado = resultado.filter(i => { const d = i[campoData] as string | null; return !!d && new Date(d) >= inicio; });
    }
    const fim = fimDoDiaLocal(this.filtroFim());
    if (fim) {
      resultado = resultado.filter(i => { const d = i[campoData] as string | null; return !!d && new Date(d) <= fim; });
    }
    if (filtrarVeiculo && this.filtroVeiculoId()) {
      resultado = resultado.filter(i => (i as { veiculoId?: string }).veiculoId === this.filtroVeiculoId());
    }
    return resultado;
  }

  // ==================== CSV HELPERS ====================

  // CSV no formato do Excel em português (ver shared/utils/csv.ts). Textos que vêm de pessoas usam texto(),
  // números usam numero() e o que o sistema gera (datas, situação) usa fixo().
  private abastecimentosParaCSV(data: AbastecimentoDetalhado[]): string {
    return montarCsv(
      ['Data', 'Motorista', 'Veículo', 'Placa', 'Combustível', 'Litros', 'Valor Total', 'Posto'],
      data.map((a): CelulaCsv[] => [
        fixo(dataHoraCsv(a.registradoEm)), texto(a.motoristaNome), texto(a.veiculoDescricao), texto(a.veiculoPlaca),
        texto(a.tipoCombustivel), numero(a.litros, 2), numero(a.valorTotal, 2), texto(a.posto)
      ])
    );
  }

  private ocorrenciasParaCSV(data: OcorrenciaDetalhada[]): string {
    return montarCsv(
      ['Data', 'Motorista', 'Veículo', 'Placa', 'Tipo', 'Descrição'],
      data.map((o): CelulaCsv[] => [
        fixo(dataHoraCsv(o.registradoEm)), texto(o.motoristaNome), texto(o.veiculoDescricao), texto(o.veiculoPlaca),
        texto(o.tipo), texto(o.descricao)
      ])
    );
  }

  private manutencoesParaCSV(data: ManutencaoResponse[]): string {
    return montarCsv(
      ['Data', 'Veículo', 'Placa', 'Tipo', 'Descrição', 'Mecânico', 'Oficina', 'Custo MO', 'Custo Peças', 'Total', 'Status'],
      data.map((m): CelulaCsv[] => [
        fixo(dataHoraCsv(m.abertaEm)), texto(m.veiculoDescricao), texto(m.veiculoPlaca), texto(m.tipo), texto(m.descricao),
        texto(m.mecanicoResponsavel), texto(m.oficina), numero(m.custoMaoObra, 2), numero(m.custoPecas, 2),
        numero(m.custoTotal, 2), texto(m.status)
      ])
    );
  }

  private diariosParaCSV(data: DiarioResponse[]): string {
    return montarCsv(
      ['Data Abertura', 'Data Fechamento', 'Motorista', 'Veículo', 'Placa', 'Destino', 'Med. Inicial', 'Med. Final', 'Percorrido', 'Situação'],
      data.map((d): CelulaCsv[] => [
        fixo(dataHoraCsv(d.abertoEm)), fixo(dataHoraCsv(d.fechadoEm)), texto(d.motoristaNome), texto(d.veiculoDescricao),
        texto(d.veiculoPlaca), texto(d.destino), numero(d.medidorInicial), numero(d.medidorFinal), numero(d.medidorPercorrido),
        fixo(rotuloStatusDiario(d.status))
      ])
    );
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
      body: data.map(a => [this.formatarData(a.registradoEm), a.motoristaNome, rotuloVeiculo(a.veiculoDescricao, a.veiculoPlaca), a.tipoCombustivel, `${formatarNumero(a.litros, 1)} L`, `${formatarMoeda(a.valorTotal)}`, a.posto ?? '-']),
      foot: [['', '', '', 'Total', `${formatarNumero(data.reduce((acc, a) => acc + a.litros, 0), 1)} L`, `${formatarMoeda(data.reduce((acc, a) => acc + a.valorTotal, 0))}`, '']],
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
      body: data.map(o => [this.formatarData(o.registradoEm), o.motoristaNome, rotuloVeiculo(o.veiculoDescricao, o.veiculoPlaca), o.tipo, o.descricao]),
      styles: { fontSize: 8 }, headStyles: { fillColor: [63, 81, 181] }
    });
    doc.save(`ocorrencias_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  private manutencoesPDF(data: ManutencaoResponse[]): void {
    const doc = this.criarPDF('Relatório de Manutenções');
    autoTable(doc, {
      startY: 42,
      head: [['Data', 'Veículo', 'Tipo', 'Descrição', 'Mecânico', 'MO', 'Peças', 'Total', 'Status']],
      body: data.map(m => [this.formatarData(m.abertaEm), rotuloVeiculo(m.veiculoDescricao, m.veiculoPlaca), m.tipo, m.descricao, m.mecanicoResponsavel ?? '-', `${formatarMoeda(m.custoMaoObra)}`, `${formatarMoeda(m.custoPecas)}`, `${formatarMoeda(m.custoTotal)}`, m.status]),
      foot: [['', '', '', '', 'Total', `${formatarMoeda(data.reduce((acc, m) => acc + m.custoMaoObra, 0))}`, `${formatarMoeda(data.reduce((acc, m) => acc + m.custoPecas, 0))}`, `${formatarMoeda(data.reduce((acc, m) => acc + m.custoTotal, 0))}`, '']],
      styles: { fontSize: 8 }, headStyles: { fillColor: [63, 81, 181] },
      footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
    });
    doc.save(`manutencoes_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  private diariosPDF(data: DiarioResponse[], pendentes: number): void {
    const doc = this.criarPDF('Relatório de Lançamento Mensal');
    const aviso = avisoPendentes(pendentes, this.somenteAssinados());
    if (aviso) {
      doc.setFontSize(10); doc.setTextColor(180, 83, 9);
      doc.text(aviso, 14, 42);
    }
    autoTable(doc, {
      startY: aviso ? 47 : 42,
      head: [['Data Abertura', 'Fechamento', 'Motorista', 'Veículo', 'Destino', 'Med. Inicial', 'Med. Final', 'Percorrido', 'Situação']],
      body: data.map(d => [this.formatarData(d.abertoEm), this.formatarData(d.fechadoEm), d.motoristaNome, rotuloVeiculo(d.veiculoDescricao, d.veiculoPlaca), d.destino ?? '-', formatarNumero(d.medidorInicial, 1), formatarNumero(d.medidorFinal, 1) ?? '-', formatarNumero(d.medidorPercorrido, 1) ?? '-', rotuloStatusDiario(d.status)]),
      foot: [['', '', '', '', 'Total percorrido', '', '', `${formatarNumero(data.reduce((acc, d) => acc + (d.medidorPercorrido ?? 0), 0), 1)}`, '']],
      styles: { fontSize: 8 }, headStyles: { fillColor: [63, 81, 181] },
      footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
    });
    doc.save(`diarios_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  private labelStatus(status: string): string {
    return rotuloStatusVeiculo(status);
  }

  labelVeiculo(v: VeiculoResponse): string { return rotuloVeiculo(v.descricao, v.placa); }

  private formatarData(data: string | null | undefined): string {
    if (!data) return '-';
    return new Date(data).toLocaleString('pt-BR');
  }
}