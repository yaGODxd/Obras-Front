import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsuarioService } from '../../services/usuario';

@Component({
  selector: 'app-configuracoes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './configuracoes.html',
  styleUrl: './configuracoes.css'
})
export class ConfiguracoesComponent implements OnInit {

  temaSelecionado = signal('obras-slate');
  salvando = signal(false);
  mensagem = signal('');
  mensagemTipo = signal('');

  temas = [
    { valor: 'obras-light', label: 'Padrão', icone: '🏛️' },
    { valor: 'obras-dark', label: 'Escuro', icone: '🌙' },
    { valor: 'obras-slate', label: 'Grafite', icone: '🪨' },
    { valor: 'obras-ocean', label: 'Oceano', icone: '🌊' },
    { valor: 'obras-green', label: 'Verde', icone: '🌿' },
    { valor: 'light', label: 'Claro', icone: '☀️' },
    { valor: 'dark', label: 'DaisyUI Dark', icone: '🌑' },
    { valor: 'dracula', label: 'Dracula', icone: '🧛' }
  ];

  sistemaNome = 'Sistema de Gerenciamento de Frotas';
  sistemaVersao = '1.0.0';
  sistemaSecretaria = 'Secretaria de Obras';
  sistemaMunicipio = 'Cruz Machado — PR';

  nomeCompleto = '';
  login = '';
  perfil = '';
  fotoPerfil = signal<string | null>(null);
  fotoPreview = signal<string | null>(null);

  constructor(private usuarioService: UsuarioService) {}

  ngOnInit(): void {
    const temaSalvo = localStorage.getItem('tema') ?? 'obras-slate';
    this.temaSelecionado.set(temaSalvo);
    this.aplicarTema(temaSalvo);

    const loginSalvo = localStorage.getItem('login') ?? '';
    this.login = loginSalvo;
    this.nomeCompleto = localStorage.getItem('nome') ?? '';

    if (loginSalvo) {
      this.usuarioService.buscarPerfil(loginSalvo).subscribe({
        next: (u) => {
          this.nomeCompleto = u.nomeCompleto;
          this.perfil = u.perfil;
          if (u.fotoPerfil) {
            this.fotoPerfil.set(u.fotoPerfil);
            this.fotoPreview.set('data:image/jpeg;base64,' + u.fotoPerfil);
          }
        }
      });
    }
  }

  onFotoSelecionada(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      this.fotoPerfil.set(base64);
      this.fotoPreview.set(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  salvarPerfil(): void {
    if (!this.nomeCompleto) return;
    this.salvando.set(true);
    this.usuarioService['http'].put(
      `https://sistema-obras-api.onrender.com/usuarios/${this.login}/perfil`,
      {
        nomeCompleto: this.nomeCompleto,
        fotoPerfil: this.fotoPerfil()
      }
    ).subscribe({
      next: () => {
        localStorage.setItem('nome', this.nomeCompleto);
        this.salvando.set(false);
        this.mostrarMensagem('Perfil atualizado com sucesso!', 'success');
      },
      error: () => {
        this.salvando.set(false);
        this.mostrarMensagem('Erro ao atualizar perfil!', 'error');
      }
    });
  }

  selecionarTema(tema: string): void {
    this.temaSelecionado.set(tema);
    this.aplicarTema(tema);
    localStorage.setItem('tema', tema);
    this.mostrarMensagem('Tema aplicado!', 'success');
  }

  private aplicarTema(tema: string): void {
    document.documentElement.setAttribute('data-theme', tema);
  }

  private mostrarMensagem(msg: string, tipo: string): void {
    this.mensagem.set(msg);
    this.mensagemTipo.set(tipo);
    setTimeout(() => this.mensagem.set(''), 3000);
  }

  labelPerfil(perfil: string): string {
    return perfil === 'gestor' ? 'Gestor' : 'Motorista';
  }
}