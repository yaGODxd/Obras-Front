import { Component, input } from '@angular/core';
import { CORES_TRAJETO, SituacaoTrajeto } from '../../utils/mapa';

// Legenda dos mapas de trajeto: linha pelas ruas, pontos reais e, se for o caso, o aviso do plano B.
// As cores vêm de CORES_TRAJETO (as mesmas do mapa).
@Component({
  selector: 'app-legenda-trajeto',
  standalone: true,
  templateUrl: './legenda-trajeto.html'
})
export class LegendaTrajetoComponent {
  quantidadePontos = input.required<number>();
  situacao = input<SituacaoTrajeto | null>(null);

  readonly cores = CORES_TRAJETO;
}
