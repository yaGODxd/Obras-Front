import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { UsuarioService } from '../../services/usuario';
import { FotoService } from '../../services/foto';
import { UsoFotos } from '../../interfaces/foto';
import { mensagemDeErro } from '../../shared/utils/erros';
import { formatarNumero } from '../../shared/utils/formatos';
import { AvisosService } from '../../shared/services/avisos';
import { lerComoBase64, urlDaFoto, validarArquivoFoto } from '../../shared/utils/imagem';
import { ClicavelDirective } from '../../shared/directives/clicavel';
import { rotuloPerfil } from '../../shared/utils/perfis';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge';
import { AvatarComponent } from '../../shared/components/avatar/avatar';

@Component({
  selector: 'app-configuracoes',
  standalone: true,
  imports: [CommonModule, FormsModule, ClicavelDirective, StatusBadgeComponent, AvatarComponent],
  templateUrl: './configuracoes.html',
  styleUrl: './configuracoes.css'
})
export class ConfiguracoesComponent implements OnInit {

  temaSelecionado = signal('obras-slate');
  salvando = signal(false);

  temas = [
    { valor: 'obras-light', label: 'Padrão', icone: '🏛️' },
    { valor: 'obras-dark', label: 'Escuro', icone: '🌙' },
    { valor: 'obras-slate', label: 'Grafite', icone: '🪨' },
    { valor: 'obras-ocean', label: 'Oceano', icone: '🌊' },
    { valor: 'obras-green', label: 'Verde', icone: '🌿' },
    { valor: 'light', label: 'Claro', icone: '☀️' },
    { valor: 'dark', label: 'DaisyUI Dark', icone: '🌑' }
  ];

  sistemaNome = 'SIGMAP — Sistema de Gerenciamento de Frotas';
  sistemaVersao = '1.0.0';
  sistemaSecretaria = 'Secretaria de Obras';
  sistemaMunicipio = 'Cruz Machado — PR';

  // Signals: mudam depois da resposta HTTP (o app roda sem zone.js).
  nomeCompleto = signal('');
  login = signal('');
  perfil = signal('');
  fotoPerfil = signal<string | null>(null);
  fotoPreview = signal<string | null>(null);

  // GET /fotos/uso (cartão "Informações do Sistema"): o espaço do banco é limitado.
  usoFotos = signal<UsoFotos | null>(null);
  erroUsoFotos = signal('');

  constructor(
    private authService: AuthService,
    private usuarioService: UsuarioService,
    private fotoService: FotoService,
    private avisos: AvisosService
  ) {}

  ngOnInit(): void {
    const temaSalvo = localStorage.getItem('tema') ?? 'obras-slate';
    this.temaSelecionado.set(temaSalvo);
    this.aplicarTema(temaSalvo);

    this.carregarUsoFotos();

    const loginSalvo = this.authService.getLogin() ?? '';
    this.login.set(loginSalvo);
    this.nomeCompleto.set(this.authService.getNome() ?? '');

    if (loginSalvo) {
      this.usuarioService.buscarPerfil(loginSalvo).subscribe({
        next: (u) => {
          this.nomeCompleto.set(u.nomeCompleto);
          this.perfil.set(u.perfil);
          if (u.fotoPerfil) {
            this.fotoPerfil.set(u.fotoPerfil);
            this.fotoPreview.set(urlDaFoto(u.fotoPerfil));
          }
        }
      });
    }
  }

  carregarUsoFotos(): void {
    this.erroUsoFotos.set('');
    this.fotoService.usoFotos().subscribe({
      next: (uso) => this.usoFotos.set(uso),
      error: (e) => this.erroUsoFotos.set(mensagemDeErro(e))
    });
  }

  mb(valor: number): string { return `${formatarNumero(valor, 1)} MB`; }

  onFotoSelecionada(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    const problema = validarArquivoFoto(file);
    if (problema) {
      this.avisos.erro(problema);
      input.value = '';
      return;
    }
    // Vai o arquivo original (sem redução).
    lerComoBase64(file)
      .then(base64 => {
        this.fotoPerfil.set(base64);
        this.fotoPreview.set(`data:${file.type};base64,${base64}`);
      })
      .catch(() => this.avisos.erro('Não foi possível ler a imagem. Tente outra foto.'));
  }

  salvarPerfil(): void {
    if (!this.nomeCompleto().trim()) {
      this.avisos.erro('Preencha o nome completo.');
      return;
    }
    this.salvando.set(true);
    this.usuarioService.atualizarPerfil(this.login(), {
      nomeCompleto: this.nomeCompleto(),
      fotoPerfil: this.fotoPerfil()
    }).subscribe({
      next: () => {
        this.authService.atualizarNome(this.nomeCompleto());
        this.salvando.set(false);
        this.avisos.sucesso('Perfil atualizado com sucesso!');
      },
      error: (e) => {
        this.salvando.set(false);
        this.avisos.erroHttp(e);
      }
    });
  }

  selecionarTema(tema: string): void {
    this.temaSelecionado.set(tema);
    this.aplicarTema(tema);
    localStorage.setItem('tema', tema);
    this.avisos.sucesso('Tema aplicado!');
  }

  private aplicarTema(tema: string): void {
    document.documentElement.setAttribute('data-theme', tema);
  }

  labelPerfil(perfil: string): string {
    return rotuloPerfil(perfil);
  }
}
