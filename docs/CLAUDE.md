# SGFE: front web (Angular)

Painel web do Sistema de Gestão de Frota e Equipamentos (TCC, Unespar, Secretaria de Obras de Cruz Machado-PR), usado por gestores. Stack: Angular 21.2.x (standalone, signals, sem zone.js), Tailwind v4 e DaisyUI 5. Testes com Vitest (`ng test --watch=false`). Textos da interface em português do Brasil.

API (repositório separado): github.com/yaGODxd/sistema-obras-api
Base URL: https://sistema-obras-api.onrender.com/ (servidor Render free: a primeira chamada pode levar cerca de 1 minuto).

## Como trabalhar
- Antes de criar ou alterar telas, ler 2 ou 3 telas existentes e os arquivos de estilo e tema, e seguir o padrão já usado. Não adicionar bibliotecas sem avisar.
- A paleta nova do front ainda está em decisão: não mudar cores globais nem o tema sem eu pedir.
- Uma tarefa por vez, com mudanças pequenas. Depois de editar, rodar o build (ng build) e corrigir os erros.
- Não fazer commit nem push sem eu pedir.
- No final, listar os arquivos criados e alterados.
- Não criar arquivo CSS vazio em componente novo (os vazios que já existem ficam).
- O código não tem `any` (nem `$any` nos templates) nem `console.log`: manter assim. O único console é o `console.error` de falha ao iniciar, em `main.ts`. Mapas e camadas do Leaflet usam `L.Map` e `L.Layer`.
- O Tailwind é ligado só pelo `.postcssrc.json` (o Angular não lê `postcss.config.js`).

