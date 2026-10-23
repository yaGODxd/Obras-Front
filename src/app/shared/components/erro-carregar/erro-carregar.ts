import { Component, input, output } from '@angular/core';

// Bloco "erro ao carregar" (diferente de "lista vazia"), com botão para tentar de novo.
@Component({
  selector: 'app-erro-carregar',
  standalone: true,
  templateUrl: './erro-carregar.html'
})
export class ErroCarregarComponent {
  mensagem = input.required<string>();
  tentarDeNovo = output<void>();
}
