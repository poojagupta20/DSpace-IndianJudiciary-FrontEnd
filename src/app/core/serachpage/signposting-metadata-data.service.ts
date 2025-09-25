// src/app/core/data/signposting-data.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CURRENT_API_URL } from './api-urls';

@Injectable({
  providedIn: 'root'
})
export class SignpostingDataService1 {
  private apiBase = `${CURRENT_API_URL}/server/api/core/items`;

  constructor(private http: HttpClient) {}

  getItemByUuid(uuid: string): Observable<any> {
    return this.http.get(`${this.apiBase}/${uuid}?projection=full`);
  }
}
