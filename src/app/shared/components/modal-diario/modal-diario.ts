import { Component, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DiarioResponse } from '../../../interfaces/diario';
import { AbastecimentoDoDiario } from '../../../interfaces/abastecimento';
import { OcorrenciaDoDiario, StatusOcorrencia } from '../../../interfaces/ocorrencia';
import { ModalDirective } from '../../directives/modal';
import { badgeCombustivel, somarAbastecimentos } from '../../utils/abastecimentos';
import { badgeStatusOcorrencia, badgeTipoOcorrencia, rotuloStatusOcorrencia, statusDaOcorrencia } from '../../utils/ocorrencias';
import { badgeStatusDiario, rotuloStatusDiario } from '../../utils/diarios';
import { formatarMedidor, formatarMoeda, formatarNumero } from '../../utils/formatos';
import { rotuloPlaca, temPlaca } from '../../utils/placa';
import { StatusBadgeComponent } from '../status-badge/status-badge';
import { SeloHorarioSuspeitoComponent } from '../selo-horario-suspeito/selo-horario-suspeito';
import { FotosDiarioComponent } from '../fotos-diario/fotos-diario';
import { FotosVinculadasComponent } from '../fotos-vinculadas/fotos-vinculadas';
import { ErroCarregarComponent } from '../erro-carregar/erro-carregar';

// Resultado da verificação de integridade de um diário assinado (fica na tela, por id do diário).
export type EstadoVerificacao =
  | { tipo: 'carregando' }
  | { tipo: 'resultado'; integro: boolean; mensagem: string; assinadoEm: string | null }
  | { tipo: 'erro'; mensagem: string };

// Abastecimentos e ocorrências de um diário (as duas chamadas juntas, com forkJoin).
export type EstadoDetalheDiario =
  | { tipo: 'carregando' }
  | { tipo: 'pronto'; abastecimentos: AbastecimentoDoDiario[]; ocorrencias: OcorrenciaDoDiario[] }
  | { tipo: 'erro'; mensagem: string };

// Modal "Diário de DD/MM/AAAA". Só exibe: as chamadas e o que fica guardado são da tela que abre.
// Exceção: a seção Fotos (<app-fotos-diario>) busca sozinha, pelo FotosCache que a tela coloca em providers.
// Os horários (registradoEm) vêm como a API manda; ver "Pendências para a API" no CLAUDE.md.
@Component({
  selector: 'app-modal-diario',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalDirective, StatusBadgeComponent, ErroCarregarComponent, SeloHorarioSuspeitoComponent, FotosDiarioComponent, FotosVinculadasComponent],
  templateUrl: './modal-diario.html'
})
export class ModalDiarioComponent {
  diario = input.required<DiarioResponse>();
  // "horimetro" ou "odometro" do veículo do diário (o diário não traz essa informação).
  tipoMedidor = input<string | null>(null);
  estado = input<EstadoDetalheDiario>({ tipo: 'carregando' });
  // Vazio = verificação ainda não começou (a tela verifica ao abrir o modal).
  verificacao = input<EstadoVerificacao>();

  fechar = output<void>();
  tentarDeNovo = output<void>();
  verificar = output<void>(); // "Tentar de novo" quando a verificação falha
  verRota = output<void>();
  checklist = output<void>();

  abastecimentos = computed(() => { const e = this.estado(); return e.tipo === 'pronto' ? e.abastecimentos : []; });
  ocorrencias = computed(() => { const e = this.estado(); return e.tipo === 'pronto' ? e.ocorrencias : []; });
  // Filtro por status das ocorrências (só desta janela; vazio = todas).
  filtroStatusOcorrencia = signal<StatusOcorrencia | ''>('');
  readonly opcoesStatusOcorrencia: StatusOcorrencia[] = ['pendente', 'em_andamento', 'resolvida'];
  ocorrenciasFiltradas = computed(() => {
    const filtro = this.filtroStatusOcorrencia();
    return filtro ? this.ocorrencias().filter(o => statusDaOcorrencia(o) === filtro) : this.ocorrencias();
  });
  totais = computed(() => somarAbastecimentos(this.abastecimentos()));

  // "N" ou "nenhum(a)"; enquanto carrega ou se der erro, um traço.
  contagemAbastecimentos = computed(() => this.contagem(this.abastecimentos().length, 'nenhum'));
  contagemOcorrencias = computed(() => this.contagem(this.ocorrencias().length, 'nenhuma'));

  badgeStatus = badgeStatusDiario;
  rotuloStatus = rotuloStatusDiario;
  badgeCombustivel = badgeCombustivel;
  badgeTipoOcorrencia = badgeTipoOcorrencia;
  badgeStatusOcorrencia = badgeStatusOcorrencia;
  rotuloStatusOcorrencia = rotuloStatusOcorrencia;
  statusOcorrencia = statusDaOcorrencia;
  formatarMoeda = formatarMoeda;
  temPlaca = temPlaca;
  rotuloPlaca = rotuloPlaca;

  medidor(valor: number | null): string { return formatarMedidor(valor, this.tipoMedidor()); }
  litros(valor: number): string { return `${formatarNumero(valor, 1)} L`; }
  local(o: OcorrenciaDoDiario): string { return `${formatarNumero(o.latitude, 5)}; ${formatarNumero(o.longitude, 5)}`; }

  private contagem(n: number, zero: string): string {
    if (this.estado().tipo !== 'pronto') return '-';
    return n === 0 ? zero : String(n);
  }
}
