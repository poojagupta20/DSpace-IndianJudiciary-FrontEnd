import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CURRENT_API_URL } from './api-urls';

@Injectable({
  providedIn: 'root'
})
export class JudgementDateService {
  private baseUrl = `${CURRENT_API_URL}/server/api/discover/search/objects`;

  constructor(private http: HttpClient) {}

  getDateSearchResults(
    startDate?: string,  // YYYY-MM-DD
    endDate?: string,    // YYYY-MM-DD
    sortBy: string = 'dc.title',
    sortOrder: string = 'ASC',
    resultsPerPage: number = 10
  ): Observable<any> {
  
    let params = new HttpParams()
      .set('sort', `${sortBy},${sortOrder}`)
      .set('size', resultsPerPage.toString());
  
    if (startDate && endDate) {
      const start = `${startDate}T00:00:00Z`;
      const end = `${endDate}T00:00:00Z`;
      const range = `[${start} TO ${end}]`;
      params = params.set('f.dateIssued', `${range},equals`);
    }
  
    return this.http.get<any>(this.baseUrl, { params });
  }
  
}
