import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CURRENT_API_URL } from './api-urls';

@Injectable({
  providedIn: 'root'
})
export class SearchPageService {
  private baseUrl = `${CURRENT_API_URL}/server/api/discover/search/objects`;

  constructor(private http: HttpClient) {}

  getSearchResults(
    caseNumber?: string, 
    caseType?: string, 
    caseYear?: string, 
    sortBy: string = 'dc.title', 
    sortOrder: string = 'ASC', 
    resultsPerPage: number = 10
    
  ): Observable<any> {
    
    let params = new HttpParams()
      .set('sort', `${sortBy},${sortOrder}`)
      .set('size', resultsPerPage.toString());

    if (caseNumber) {
      params = params.set('f.title', `${caseNumber},equals`);
    }
    if (caseType) {
      params = params.set('f.dc_case_type', `${caseType},equals`);
    }
    if (caseYear) {
      params = params.set('f.dc_case_year', `${caseYear},equals`);
    }

    return this.http.get<any>(this.baseUrl, { params });
  }

  getSearchResultsWithFilters(params: any): Observable<any> {
    let httpParams: HttpParams;
    if (params instanceof HttpParams) {
      httpParams = params;
    } else {
      httpParams = new HttpParams();
      Object.keys(params).forEach(key => {
        httpParams = httpParams.append(key, params[key]);
      });
    }
    return this.http.get<any>(this.baseUrl, { params: httpParams });
  }
}
