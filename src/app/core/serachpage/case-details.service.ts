import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { CURRENT_API_URL } from './api-urls';

@Injectable({
  providedIn: 'root',
})
export class CaseDetailsService {
  private readonly baseUrl = `${CURRENT_API_URL}/server/api/core/items`;

  constructor(private http: HttpClient) {}

  /**
   * Fetch metadata of the item by UUID
   */
  getItemDetails(uuid: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${uuid}`);
  }

  /**
   * Fetch all bitstreams from the ORIGINAL bundle of the item
   */
  getBitstreams(uuid: string): Observable<any[]> {
    const bundlesUrl = `${this.baseUrl}/${uuid}/bundles`;
    return this.http.get<any>(bundlesUrl).pipe(
      switchMap((bundles: any) => {
        const originalBundle = bundles._embedded?.bundles?.find(
          (b: any) => b.name === 'ORIGINAL'
        );

        if (originalBundle) {
          const bitstreamsUrl = originalBundle._links?.bitstreams?.href;
          return this.http.get<any>(bitstreamsUrl).pipe(
            map(res => res._embedded?.bitstreams || []),
            catchError(() => of([]))  // fallback to empty array
          );
        } else {
          return of([]); // No ORIGINAL bundle
        }
      }),
      catchError(() => of([]))  // fallback on error
    );
  }

  /**
   * Fetch metadata and attachments in parallel using forkJoin
   */
  getCaseDataWithAttachments(uuid: string): Observable<{ metadata: any, attachments: any[] }> {
    return forkJoin({
      metadata: this.getItemDetails(uuid),
      attachments: this.getBitstreams(uuid)
    });
  }
}