## Estrutura (src/app)
- `pages/`: abastecimentos (+ `abastecimentos-de`), cadastros, configuracoes, dashboard, lancamento-mensal, login, logs, manutencao (+ manutencao-detalhe), mapa, ocorrencias (+ `ocorrencias-de`), relatorios, veiculos (+ veiculo-detalhe). A tela /historico-diario foi removida (o trajeto do diário fica no lançamento mensal).
- `abastecimentos-de` e `ocorrencias-de`: UMA tela para "do motorista" e "do veículo". As rotas continuam `/…/motorista/:login` e `/…/veiculo/:id`; o modo vem de `data: { por: 'motorista' | 'veiculo' }` em `app.routes.ts`. Diferença entre os modos: título, card de informações, coluna da tabela, busca e (abastecimentos) os gráficos 2 e 3.
- `services/`: um serviço por domínio: `auth.ts` (login e sessão: usar `getNome()`/`getLogin()`/`atualizarNome()`, não ler o localStorage nas telas), `veiculo.ts`, `diario.ts`, `rastreamento.ts`, `abastecimento.ts`, `ocorrencia.ts`, `manutencao.ts`, `cadastros.ts` (mecânicos e postos), `checklist.ts`, `log.ts`, `usuario.ts` (usuários, motoristas online e secretarias). `servicos.spec.ts` confere método e endereço de cada chamada.
- `interfaces/`: os tipos da API, um arquivo por domínio (mesmos nomes dos serviços). Tipos união para os valores conhecidos: `StatusVeiculo`, `StatusDiario` (aberto/fechado/assinado), `StatusManutencao` (aberta/em_andamento/concluida), `TipoManutencao` (preventiva/corretiva), `StatusOcorrencia` (pendente/em_andamento/resolvida), `Perfil` (gestor/motorista). Campos novos da API ficam opcionais e são lidos com valor padrão, para respostas antigas continuarem funcionando: status da ocorrência ausente = pendente (`statusDaOcorrencia`); horário suspeito (`interfaces/horario-suspeito.ts`, em abastecimento e ocorrência) ausente = normal (`ehHorarioSuspeito`). Um único `DiarioResponse` (lista e diário aberto).
- `interceptors/` (token e datas UTC), `guards/auth-guard.ts`.
- Datas da API: o banco guarda UTC. Com a chave `APP_DATAS_COM_FUSO` desligada a API manda sem fuso ("2026-10-20T14:00:00"); ligada, com "Z". O front aceita os dois: a regra única está em `shared/utils/datas.ts` (sem fuso = UTC; com Z ou deslocamento = como veio), aplicada pelo `datas.interceptor.ts`, e a tela mostra no fuso do navegador. Filtros: logs mandam `inicio`/`fim` como "AAAA-MM-DD" (a API corta o dia pelo horário de Brasília); diários mandam `mes`/`ano`; as demais telas filtram no navegador pelo dia local.
- `shared/components`: avisos, avatar (foto ou inicial; tamanhos 8, 9, 10 e 16; cor primary/success; `src` para prévia pronta; o ÚNICO lugar que desenha foto de perfil; a foto passa por `urlDaFoto` (utils/imagem), que tira espaços e quebras de linha e prefixa "data:image/jpeg;base64," se não começar com "data:"; sem foto, ou se o `<img>` disparar `error`, mostra a inicial num círculo flex centralizado. Não usar a classe `placeholder` do DaisyUI 4: no DaisyUI 5 é `avatar-placeholder`, e sem ela a inicial fica no canto. Exceção: o marcador do mapa do Dashboard, montado no DOM, troca a imagem pela inicial no `onerror`), erro-carregar, modal-abastecimento e modal-ocorrencia (os modais de detalhe usados em todas as telas; o de ocorrência cria e destrói o próprio mapa), modal-diario (detalhe do diário no Lançamento Mensal; só exibe, a tela faz as chamadas e guarda o resultado), nav-bar, paginacao, status-badge. `shared/directives`: modal, clicavel. `shared/services/avisos.ts`.
- `shared/utils`: abastecimentos (`badgeCombustivel`), cpf, csv, datas, diarios, erros, formatos, html, imagem (inclui `urlDaFoto`), manutencoes (rótulos e cores de status e tipo), mapa, ocorrencias (`badgeTipoOcorrencia`), params (`montarParams` para HttpParams), pecas, perfis, trajeto, veiculos (funções puras, com spec).
- Mapas: sempre por `shared/utils/mapa.ts` (`criarMapa` = satélite Esri + nomes; `criarIconePonto`; `criarMapaOcorrencia`; `desenharPontos`, `desenharSegmentos`, `removerCamadas`, `enquadrarPontos`). Não repetir as URLs do Esri nas telas. Ícones exclusivos (foto no Dashboard, caminhão no /mapa) ficam na tela.
- Peças da manutenção: lista LOCAL do modal "Nova manutenção" (adicionar, editar pelo lápis, remover), regras e totais em `shared/utils/pecas.ts`; a API só recebe as peças no POST /manutencoes. No detalhe da manutenção, o lápis de cada peça abre "Editar peça" (PUT /manutencoes/pecas/{pecaId} com nomePeca, codigoPeca?, marcaPeca?, quantidade ≥ 1, valorUnitario ≥ 0; mesmas regras de `validarPeca`); depois de salvar, a manutenção é buscada de novo para os totais virem da API. Manutenção concluída: lápis desligado (a API responde 409 "Não é possível alterar peça de manutenção concluída.", sem código; nesse caso a tela mostra o erro, fecha e busca de novo).

## Autenticação
- POST /auth/login {login, senha} -> {token, nome, perfil}. O perfil é "gestor" ou "motorista". 401 se login/senha errados ou usuário inativo.
- Rotas [TOKEN] exigem `Authorization: Bearer <token>` e devolvem 401 sem ele. O token vale 24 h por padrão.
- Token: JWT com payload `{sub, perfil, iat, exp}`. ATENÇÃO: o `exp` está em MILISSEGUNDOS (compare direto com `Date.now()`).
- Hoje a maioria das rotas ainda está aberta, mas a API passará a exigir o token em todas. O front JÁ envia o token:
  - URL da API só em `src/environments/environment.ts`.
  - `src/app/interceptors/auth.interceptor.ts` adiciona `Authorization: Bearer <token>` em toda chamada para a API, menos `/auth/login`. Em 401 (fora do login): limpa a sessão e vai para `/login?motivo=sessao-expirada`.
  - `src/app/guards/auth-guard.ts` exige token não vencido (`AuthService.tokenValido()`) e perfil "gestor".
  - Sessão no localStorage (`token`, `nome`, `perfil`, `login`). Logout só em `AuthService.logout()`, que mantém o `tema`.
  - Login mostra mensagens diferentes para 401, sem conexão (status 0) e 5xx, e avisa após 5 s que o servidor pode estar acordando.
- [TOKEN] GET /auth/me -> {login, perfil}

