import { Routes } from '@angular/router';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login')
        .then(m => m.LoginComponent)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/dashboard/dashboard')
        .then(m => m.Dashboard)
  },
  {
    path: 'veiculos',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/veiculos/veiculos')
        .then(m => m.Veiculos)
  },
  {
    path: 'veiculos/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/veiculos/veiculo-detalhe/veiculo-detalhe')
        .then(m => m.VeiculoDetalhe)
  },
  {
    path: 'lancamento-mensal',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/lancamento-mensal/lancamento-mensal')
        .then(m => m.LancamentoMensal)
  },
  {
    path: 'abastecimentos',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/abastecimentos/abastecimentos')
        .then(m => m.Abastecimentos)
  },
  {
    path: 'abastecimentos/motorista/:login',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/abastecimentos/abastecimento-motorista/abastecimento-motorista')
        .then(m => m.AbastecimentoMotoristaComponent)
  },
  {
    path: 'abastecimentos/veiculo/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/abastecimentos/abastecimento-veiculo/abastecimento-veiculo')
        .then(m => m.AbastecimentoVeiculoComponent)
  },
  {
    path: 'ocorrencias',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/ocorrencias/ocorrencias/ocorrencias')
        .then(m => m.Ocorrencias)
  },
  {
    path: 'ocorrencias/motorista/:login',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/ocorrencias/ocorrencia-motorista/ocorrencia-motorista')
        .then(m => m.OcorrenciaMotoristaComponent)
  },
  {
    path: 'ocorrencias/veiculo/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/ocorrencias/ocorrencia-veiculo/ocorrencia-veiculo')
        .then(m => m.OcorrenciaVeiculoComponent)
  },
  {
    path: 'manutencao',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/manutencao/manutencao')
        .then(m => m.Manutencao)
  },
  {
    path: 'manutencao/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/manutencao/manutencao-detalhe/manutencao-detalhe')
        .then(m => m.ManutencaoDetalhe)
  },
  {
    path: 'relatorios',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/relatorios/relatorios/relatorios')
        .then(m => m.RelatoriosComponent)
  },
  {
    path: 'cadastros',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/cadastros/cadastros/cadastros')
        .then(m => m.CadastrosComponent)
  },
  {
    path: 'configuracoes',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/configuracoes/configuracoes')
        .then(m => m.ConfiguracoesComponent)
  },
  {
    path: 'mapa',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/mapa/mapa')
        .then(m => m.MapaComponent)
  },
  {
    path: 'historico-diario',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/historico-diario/historico-diario')
        .then(m => m.HistoricoDiarioComponent)
  },
  {
    path: 'logs',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/logs/logs/logs')
        .then(m => m.LogsComponent)
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];