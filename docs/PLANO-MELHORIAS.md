# Plano de melhorias do front (implementação em partes)

## Contexto
Você já fez a auditoria do front. Agora vamos corrigir o que ela encontrou, em partes pequenas, com a minha aprovação a cada parte. O sistema está em uso real (é o meu TCC), então segurança e possibilidade de desfazer vêm antes de velocidade. Eu sou estudante: explique em português simples, sem jargão desnecessário.

## Passo 1 (AGORA): só o plano. Não altere nada
Escreva o plano de melhorias dividido em partes. Para CADA parte, informe:
1. Objetivo: o que melhora e por que importa.
2. O que você vai fazer, passo a passo, citando os arquivos (arquivo:linha quando já souber).
3. O que NÃO vai mexer (o limite da parte).
4. Como vai verificar: ng build, ng test e os testes novos que pretende criar.
5. O que eu devo testar no navegador depois (passo a passo curto).
6. Riscos: o que pode quebrar e como desfazer.
7. Tamanho: P, M ou G.
8. Perguntas que preciso responder antes dessa parte começar.

No fim, entregue uma tabela-resumo (parte, tamanho, depende de qual parte) e as dúvidas gerais.

Neste passo você pode ler arquivos e rodar comandos de leitura. Também pode rodar `ng build` e `ng test` para medir o estado atual, mesmo que isso gere dist/ ou cache. NÃO edite, crie nem apague arquivos do projeto, e não instale nada. Pare depois de entregar o plano e espere a minha resposta.

## Divisão proposta
Você pode sugerir ajustes na divisão, justificando.

**Parte 0: Rede de segurança**
- Rodar ng build e ng test e anotar o resultado como linha de base (erros e warnings que já existem).
- Fazer o ng test compilar e rodar: corrigir ou remover os specs quebrados (imports de classes que não existem, app.spec.ts), mantendo só testes que façam sentido.
- Corrigir o CLAUDE.md: ele diz Angular 19, mas o instalado é o 21.2.x.
- Se o ng build de produção acusar problema (ex.: limite de tamanho do app.css), reportar e propor a solução.

**Parte 1: Segurança imediata**
- XSS: mapa.ts (popups do Leaflet) e dashboard.ts (fotoPerfil). Escapar o texto ou montar o elemento via DOM.
- Subir o Angular para 21.2.25 (dentro do ^ atual) e atualizar jspdf/dompurify. Rodar `npm audit --omit=dev` antes e depois. Nunca usar `npm audit fix --force`.
- index.html: fixar as versões dos CDNs (Tabler está em @latest), remover o Leaflet duplicado e o Leaflet Routing Machine (não usado). Antes, confirmar que nada depende do `L` global.

**Parte 2: Autenticação (token)**
- Interceptor que envia `Authorization: Bearer <token>` em todas as chamadas à API, exceto /auth/login.
- 401 em qualquer chamada, menos no login: limpar só as chaves da sessão (manter o tema), ir para /login e mostrar "sessão expirada".
- Guard que confere a expiração do token (veja "Fatos da API": o exp está em milissegundos).
- environment.ts com a URL da API. Remover a URL fixa de auth.ts, usuario.ts e configuracoes.ts, e o acesso ao campo privado `usuarioService['http']`.
- Login com mensagens diferentes: credenciais erradas (401), servidor fora ou sem rede (status 0), erro 5xx, e aviso de que a primeira conexão pode demorar cerca de 1 minuto (servidor gratuito acordando).
- Logout centralizado em um único lugar.
- Testes do interceptor e do guard.
- Atualizar a seção "Autenticação" do CLAUDE.md (hoje ela diz que o front não envia o token).

**Parte 3: Datas**
- Um utilitário único: converte a data da API (UTC) para local, formata em pt-BR e cria início e fim do dia local para filtros.
- Substituir os usos de `| date` e `new Date(string)` sobre dados da API: alertas e gráficos do dashboard, relatórios, e os filtros "data fim" de abastecimentos, ocorrências, relatórios e veiculo-detalhe.
- Deixar a suposição sobre o formato da API em um único lugar, fácil de ajustar.
- Testes do utilitário (incluindo virada de dia e de mês).

**Parte 4: Diários e assinatura**
- lancamento-mensal: 3 badges (aberto, fechado = pendente de assinatura, assinado), usando o status que a API devolve.
- Botão "Verificar integridade" nos diários assinados (GET /diarios/{id}/verificar), mostrando íntegro ou alterado.
- relatorios: corrigir o filtro por veículo que sai sempre vazio (`i['veiculoId']`).
- Manter a regra: o front nunca edita diário.
- Não decidir se os relatórios contam só diários assinados. Isso é decisão minha: pergunte.

**Parte 5: Erros, avisos e formulários**
- Serviço central de avisos (toast do DaisyUI, sem biblioteca nova) com mensagens por status HTTP. Usar a mensagem do corpo da resposta quando a API enviar `{"erro": "..."}`.
- Telas: separar "erro ao carregar" de "lista vazia", com botão "tentar de novo".
- Formulários: validações (CPF, valores >= 0, tamanho da foto), `[ngValue]` no lugar de `[value]="null"`, e secretariaId com o tipo correto.
- Tipos de veículo vindos da API, em vez de UUID fixo no código. Investigar o `tipoId: ''` na edição.
- Status do veículo: um tipo união único e um mapa de rótulos só (hoje há 'manutencao' e 'em_manutencao').
- Paginação volta para a página 1 quando o filtro ou a busca muda.
- Parâmetros de URL com HttpParams (encode correto).
- CSV correto: separador `;`, aspas com escape, proteção contra fórmulas (= + - @).