## Diários e assinatura
Ciclo do diário: aberto, fechado (pendente de assinatura) e assinado. O motorista assina no app com um PIN pessoal. Depois de assinado, o diário não é mais editado.
- GET /diarios?veiculoId=&mes=&ano= -> lista com id, veiculoDescricao, veiculoPlaca, motoristaNome, medidorInicial, medidorFinal, medidorPercorrido, destino, status, abertoEm, fechadoEm. O status pode ser "aberto", "fechado" ou "assinado".
- [TOKEN] GET /diarios/{id}/verificar -> {assinado, integro, assinadoEm, mensagem}. O gestor pode verificar qualquer diário. "integro: false" indica que o conteúdo mudou depois da assinatura. Em erro, a API manda {"erro": "..."}.
- GET /diarios NÃO devolve veiculoId: o filtro por veículo vai só como parâmetro para a API.

Como o front usa (nunca edita nem assina diário):
- Rótulos e cores do status em `src/app/shared/utils/diarios.ts`: aberto = "Aberto" (amarelo), fechado = "Pendente de assinatura" (azul), assinado = "Assinado" (verde).
- Lançamento Mensal: a tabela NÃO tem botão nem coluna de integridade. Ao abrir o modal de um diário assinado, a tela chama GET /diarios/{id}/verificar sozinha (nunca ao carregar a lista) e o modal mostra o resultado como texto: "Íntegro" (verde) ou "Alterado depois da assinatura" (vermelho), com a `mensagem` da API. O resultado fica guardado enquanto a tela estiver aberta; se der erro, "Tentar de novo" no modal ou reabrir o modal verifica outra vez. Não existe "Verificar todos".
- Lançamento Mensal, modal de detalhes: clicar na linha (ou Enter/Espaço) abre `<app-modal-diario>`. Ao abrir, e só ao abrir, chama em paralelo (forkJoin) GET /abastecimentos/diario/{id} e GET /ocorrencias/diario/{id}; o resultado fica guardado por diário enquanto a tela estiver aberta (erro = "Tentar de novo" refaz as duas). Os botões da linha usam stopPropagation e não abrem o modal. "Ver rota" e "Checklist" dentro do modal fecham o detalhe e abrem os modais que já existem (nunca dois modais empilhados).
- Relatório de Lançamento Mensal (CSV/PDF): entram fechados + assinados; abertos nunca entram. Coluna "Situação" e, no PDF, o aviso "N diário(s) pendente(s) de assinatura no período". Opção "Somente assinados" (desligada por padrão).

## Ocorrências e status
- Status: `pendente` -> `em_andamento` (a API muda sozinha ao criar manutenção ligada) -> `resolvida` (quando todas as manutenções ligadas terminam). Respostas trazem `status` e `resolvidaEm`; a lista detalhada traz também `manutencoes` (id e status). Sem status = pendente (`statusDaOcorrencia`). Rótulos e cores em `shared/utils/ocorrencias.ts`.
- Troca manual: PUT /ocorrencias/{id}/status `{status}`, feita DENTRO do `<app-modal-ocorrencia>` ("Mudar status"); a tela que abriu recebe `(statusAlterado)` com a ocorrência atualizada e troca na lista (o `resolvidaEm` local é aproximado até recarregar).
- Selo de status: listas de Ocorrências, Ocorrências do motorista/veículo, aba do detalhe do veículo e modal do diário. Filtro por status (no navegador): lista de Ocorrências e modal do diário. GET /ocorrencias aceita `?status=`, ainda não usado.
- Nova manutenção: o "Buscar Ocorrência" esconde as resolvidas e mostra o status; depois de criar uma manutenção ligada, a lista é buscada de novo na próxima abertura.

