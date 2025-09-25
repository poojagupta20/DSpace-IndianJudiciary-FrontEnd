import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CURRENT_API_URL } from './api-urls';

@Injectable({
  providedIn: 'root'
})
export class CombinedSearchService {
  private readonly baseUrl = `${CURRENT_API_URL}/server/api/discover/search/objects`;

  constructor(private http: HttpClient) {}

  searchCombined(
petitioner: string, respondent: string, page: number = 0, size: number = 10, sortBy: string = 'dc.title', sortOrder: string = 'ASC', resultsPerPage: number  ): Observable<any> {
    const encodedSort = encodeURIComponent(`${sortBy},${sortOrder}`);
    let url = `${this.baseUrl}?sort=${encodedSort}&page=${page}&size=${size}`;

    if (petitioner) {
      const encodedPetitioner = encodeURIComponent(petitioner);
      url += `&f.dc_party_firstpetitioner=${encodedPetitioner},equals`;
    }

    if (respondent) {
      const encodedRespondent = encodeURIComponent(respondent);
      url += `&f.dc_party_firstrespondent=${encodedRespondent},equals`;
    }

    console.log('Combined Search URL:', url);
    return this.http.get<any>(url);
  }
}