**Parte 6: Estabilidade e desempenho**
- O app roda sem zone.js. Trocar por signals os campos alterados depois de resposta HTTP ou FileReader (mapa.ts, manutencao.ts, configuracoes.ts).
- Polling do dashboard (7 chamadas a cada 15 s): tirar do ciclo o que a tela não exibe e propor pausar quando a aba estiver oculta.
- OSRM: reduzir as chamadas em sequência, num utilitário único. Antes de mudar o que é enviado a terceiros, me explique a opção.
- Destruir gráficos Chart.js e mapas no ngOnDestroy.
- takeUntilDestroyed nos subscribes de router.events (nav-bar e app).

**Parte 7: Interface**
- Menu lateral responsivo (drawer do DaisyUI), mantendo as cores atuais.
- Acessibilidade básica: aria-label em botões só com ícone, label com for/id, modais com `<dialog>` ou role="dialog" (Esc e foco), linhas clicáveis acessíveis por teclado.
- Textos: padronizar o nome do sistema (pergunte qual), corrigir o link "Ocorrencias" com tooltip "Estoque", remover a opção de tema "dracula" que não funciona, corrigir o fundo do checklist (bg-success).
- Formatação única de moeda, km, horas e validade da CNH.
- NÃO mexer em paleta, cores nem tema: a escolha da paleta ainda está pendente.

**Parte 8: Organização do código (maior risco; só com aprovação separada, bloco a bloco)**
- Quebrar o UsuarioService (572 linhas) por domínio e mover as interfaces para interfaces/, com tipos união.
- Utilitário de mapa no lugar das 7 cópias.
- Unificar as telas duplicadas de motorista e veículo (abastecimentos e ocorrências), com modal e avatar compartilhados.
- Remover código morto: listar tudo e esperar o meu OK antes de apagar.
- Reduzir os `any`, remover console.log e o postcss duplicado.

## Fatos da API (não adivinhe além disto)
- Token: JWT HS256 com payload `{sub, perfil, iat, exp}`. ATENÇÃO: o `exp` está em MILISSEGUNDOS (fora do padrão, que usa segundos). Compare direto com `Date.now()`. Validade padrão: 24 h.
- POST /auth/login devolve `{token, nome, perfil}`. GET /auth/me (exige token) devolve os dados do usuário logado.
- Hoje só algumas rotas exigem token: /auth/me, /usuarios/me/**, GET /diarios/meus, PUT /diarios/{id}, POST /diarios/{id}/assinar, GET /diarios/{id}/verificar. As demais ainda estão abertas, mas depois serão fechadas atrás do JWT, então o interceptor deve valer para todas.
- 401 = token ausente, inválido ou expirado.
- Diário: status `aberto` -> `fechado` (pendente de assinatura) -> `assinado`. Diário assinado não pode ser alterado.
- GET /diarios/{id}/verificar devolve um campo booleano `integro`. Não invente outros campos: se precisar do formato completo, peça um exemplo.
- Datas: suponha, até eu confirmar, que a API manda horário UTC sem "Z" (ex.: "2026-10-18T13:08:00"). Mantenha essa suposição em UM só lugar.
- Status do veículo: não sei se o valor correto é 'manutencao' ou 'em_manutencao'. Trate os dois por enquanto e me pergunte.
- Para qualquer outro comportamento da API que você não conheça: pergunte. Não contorne no front o que for problema da API; anote em "Pendências para a API".

## Regras durante a implementação (depois que eu aprovar o plano)
- Uma parte por vez. Só comece quando eu escrever "pode começar a parte N".
- Antes de editar, liste os arquivos que vai tocar.
- Menor mudança possível, no estilo atual do projeto (standalone, signals, @if/@for, Tailwind + DaisyUI). Textos de tela em português.
- TypeScript estrito: sem novos `any`, sem `// @ts-ignore`, sem afrouxar o tsconfig, e sem aumentar os budgets do angular.json sem me avisar.
- Dependências: só as combinadas aqui. Nenhuma biblioteca nova sem perguntar.
- NÃO faça commit nem push. NÃO apague arquivos sem listar antes. NÃO rode `ng serve`. NÃO chame a API real (nos testes use mocks, como o HttpTestingController).
- Se ng build ou ng test falhar, corrija dentro do escopo da parte. Nunca desabilite teste nem esconda erro. Se não resolver em 3 tentativas, pare e me explique.

## Verificação (ao final de CADA parte)
1. `ng build` (produção). Compare os warnings com a linha de base da Parte 0 e reporte os novos.
2. `ng test` em modo único, sem watch e sem abrir navegador interativo. Descubra se o projeto usa Vitest ou Karma e use a flag correta.
3. Reporte: comando, resultado (passou ou falhou), número de testes e warnings novos.
4. Diga o que você não consegue verificar sozinho (a tela no navegador) e liste o passo a passo curto para eu testar.

## Relatório ao fim de cada parte
- O que mudou (arquivo -> 1 linha).
- Resultado do ng build e do ng test.
- O que testar no navegador.
- Pendências e dúvidas (inclusive "Pendências para a API").
- Se a parte mudou o contrato com a API (Partes 2 e 4), atualizar o CLAUDE.md.
- Termine perguntando "Posso seguir para a parte N+1?" e PARE.