## Fotos do diário
- GET /diarios/{id}/fotos: só os dados (id, tipo, ocorrenciaId, abastecimentoId, tiradaEm, recebidaEm, tamanhoBytes, tipoMime, hashSha256, idLocal, horarioSuspeito, motivoSuspeita), NUNCA a imagem. GET /fotos/{id}: a imagem, com token. Tipos e rótulos em `interfaces/foto.ts` e `shared/utils/fotos.ts`.
- `<img src>` não manda token: a imagem vem pelo HttpClient como blob (`FotoService.baixarFoto`) e vira URL "blob:" no `FotosCache` (`shared/services/fotos-cache.ts`). O cache NÃO é global: a tela o coloca em `providers` (hoje só `lancamento-mensal`); ao sair dela, o `ngOnDestroy` libera todas as URLs (`revokeObjectURL`) e um download em andamento é cancelado. Cada foto é baixada uma vez por tela (a API também manda ETag e Cache-Control de 1 dia).
- `<app-foto-miniatura [fotoId] [alt]>`: só baixa quando aparece na tela (IntersectionObserver; sem ele, baixa na hora). `<app-fotos-diario [diarioId]>`: seção "Fotos" no modal do diário; nada é buscado até clicar em "Mostrar fotos"; clicar numa miniatura amplia ali mesmo (nunca outro modal empilhado). Ainda não há fotos no banco (o app está sendo adaptado): lista vazia = "Nenhuma foto neste diário."
- `<app-fotos-vinculadas [diarioId] [abastecimentoId] | [ocorrenciaId]>`: no modal do diário, as fotos ligadas a cada abastecimento (linha abaixo dele na tabela) e a cada ocorrência, pelo `abastecimentoId`/`ocorrenciaId` da foto. Clicar amplia logo abaixo; sem fotos (ou erro na lista), não mostra nada. A lista de dados é UMA chamada por diário (o `FotosCache` junta os pedidos ao mesmo tempo) e é feita ao abrir o modal, quando há abastecimento ou ocorrência; as imagens continuam só quando aparecem. Depende do `id` em GET /abastecimentos/diario/{id} e GET /ocorrencias/diario/{id} (sem ele, as fotos ficam só na seção Fotos).
- A foto chama de `recebidaEm` o que o resto chama de `recebidoEm`: `comRecebidoEm` (utils/fotos) faz a cópia para o quadro de horário suspeito.
- Uso do banco: GET /fotos/uso (só gestor) -> quantidadeFotos, megabytesFotos, megabytesTabelaFotos, megabytesBanco. Aparece em Configurações, no cartão "Informações do Sistema" (busca ao abrir a tela; erro com "Tentar de novo").

## Horário suspeito (registros offline)
- Abastecimentos e ocorrências trazem `horarioSuspeito`, `motivoSuspeita` (CÓDIGOS separados por vírgula), `recebidoEm` e `idLocal`. Só aviso: nada é bloqueado. Sem o campo = normal.
- Textos em português dos códigos em `shared/utils/horario-suspeito.ts` (HORARIO_FUTURO, HORARIO_ANTIGO = enviado mais de 7 dias depois, DESVIO_RELOGIO = relógio a mais de 5 min do servidor, FORA_DA_JANELA_DIARIO, FORA_DA_JANELA_TURNO, COMBOIO_SEM_DIARIO). Código desconhecido aparece cru; suspeito sem código = "Horário do celular fora do esperado."
- `<app-selo-horario-suspeito [registro]>` (`shared/components/selo-horario-suspeito`): selo "Horário a conferir" (amarelo, contorno) com a explicação no title, ao lado da data nas listas de abastecimentos e ocorrências (geral, do motorista/veículo, detalhe do veículo e modal do diário). Com `[detalhado]="true"`: quadro com cada motivo e "Recebido pelo servidor em" (modais de abastecimento e ocorrência).
- Filtro "Só horário a conferir" (no navegador): listas gerais de Abastecimentos e Ocorrências.

## Erros da API e avisos na tela
Formato de erro da API: `{"erro": "mensagem em português", "codigo": "CODIGO"}`. O `erro` é para mostrar ao usuário. O `codigo` só vem em alguns casos e serve para o front decidir o que fazer (ex.: 409 `PLACA_EM_USO`, 409 `PLACA_DE_VEICULO_INATIVO`); nunca mostrar o código cru. 401 = sessão expirada (token de 24 h); 403 = sem permissão (mostrar o `erro`).
Casos que o front continua tratando, por segurança:
1. Erro padrão do Spring `{"timestamp","status","error","path"}` (respostas antigas). O "error" é o nome do status em inglês: NUNCA mostrar.
2. Corpo vazio.
3. Status 0 (sem conexão, servidor fora ou CORS) e 502/503/504 (podem vir com HTML quando o servidor gratuito está acordando).

