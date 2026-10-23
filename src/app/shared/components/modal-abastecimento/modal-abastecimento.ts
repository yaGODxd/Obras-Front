import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbastecimentoDetalhado } from '../../../interfaces/abastecimento';
import { ModalDirective } from '../../directives/modal';
import { badgeCombustivel } from '../../utils/abastecimentos';
import { StatusBadgeComponent } from '../status-badge/status-badge';
import { SeloHorarioSuspeitoComponent } from '../selo-horario-suspeito/selo-horario-suspeito';

// Modal "Detalhes do Abastecimento". Botões extras (ex.: "Ver motorista") entram pelo conteúdo com o atributo "acoes".
@Component({
  selector: 'app-modal-abastecimento',
  standalone: true,
  imports: [CommonModule, ModalDirective, StatusBadgeComponent, SeloHorarioSuspeitoComponent],
  templateUrl: './modal-abastecimento.html'
})
export class ModalAbastecimentoComponent {
  abastecimento = input.required<AbastecimentoDetalhado>();
  // Na tela de um motorista não precisa repetir o motorista (e na de um veículo, o veículo).
  mostrarMotorista = input(true);
  mostrarVeiculo = input(true);
  fechar = output<void>();

  badgeCombustivel = badgeCombustivel;
}
