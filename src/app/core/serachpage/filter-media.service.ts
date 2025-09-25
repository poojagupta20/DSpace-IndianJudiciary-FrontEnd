import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CURRENT_API_URL } from './api-urls';

@Injectable({
  providedIn: 'root'
})
export class FilterMediaService {
  private apiUrl = `${CURRENT_API_URL}/server/api/filter-media`;

  constructor(private http: HttpClient) {}

  /**
   * Trigger the filter media API call and treat the response as plain text
   */
  triggerFilterMedia(): Observable<string> {
    return this.http.get(this.apiUrl, { responseType: 'text' });
  }
}