No front:
- `src/app/shared/utils/erros.ts` → `mensagemDeErro()`: body.erro (string) → body.message (string) → mensagem padrão por status. Nunca usa body.error nem texto cru/HTML.
- `src/app/shared/services/avisos.ts` (AvisosService) + `<app-avisos>` no app.html: toasts de sucesso (4 s) e erro (8 s). `avisos.erroHttp(e)` para erros HTTP.
- `<app-erro-carregar>`: estado "não foi possível carregar" com "Tentar de novo", separado de "lista vazia".
- Mostrar mensagens sempre por interpolação `{{ }}`, nunca innerHTML. O 401 continua no interceptor de autenticação.

## Veículos, formulários e exportação
- Status do veículo (gravados pela API): `disponivel`, `em_uso`, `em_manutencao`, `inativo` ("manutencao" sem "em_" NÃO existe). Tipo `StatusVeiculo` e rótulos únicos em `src/app/shared/utils/veiculos.ts`; status desconhecido aparece como veio, em cinza. DELETE /veiculos/{id} não apaga: só muda para "inativo". PUT /veiculos/{id}/ativo `{ativo: true}` reativa (volta "disponivel"; 400 se outro veículo ativo já usa a placa): botão "Reativar" em Cadastros.
- Placa (`shared/utils/placa.ts`): a API normaliza (maiúsculas, sem hífen e sem espaço) e devolve null sem placa; o front normaliza igual no envio e NÃO valida formato (máquinas não têm placa). "Sem placa" só na tela; PDF "S/P"; CSV célula vazia. Cadastro com placa repetida: 409 `PLACA_EM_USO` (mostra o `erro`) ou 409 `PLACA_DE_VEICULO_INATIVO` (pergunta se quer reativar o veículo inativo dessa placa, achado na lista pela placa normalizada).
- Tipo de veículo: GET /tipos-veiculo. No CADASTRO (POST /veiculos) o tipoId tem de ser o UUID real da lista (nunca fixo no código; '' dá erro). Na EDIÇÃO (PUT) a API ignora o tipoId, mas exige o campo: o front envia '' e mostra o tipoNome só como texto. GET /veiculos traz só tipoNome (sem tipoId).
- CPF: a API não valida. O front exige 11 números e envia só os dígitos (`shared/utils/cpf.ts`). A checagem dos dígitos verificadores fica atrás do interruptor `validarDigitosCpf` em `src/environments/environment.ts`: DESLIGADO na fase de testes; ligar antes do uso real.
- Valores numéricos (medidor, custos, valor da peça) não podem ser negativos (validação no front). Quantidade de peça > 0.
- Selects com opção "Selecione" usam `[ngValue]="null"` (nunca `[value]="null"`, que vira o texto "null").
- Fotos (`shared/utils/imagem.ts`): só JPEG/PNG/WebP de até 5 MB, com aviso. NENHUMA imagem é reduzida (perfil e nota fiscal vão como o original).
- CSV (`shared/utils/csv.ts`), para o Excel em português: separador ";", decimal com vírgula, datas dd/MM/aaaa HH:mm, BOM UTF-8. Proteção contra fórmula (prefixo ') só em colunas de texto digitado por pessoas; números nunca recebem prefixo.
- Parâmetros de URL sempre com HttpParams.
- Paginação das listas volta para a página 1 quando a busca ou um filtro muda (`linkedSignal`).

## Estabilidade e desempenho
- O app roda SEM zone.js: campo alterado depois de HTTP, FileReader ou setTimeout precisa ser signal, senão a tela não atualiza.
- Dashboard: a cada 15 s busca motoristas online, posições, veículos em uso, status da frota e manutenções abertas; abastecimentos a cada 2 min. Não busca a lista de diários. Com a aba oculta (visibilitychange) para tudo; ao voltar, atualiza na hora.
- Trajetos (dashboard e lançamento mensal): `TrajetoNoMapa` (`shared/utils/mapa.ts`). Ao abrir o trajeto, o traçado pelas ruas (OSRM) é feito SOZINHO (sem botão); enquanto calcula, aparece a linha reta provisória. TODOS os pontos gravados ficam POR CIMA (bolinha pequena por ponto, tooltip com hora e velocidade, sem filtro e sem arredondar), na ordem da hora de gravação (`ordenarPontos`; se faltar hora, ordem da API). Início e "Posição atual" = pontos reais (o último por hora), nunca o traçado. Legenda `<app-legenda-trajeto>` (linha ajustada às ruas, pontos reais, aviso). Unidade da velocidade A CONFIRMAR (`UNIDADE_VELOCIDADE`, vazia: mostra o número como veio).
- OSRM (`src/app/shared/utils/trajeto.ts`): público `/match`, coordenadas longitude,latitude, overview=full, geometries=geojson, steps=false, gaps=split, tidy=true, radiuses=30 por ponto e timestamps (segundos desde 1970) quando todos os pontos do bloco têm hora crescente. Blocos de até 100 pontos com 1 de sobreposição; pontos a menos de 15 m não vão ao OSRM (continuam no mapa); uma chamada por vez, 1 s de intervalo, timeout de 10 s. Plano B por bloco: code diferente de "Ok", 429, timeout, sem rede, ou traçado mais de 1,5 x maior que a linha dos pontos reais (e 100 m a mais) -> linha reta entre os pontos reais (cinza tracejada) e aviso "traçado aproximado (pontos reais)". Cache por diário: mesmos pontos = guardado; pontos novos (ao vivo) = recalcula no máximo a cada 30 s e só os blocos do fim (blocos completos reaproveitados; bloco que falhou por rede é tentado de novo). Dashboard: o trajeto do motorista focado é atualizado a cada 15 s junto com o painel, só se chegaram pontos novos. Os pontos de GPS vão para esse servidor de terceiros.
- Coordenadas: o front não arredonda (Leaflet e URL do OSRM recebem o número completo). O banco passou a guardar 7 casas decimais; pontos antigos, gravados arredondados, continuam aparecendo deslocados (esperado).
- Telas com gráficos (Chart.js) ou mapas (Leaflet) destroem tudo no ngOnDestroy. Assinaturas de router.events usam takeUntilDestroyed.

## Interface e acessibilidade
- Nome do sistema nas telas: SIGMAP (provisório; ainda não há nome oficial).
- Menu lateral (`shared/components/nav-bar`): no computador começa aberto e pode ser recolhido; abaixo de 1024 px vira gaveta com botão ☰ na barra superior (fecha ao escolher uma tela, ao tocar fora ou com Esc). Cores do menu mantidas (#1C2B3A). NÃO mexer na paleta/tema sem pedido.
- Modais: sempre `<div class="modal modal-open" appModal (fechar)="...">` (`shared/directives/modal.ts`): role="dialog", título do h3, Esc fecha, Tab preso no modal, foco no 1º campo e devolvido ao fechar. Botão X com `aria-label="Fechar"`.
- Linha ou card com (click) que não é `<button>`: usar `appClicavel` (`shared/directives/clicavel.ts`) para Tab + Enter/Espaço.
- Badges com texto (status, tipo, combustível, perfil, ação de log): sempre `<app-status-badge [texto] [cor] [titulo]>` (`shared/components/status-badge`). O `.badge` do DaisyUI tem altura fixa e deixa o texto quebrar, o que faz vazar; o componente põe tudo numa linha, com altura automática, reticências se faltar espaço e o texto completo no `title`. Em tabela, rótulo curto (`rotuloCurtoStatusDiario`: "Pendente") com o completo no `titulo`; em modal, o completo. `badge` solto só para contador ou placa.
- Botão só com ícone precisa de `aria-label`. Rótulo de formulário com `for` igual ao `id` do campo; busca e filtro sem rótulo visível usam `aria-label`.
- Números em código TS (PDFs, textos): `shared/utils/formatos.ts` (`formatarMoeda` → "R$ 1.234,50", `formatarNumero`, `formatarMedidor` → "12.345,6 km" / "1.200 h"). Nunca `toFixed` para exibir. Km e horas (horímetro) não se somam: ficam em colunas separadas.

Existem outras rotas (/veiculos, /manutencoes, /abastecimentos, /ocorrencias, /checklist, /postos, /mecanicos, /secretarias, /logs, /usuarios). Para os detalhes delas, consultar o código da API.

## Pendências para a API
- `registradoEm` de abastecimentos e ocorrências enviados pelo app chega 3 h atrasado (erro da API, será corrigido no back). O front NÃO compensa o fuso.
- Para um detalhe completo do diário, GET /diarios não devolve: motivo de uso, observação de fechamento, hora da assinatura (só vem no /verificar), veiculoId e tipo do medidor (o front pega o tipo pelo veículo do resumo mensal), e se o abastecimento foi no comboio. O modal mostra só o que a API já devolve.
