import { Component, inject } from '@angular/core';
import { AvisosService } from '../../services/avisos';

@Component({
  selector: 'app-avisos',
  standalone: true,
  templateUrl: './avisos.html'
})
export class AvisosComponent {
  readonly avisosService = inject(AvisosService);
}
