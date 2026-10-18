# Auditoria do front web (somente leitura)

## Objetivo
Entender como o projeto está estruturado, encontrar falhas e apontar melhorias possíveis. É uma análise: o resultado é um relatório no chat.

## Regras (obrigatórias)
- NÃO edite, crie, apague nem renomeie nenhum arquivo. Nem este arquivo, nem o CLAUDE.md.
- NÃO instale dependências nem rode comandos que gerem ou modifiquem arquivos (por exemplo ng build, npm install, npm audit fix).
- Pode usar comandos de leitura: listar pastas, buscar texto, git log, git status, git diff, npm outdated e npm audit (sem fix), ng version.
- NÃO chame a API nem altere dados.
- Nada de conselhos genéricos. Cada achado precisa ser baseado em algo que você viu no código, com o caminho e a linha (arquivo:linha). Se não encontrou algo, escreva "não encontrei". Separe o que é fato do que é hipótese.
- Se o projeto for grande demais para ler por inteiro, diga exatamente o que ficou de fora.

## O que ler
Leia TODAS as telas (componentes de página) e também: rotas, serviços, guards, interceptors, modelos e interfaces, componentes compartilhados, estilos, e os arquivos de configuração (package.json, angular.json, tsconfig, configuração do Tailwind e do DaisyUI, arquivos de environment). Leia em lotes e mantenha um inventário curto enquanto avança.

## O que avaliar
1. Estrutura: organização de pastas, separação entre telas, serviços e modelos, tamanho dos componentes, duplicação de código, código morto, uso de `any`, consistência de nomes, modo estrito do TypeScript.
2. Autenticação e dados: como o login funciona hoje, onde o token (se existir) é guardado, como as chamadas à API são feitas, se há URL fixa no código, tratamento de erros HTTP (401, 400, 500, servidor fora do ar), e o que precisaria mudar para enviar o token Bearer em todas as chamadas (interceptor, guard, tratamento do 401).
3. Segurança: uso de innerHTML ou bypassSecurityTrust, segredos no código, armazenamento do token, validações só no front, rotas sem proteção.
4. Interface: estados de carregamento, vazio e erro em cada tela, formulários e validações, feedback ao usuário, consistência dos textos e do visual (Tailwind e DaisyUI), responsividade, acessibilidade básica (rótulos, contraste, foco, teclado).
5. Desempenho: lazy loading de rotas, estratégia de detecção de mudanças, assinaturas (subscribe) sem cancelamento, listas sem trackBy, chamadas repetidas à API, tamanho do bundle e orçamentos no angular.json.
6. Dados e formatos: tratamento de datas (a API devolve horário UTC sem fuso), números, moeda e medidores.
7. Qualidade e manutenção: existência e utilidade de testes, scripts do package.json, dependências desatualizadas ou sem uso, vulnerabilidades conhecidas (npm audit), arquivos que não deveriam estar no repositório.
8. Aderência à API: compare as chamadas feitas pelo front com as rotas descritas no CLAUDE.md e avise o que não bate. Verifique também se a tela de diários já mostra o status "assinado" e se há algum uso do endpoint /diarios/{id}/verificar.

## Formato do relatório (responder no chat, em português)
1. Resumo executivo (5 a 8 linhas): estado geral do projeto, os 3 maiores riscos e as 3 melhores melhorias.
2. Mapa do projeto: árvore resumida das pastas e a lista de telas com o arquivo de cada uma.
3. Autenticação e fluxo de dados hoje.
4. Falhas encontradas, em tabela: severidade (Alta, Média ou Baixa), onde (arquivo:linha), problema, impacto e sugestão de correção.
5. Melhorias recomendadas, em tabela: melhoria, valor (Alto, Médio ou Baixo), esforço (P, M ou G) e arquivos envolvidos.
6. Pontos positivos que devem ser mantidos.
7. Plano sugerido: as 5 primeiras ações em ordem de prioridade, considerando que este é um sistema de TCC já em uso real e que a falta do token nas chamadas é uma lacuna de segurança conhecida.
8. Dúvidas e o que não deu para verificar.

Ao final, pergunte qual item eu quero que você implemente primeiro. Não implemente nada antes disso.