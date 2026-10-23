import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { map } from 'rxjs';
import { environment } from '../../environments/environment';
import { normalizarDatasApi } from '../shared/utils/datas';

// Corrige as datas das respostas JSON da API (regra e suposição em shared/utils/datas.ts).
export const datasInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl) || req.responseType !== 'json') {
    return next(req);
  }
  return next(req).pipe(
    map(evento => evento instanceof HttpResponse
      ? evento.clone({ body: normalizarDatasApi(evento.body) })
      : evento)
  );
};
