import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CURRENT_API_URL } from './api-urls';

@Injectable({
  providedIn: 'root'
})
export class PetitionerRespondentSearchService {
  // private baseUrl = 'http://10.184.240.87:8080/server/api/discover/browses/dc_party_firstrespondent/entries';

  constructor(private http: HttpClient) {}

  searchPetitioners(query: string, page: number = 0, size: number = 20): Observable<any> {
    const url = `${CURRENT_API_URL}/server/api/discover/browses/dc_party_firstpetitioner/entries?sort=default,ASC&page=${page}&size=${size}&startsWith=${query}`;
    return this.http.get<any>(url);
  }
  
  searchRespondents(query: string, page: number = 0, size: number = 20): Observable<any> {
    const url = `${CURRENT_API_URL}/server/api/discover/browses/dc_party_firstrespondent/entries?sort=default,ASC&page=${page}&size=${size}&startsWith=${query}`;
    return this.http.get<any>(url);
  }

  searchCombined(
petitioner: string, respondent: string, page: number = 0, size: number = 10, sortBy: string = 'dc.title', sortOrder: string = 'ASC', resultsPerPage: number  ): Observable<any> {
    const encodedSort = encodeURIComponent(`${sortBy},${sortOrder}`);
    let url = `${CURRENT_API_URL}/server/api/discover/search/objects?sort=${encodedSort}&page=${page}&size=${size}`;
  
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
