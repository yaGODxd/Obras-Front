import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CamposHorarioSuspeito } from '../../../interfaces/horario-suspeito';
import { explicacaoSuspeita, motivosSuspeita } from '../../utils/horario-suspeito';
import { StatusBadgeComponent } from '../status-badge/status-badge';

// Horário suspeito (só aviso, nada é bloqueado). Não aparece se o registro é normal.
// Padrão: selo discreto para listas, com a explicação no title.
// detalhado: quadro com cada motivo e a hora em que o servidor recebeu (modais de abastecimento e ocorrência).
@Component({
  selector: 'app-selo-horario-suspeito',
  standalone: true,
  imports: [CommonModule, StatusBadgeComponent],
  templateUrl: './selo-horario-suspeito.html'
})
export class SeloHorarioSuspeitoComponent {
  registro = input.required<CamposHorarioSuspeito>();
  detalhado = input(false);

  motivos = computed(() => motivosSuspeita(this.registro()));
  explicacao = computed(() => explicacaoSuspeita(this.registro()));
}
