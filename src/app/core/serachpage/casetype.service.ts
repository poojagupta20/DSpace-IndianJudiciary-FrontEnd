// src/app/core/facets/facets.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CURRENT_API_URL } from './api-urls';

@Injectable({
  providedIn: 'root'
})
export class FacetsService {
  private baseUrl = `${CURRENT_API_URL}/server/api/discover/facets`;

  constructor(private http: HttpClient) {}

  getCaseTypeFacets(): Observable<any> {
    return this.http.get(`${this.baseUrl}/dc_case_type?size=1000`);
  }
}