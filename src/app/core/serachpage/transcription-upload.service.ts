import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, timer } from 'rxjs';
import { catchError, map, retryWhen, take, concatMap } from 'rxjs/operators';
import { CURRENT_API_URL } from './api-urls';

export interface TranscriptionUploadResponse {
  success: boolean;
  message?: string;
  data?: any;
}

@Injectable({
  providedIn: 'root'
})
export class TranscriptionUploadService {
  
  private readonly baseUrl = `${CURRENT_API_URL}/server/api/transcription/upload`;
  
  constructor(private http: HttpClient) {}

  /**
   * Upload transcription for a specific item
   * @param itemUuid - The UUID of the created item
   * @param additionalData - Optional additional data to send with the request
   * @returns Observable<TranscriptionUploadResponse>
   */
  uploadTranscription(itemUuid: string, additionalData?: any): Observable<TranscriptionUploadResponse> {
    if (!itemUuid) {
      return throwError(() => new Error('Item UUID is required'));
    }

    const url = `${this.baseUrl}/${itemUuid}`;
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      // Add any additional headers if needed (e.g., authorization)
      // 'Authorization': `Bearer ${token}`
    });

    const body = additionalData || {};

    console.log(`Making transcription upload request to ${url}`);
    
    return this.http.post<any>(url, body, { headers }).pipe(
      map((response) => ({
        success: true,
        data: response,
        message: 'Transcription upload initiated successfully'
      })),
      catchError((error) => {
        console.error('Transcription upload failed:', error);
        return throwError(() => ({
          success: false,
          message: error.error?.message || 'Failed to upload transcription',
          error: error
        }));
      })
    );
  }

  /**
   * Upload transcription with exponential backoff retry
   * @param itemUuid - The UUID of the created item
   * @param maxRetries - Maximum number of retry attempts (default: 3)
   * @param baseDelay - Base delay for exponential backoff in milliseconds (default: 1000)
   * @param additionalData - Optional additional data to send with the request
   * @returns Observable<TranscriptionUploadResponse>
   */
  uploadTranscriptionWithExponentialBackoff(
    itemUuid: string, 
    maxRetries: number = 3, 
    baseDelay: number = 1000,
    additionalData?: any
  ): Observable<TranscriptionUploadResponse> {
    return this.uploadTranscription(itemUuid, additionalData).pipe(
      retryWhen(errors => 
        errors.pipe(
          take(maxRetries),
          concatMap((error, index) => {
            if (index < maxRetries - 1) {
              const delay = baseDelay * Math.pow(2, index); // Exponential backoff
              console.warn(`Transcription upload attempt ${index + 1} failed, retrying in ${delay}ms...`);
              return timer(delay);
            }
            return throwError(() => error);
          })
        )
      )
    );
  }
}