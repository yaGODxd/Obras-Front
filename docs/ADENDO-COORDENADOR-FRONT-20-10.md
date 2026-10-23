# Adendo do coordenador para o front (20/10/2026)

A API ganhou muita coisa nas Partes 6B, 7, 8 e 9, e o app Android já foi adaptado. Falta o front web acompanhar. Esta é a lista do que o front precisa tratar, em ordem de prioridade.

## Regra de trabalho
1. PRIMEIRO só relatório e plano. Não codifique ainda. Compare esta lista com o que já existe no front e me diga, item por item: "já existe", "falta" ou "existe parcial". Depois proponha o plano em partes pequenas (uma parte por vez, relatório e parar, como sempre) e junte com as Partes 6, 7 e 8 do plano que você já tem, dizendo a ordem que sugere.
2. Edição manual (eu aprovo cada alteração), sem commit, sem biblioteca nova sem pedir, e NÃO mude a paleta nem o tema (o Yago ainda vai escolher entre A Petróleo, B Musgo e C Grafite).
3. Se algo desta lista contradisser o que você vê na API ou no código, diga em vez de adivinhar. O Swagger da API está em https://sistema-obras-api.onrender.com/swagger-ui.html (quando SWAGGER_ENABLED=true).

## A. Datas (prioridade máxima; trava o ajuste da API)
- Hoje a API manda as datas em UTC SEM sufixo (ex.: `2026-10-20T14:00:00`). Todas as colunas de data do banco guardam UTC.
- A API tem uma chave (`APP_DATAS_COM_FUSO`) que, ligada, manda as datas com `Z` no fim. Ela fica DESLIGADA até você confirmar que o front entende os dois formatos.
- O front precisa de uma função única para ler data da API: sem fuso (nem Z nem deslocamento) = UTC; com Z ou deslocamento = o que vier. E mostrar no fuso do navegador (Brasília). Cuidado: `new Date("2026-10-20T14:00:00")` sem Z o navegador lê como hora LOCAL, e isso erra 3 h.
- Aplicar em TODAS as telas e pipes: diários, abastecimentos, ocorrências, manutenções, logs, dashboard, mapa/rastreamento, relatórios, exportações.
- Conferir também o que o front ENVIA nos filtros de data (início e fim de período): a API trata o corte de dia e de mês pelo horário de Brasília. Me diga como os filtros são enviados hoje.

## B. Token e erros
- Todo pedido à API deve levar `Authorization: Bearer <token>` (interceptor). Conferir se existe pedido que escapa do interceptor (fetch direto, download, imagem).
- 401 = sessão expirada (o token dura 24 h): voltar ao Login com mensagem; 403 = sem permissão: mostrar a mensagem.
- Toda resposta de erro é `{"erro": "mensagem", "codigo": "CODIGO"}` (o `codigo` só aparece em alguns). Mostrar o `erro` ao usuário.
- A API só começa a EXIGIR o token (`APP_SEGURANCA_EXIGIR_JWT=true`) quando o front e o app mandarem token em tudo. Me avise quando estiver pronto.
- Perfis: o usuário do web é gestor. Rotas de gravação do motorista (abrir diário, abastecimento, etc.) são só do motorista e o web não deve chamá-las.

## C. Ocorrência com status
- Valores: `pendente`, `em_andamento`, `resolvida` (campo `status` e `resolvidaEm` nas respostas de ocorrência).
- Mostrar o status com selo (Pendente, Em andamento, Resolvida), filtro por status na lista e no detalhe do diário.
- O gestor pode mudar o status à mão: `PUT /ocorrencias/{id}/status`. O status também muda sozinho: ao criar uma manutenção ligada à ocorrência ela vai para `em_andamento`, e quando todas as manutenções ligadas terminam ela vai para `resolvida`.
- Em "Nova manutenção" permitir escolher a ocorrência (campo `ocorrenciaId` em `POST /manutencoes`).

## D. Horário suspeito (aviso, nada é bloqueado)
- Registros feitos offline chegam com a hora do celular. A API devolve, nas respostas de abastecimento e ocorrência: `horarioSuspeito` (true/false), `motivoSuspeita`, `recebidoEm` e `idLocal`. Motivos possíveis: HORARIO_FUTURO, HORARIO_ANTIGO, DESVIO_RELOGIO, FORA_DA_JANELA_DIARIO, FORA_DA_JANELA_TURNO, COMBOIO_SEM_DIARIO.
- Mostrar um marcador discreto com a explicação (ex.: "horário do celular fora do esperado") e permitir filtrar. Pode ficar para uma parte depois, mas leia os campos no modelo desde já (com valor padrão, para respostas antigas continuarem funcionando).

## E. Fotos (Parte 9 da API)
- `GET /diarios/{id}/fotos`: só os dados das fotos do diário (id, tipo, tiradaEm, tamanhoBytes, vínculo com abastecimento ou ocorrência, horarioSuspeito). NUNCA traz a imagem.
- `GET /fotos/{id}`: a imagem. Precisa do token, e `<img src>` NÃO manda o token. Então: buscar com HttpClient (`responseType: 'blob'`), criar a URL com `URL.createObjectURL(blob)`, usar no `<img>` e liberar com `URL.revokeObjectURL` ao sair da tela.
- Tipos: `medidor_abertura`, `medidor_fechamento`, `ocorrencia`, `livre`, `cupom_fiscal`, `bomba_comboio`.
- Mostrar as fotos no detalhe do diário (miniaturas carregadas só quando visíveis ou ao abrir a seção, nunca todas de uma vez) e ampliar ao clicar. Foto do abastecimento ao lado do abastecimento; foto da ocorrência na ocorrência.
- A resposta traz `ETag` e `Cache-Control` de 1 dia: o navegador não baixa de novo.
- `GET /fotos/uso` (só gestor): quantidade de fotos e MB usados no banco. Sugestão: um cartão pequeno em uma tela de administração, porque o espaço do banco é limitado.
- Ainda NÃO há foto no banco: o app está sendo adaptado. Pode desenvolver com a lista vazia.

## F. Ajustes pendentes da lista anterior (confirme o que já foi feito)
- Selos (StatusBadge) com texto vazando e modal de detalhes do diário ao clicar na linha (prompt entregue em 18/10).
- Editar peça de manutenção: `PUT /manutencoes/pecas/{pecaId}`.
- Reativar veículo: `PUT /veiculos/{id}/ativo`.
- Placa: a API normaliza (maiúscula, sem hífen e sem espaço) e devolve `PLACA_EM_USO` ou `PLACA_DE_VEICULO_INATIVO` (409) quando a placa já existe. Placa em branco vira "sem placa". Criar um utilitário de placa no front para mostrar e validar do mesmo jeito.
- Se o front tem algum campo livre de "motivo de uso": a lista de motivos agora está em `GET /motivos-uso` (id e descrição); o diário aceita `motivoUsoId`.

## G. O que NÃO fazer agora
- Não ligar nem pedir para ligar as chaves da API (`APP_DATAS_COM_FUSO`, `APP_SEGURANCA_EXIGIR_JWT`) sem eu confirmar.
- Não mudar paleta, tema ou bibliotecas.

## O que devolver
Relatório de situação item a item, plano em partes (com a ordem sugerida, juntando com as Partes 6, 7 e 8), riscos e o que NÃO vai fazer. Depois pare e espere.