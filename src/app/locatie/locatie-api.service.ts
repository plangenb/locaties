import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { LOCATIE_API_URL } from './locatie-api.config';
import { LocatieModel, LocatieSearchParams } from './locatie.model';

@Injectable({ providedIn: 'root' })
export class LocatieApiService {
  private readonly http = inject(HttpClient);
  private readonly url = inject(LOCATIE_API_URL);

  search(params: LocatieSearchParams): Observable<LocatieModel[]> {
    let httpParams = new HttpParams().set('key', params.key);

    if (params.types.length > 0) {
      httpParams = httpParams.set('types', params.types.join(','));
    }
    if (params.query) {
      httpParams = httpParams.set('query', params.query);
    }
    if (params.maxresult !== undefined) {
      httpParams = httpParams.set('maxresult', params.maxresult);
    }

    return this.http.get<LocatieModel[]>(this.url, { params: httpParams });
  }
}
