export interface ChecklistTemplateResponse {
  id: string;
  nome: string;
  ativo: boolean;
  itens: ChecklistItemResponse[];
}

export interface ChecklistItemResponse {
  id: string;
  templateId: string;
  descricao: string;
  obrigatorio: boolean;
  ordem: number;
  ativo: boolean;
}

export interface ChecklistItemRequest {
  templateId: string;
  descricao: string;
  obrigatorio: boolean;
  ordem: number;
}

export interface ChecklistRespostaResponse {
  id: string;
  itemId: string;
  descricao: string;
  obrigatorio: boolean;
  ok: boolean;
  observacao: string | null;
  registradoEm: string | null;
}
