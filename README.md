# SIGMAP: painel web de gestão de frota

Painel web do Sistema de Gestão de Frota e Equipamentos, desenvolvido como TCC (Unespar) para a Secretaria de Obras de Cruz Machado-PR. É usado pelos gestores para acompanhar veículos, diários de bordo, abastecimentos, manutenções, ocorrências e relatórios. Os motoristas usam um aplicativo próprio.

A API (back-end) fica em outro repositório: https://github.com/yaGODxd/sistema-obras-api

## Tecnologias
- Angular 21 (componentes standalone, signals, sem zone.js)
- Tailwind CSS 4 e DaisyUI 5
- Leaflet (mapas), Chart.js (gráficos), jsPDF (relatórios em PDF)
- Vitest (testes)

## Pré-requisitos
- Node.js 20 ou mais novo e npm

## Como rodar
    npm install
    npx ng serve

Abra http://localhost:4200/ no navegador. A página recarrega sozinha ao salvar um arquivo.

## Como gerar o build
    npx ng build

Os arquivos ficam em `dist/`.

## Como rodar os testes
    npx ng test --watch=false

## URL da API
O endereço da API fica só em `src/environments/environment.ts` (campo `apiUrl`). Para usar outra API, por exemplo uma rodando na sua máquina, altere esse campo.

## Estrutura de pastas (src/app)
- `pages/`: as telas (dashboard, veículos, manutenção, abastecimentos, ocorrências, relatórios, lançamento mensal, cadastros, logs, mapa, configurações e login)
- `services/`: autenticação e chamadas à API
- `interceptors/`: envio do token e tratamento das datas
- `guards/`: proteção das rotas (só gestor logado)
- `shared/`: componentes, diretivas e funções reutilizadas (`shared/utils`)
