import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, switchMap } from 'rxjs';
import { CURRENT_API_URL } from './api-urls';

@Injectable({
  providedIn: 'root'
})
export class ItemTranscriptionService {
  private baseUrl = `${CURRENT_API_URL}/server/api`;

  constructor(private http: HttpClient) { }

  /**
   * Fetch the latest items from the search API
   * @param page Page number
   * @param size Number of items per page
   * @returns Observable with the search results
   */
  getLatestItems(page = 0, size = 10): Observable<any> {
    const url = `${this.baseUrl}/discover/search/objects?sort=lastModified,DESC&page=${page}&size=${size}&configuration=workspace&embed=thumbnail&embed=item%2Fthumbnail`;
    return this.http.get(url);
  }

  /**
   * Upload transcription for a specific item
   * @param itemUuid UUID of the item
   * @returns Observable with the transcription upload response
   */
  uploadTranscription(itemUuid: string): Observable<any> {
    const url = `${this.baseUrl}/transcription/upload/${itemUuid}`;
    return this.http.post(url, {});
  }

  /**
   * Get the latest item and upload its transcription
   * This method chains both API calls
   * @returns Observable with the transcription upload response
   */
  getLatestItemAndUploadTranscription(): Observable<any> {
    return this.getLatestItems().pipe(
      map(response => {
        if (response?._embedded?.searchResult?._embedded?.objects?.length > 0) {
          const firstItem = response._embedded.searchResult._embedded.objects[0];
          const itemUuid = firstItem._embedded.indexableObject.uuid;
          return itemUuid;
        }
        throw new Error('No items found');
      }),
      switchMap(itemUuid => this.uploadTranscription(itemUuid))
    );
  }
}