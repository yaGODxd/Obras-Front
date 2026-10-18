# SGFE: front web (Angular)

Painel web do Sistema de Gestão de Frota e Equipamentos (TCC, Unespar, Secretaria de Obras de Cruz Machado-PR), usado por gestores. Stack: Angular 19, Tailwind v4 e DaisyUI. Textos da interface em português do Brasil.

API (repositório separado): github.com/yaGODxd/sistema-obras-api
Base URL: https://sistema-obras-api.onrender.com/ (servidor Render free: a primeira chamada pode levar cerca de 1 minuto).

## Como trabalhar
- Antes de criar ou alterar telas, ler 2 ou 3 telas existentes e os arquivos de estilo e tema, e seguir o padrão já usado. Não adicionar bibliotecas sem avisar.
- A paleta nova do front ainda está em decisão: não mudar cores globais nem o tema sem eu pedir.
- Uma tarefa por vez, com mudanças pequenas. Depois de editar, rodar o build (ng build) e corrigir os erros.
- Não fazer commit nem push sem eu pedir.
- No final, listar os arquivos criados e alterados.

## Autenticação
- POST /auth/login {login, senha} -> {token, nome, perfil}. O perfil é "gestor" ou "motorista". 401 se login/senha errados ou usuário inativo.
- Rotas [TOKEN] exigem `Authorization: Bearer <token>` e devolvem 401 sem ele. O token vale 24 h por padrão.
- Hoje a maioria das rotas ainda está aberta, mas a API passará a exigir o token em todas. O front AINDA NÃO envia o token. A implementação precisa de: guardar o token no login, um interceptor HTTP que adicione o Bearer em todas as chamadas, tratar o 401 voltando ao login e um guard nas rotas.
- [TOKEN] GET /auth/me -> {login, perfil}

## Diários e assinatura
Ciclo do diário: aberto, fechado (pendente de assinatura) e assinado. O motorista assina no app com um PIN pessoal. Depois de assinado, o diário não é mais editado.
- GET /diarios?veiculoId=&mes=&ano= -> lista com id, veiculoDescricao, veiculoPlaca, motoristaNome, medidorInicial, medidorFinal, medidorPercorrido, destino, status, abertoEm, fechadoEm. O status pode ser "aberto", "fechado" ou "assinado".
- [TOKEN] GET /diarios/{id}/verificar -> {assinado, integro, assinadoEm, mensagem}. O gestor pode verificar qualquer diário. "integro: false" indica que o conteúdo mudou depois da assinatura.

Existem outras rotas (/veiculos, /manutencoes, /abastecimentos, /ocorrencias, /checklist, /postos, /mecanicos, /secretarias, /logs, /usuarios). Para os detalhes delas, consultar o código da API.