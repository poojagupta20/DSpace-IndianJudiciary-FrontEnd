import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CURRENT_API_URL } from '../core/serachpage/api-urls';

@Injectable({
  providedIn: 'root',
})
export class AdminPoolService {
  constructor(private http: HttpClient) {}

  fetchBatches(status: string): Observable<any[]> {
    return this.http.get<any[]>(`${CURRENT_API_URL}/server/api/bulk-upload/status/${status}`);
  }

  getBatchFiles(batchId: string): Observable<any> {
    return this.http.get<any>(`${CURRENT_API_URL}/server/api/bulk-upload/${batchId}`);
  }

  approve(uuid: string, collectionUuid: string): Observable<any> {
    const zipFilename = `${uuid}.zip`;

    const properties = [
      { name: '--add' },
      { name: '--zip', value: zipFilename },
      { name: '--collection', value: collectionUuid }
    ];
  
    const body = new URLSearchParams();

    body.set('properties', JSON.stringify(properties));
    console.log(body.toString());

    console.log(collectionUuid);
    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    });
  
    return this.http.post(
      `${CURRENT_API_URL}/server/api/bulk-upload/approve/${uuid}`,
      body.toString(),
      { headers }
    );
  }
  
  reject(uuid: string): Observable<any> {
    return this.http.post(`${CURRENT_API_URL}/server/api/bulk-upload/reject/${uuid}`, {});
  }

  getPooledTasks(): Observable<any[]> {
    return this.http.get<any[]>(`${CURRENT_API_URL}/server/api/bulk-upload/pooled`);
  }

  getAcceptedSubmissions(): Observable<any[]> {
    return this.http.get<any[]>(`${CURRENT_API_URL}/server/api/bulk-upload/status/APPROVED`);
  }

  getRejectedSubmissions(): Observable<any[]> {
    return this.http.get<any[]>(`${CURRENT_API_URL}/server/api/bulk-upload/status/REJECTED`);
  }
  
  
} 