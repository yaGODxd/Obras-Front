import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { LogResponse } from '../interfaces/log';
import { montarParams } from '../shared/utils/params';

@Injectable({
  providedIn: 'root'
})
export class LogService {

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  listarLogs(login?: string, acao?: string, inicio?: string, fim?: string): Observable<LogResponse[]> {
    const params = montarParams({ login, acao, inicio, fim });
    return this.http.get<LogResponse[]>(`${this.apiUrl}/logs`, { params });
  }
}
