import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ChecklistItemRequest, ChecklistItemResponse, ChecklistRespostaResponse, ChecklistTemplateResponse
} from '../interfaces/checklist';

@Injectable({
  providedIn: 'root'
})
export class ChecklistService {

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  listarTemplates(): Observable<ChecklistTemplateResponse[]> {
    return this.http.get<ChecklistTemplateResponse[]>(`${this.apiUrl}/checklist/templates`);
  }

  adicionarItemChecklist(request: ChecklistItemRequest): Observable<ChecklistItemResponse> {
    return this.http.post<ChecklistItemResponse>(`${this.apiUrl}/checklist/itens`, request);
  }

  alterarAtivoItemChecklist(id: string, ativo: boolean): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/checklist/itens/${id}/ativo`, { ativo });
  }

  buscarRespostasChecklist(diarioId: string): Observable<ChecklistRespostaResponse[]> {
    return this.http.get<ChecklistRespostaResponse[]>(`${this.apiUrl}/checklist/respostas/diario/${diarioId}`);
  }
}
