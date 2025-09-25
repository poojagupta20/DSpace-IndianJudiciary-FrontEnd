import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { CURRENT_API_URL } from './api-urls';

@Injectable({
  providedIn: 'root'
})
export class PdfService {
  constructor(private http: HttpClient) {}

  /**
   * Fetches a restricted PDF from the server API
   * @param bitstreamUuid The UUID of the bitstream to fetch
   * @returns An Observable of the PDF blob
   */
  fetchRestrictedPdf(bitstreamUuid: string): Observable<Blob> {
    const url = `${CURRENT_API_URL}/server/api/custom/bitstreams/${bitstreamUuid}/filtered-content`;
    
    return this.http.get(url, { 
      responseType: 'blob', 
      withCredentials: true 
    }).pipe(
      retry(2), // Retry failed requests up to 2 times
      catchError(error => {
        console.error('Error fetching PDF:', error);
        return throwError(() => new Error('Failed to fetch PDF. Please try again later.'));
      })
    );
  }

  /**
   * Creates a blob URL from a blob object
   * @param blob The blob to create a URL for
   * @returns The created blob URL
   */
  createBlobUrl(blob: Blob): string {
    return URL.createObjectURL(blob);
  }

  /**
   * Revokes a blob URL to free up memory
   * @param url The blob URL to revoke
   */
  revokeBlobUrl(url: string): void {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }
}