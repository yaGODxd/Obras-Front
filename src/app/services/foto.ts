import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { FotoDiario, UsoFotos } from '../interfaces/foto';

@Injectable({
  providedIn: 'root'
})
export class FotoService {

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  listarFotosDoDiario(diarioId: string): Observable<FotoDiario[]> {
    return this.http.get<FotoDiario[]>(`${this.apiUrl}/diarios/${diarioId}/fotos`);
  }

  // A imagem precisa do token, e <img src> não manda token: vem pelo HttpClient como blob.
  // Para mostrar, use o FotosCache (cria e libera a URL do blob).
  baixarFoto(id: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/fotos/${id}`, { responseType: 'blob' });
  }

  // Só gestor: quantas fotos e quanto espaço usam no banco (o espaço do banco é limitado).
  usoFotos(): Observable<UsoFotos> {
    return this.http.get<UsoFotos>(`${this.apiUrl}/fotos/uso`);
  }
}
