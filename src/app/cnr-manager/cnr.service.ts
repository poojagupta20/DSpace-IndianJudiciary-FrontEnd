// import { Injectable } from '@angular/core';
// import { HttpClient, HttpParams } from '@angular/common/http';
// import { Observable } from 'rxjs';
// import { CURRENT_API_URL } from 'src/app/core/serachpage/api-urls';

// export interface FileRecord {
//   fileName: string;
//   hashValue: string;
//   createdAt: string;
//   ackId?: string;
//   cino: string; // Add the cino property
//   selected: boolean; // For tracking selection
//   posted: boolean; // For tracking post status
//   itemUUID: string; // Add the itemUUID property
//   status?: 'idle' | 'submitting' | 'submitted' | 'error';
//   checkStatusState?: 'idle' | 'checking' | 'checked' | 'error';
//   userFriendlyPostResponse?: string;
//   userFriendlyCheckResponse?: string;
//   postResponse?: string; // Add this here
// }

// export interface SearchResult {
//   id: string;
//   uuid: string;
//   name: string;
//   handle: string;
//   metadata: any;
// }

// @Injectable({ providedIn: 'root' })
// export class CnrService {
//   private baseUrl = `${CURRENT_API_URL}/server/api`;

//   constructor(private http: HttpClient) { }

//   generate(itemUUID: string): Observable<any> {
//     return this.http.post<any>(`${this.baseUrl}/export/zip/${itemUUID}`, {});
//   }

//   getRecords(
//     page: number = 0,
//     size: number = 10,
//     submitted?: 'submit' | 'notSubmitted',
//     sortBy: string = 'createdAt',
//     sortDir: 'asc' | 'desc' = 'desc'
//   ): Observable<any> {
//     let params = new HttpParams()
//       .set('page', page.toString())
//       .set('size', size.toString())
//       .set('sortBy', sortBy)
//       .set('sortDir', sortDir);

//     if (submitted) {
//       params = params.set('submitted', submitted);
//     }

//     return this.http.get<any>(`${this.baseUrl}/cnr/records`, { params });
//   }


//   submitCase(cnr: string): Observable<any> {
//     const params = new HttpParams()
//       .set('cnr', cnr);
//     return this.http.post(`${this.baseUrl}/jtdr/submit`, null, { params });
//   }

//   checkStatus(ackId: string): Observable<any> {
//     return this.http.get(`${this.baseUrl}/jtdr/status/${ackId}`);
//   }

//   getSearchResults(query: string): Observable<any> {
//     const params = new HttpParams().set('query', query);
//     return this.http.get<any>(`${this.baseUrl}/discover/search/objects`, { params });
//   }
//   // In CnrService
//   getReportCsv(start: string, end: string): Observable<Blob> {
//     const params = new HttpParams().set('start', start).set('end', end);
//     return this.http.get(`${this.baseUrl}/jtdr/report`, {
//       params,
//       responseType: 'blob',
//       headers: { Accept: 'text/csv' }   // ask for CSV
//     });
//   }


// }


import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CURRENT_API_URL } from 'src/app/core/serachpage/api-urls';

export interface FileRecord {
  fileName: string;
  hashValue: string;
  createdAt: string;
  ackId?: string;
  cino: string;               // CINO
  selected: boolean;          // selection flag
  posted: boolean;            // posted flag
  itemUUID: string;           // item UUID
  status?: 'idle' | 'submitting' | 'submitted' | 'error';
  checkStatusState?: 'idle' | 'checking' | 'checked' | 'error';
  userFriendlyPostResponse?: string;
  userFriendlyCheckResponse?: string;
  postResponse?: string;
}

export interface SearchResult {
  id: string;
  uuid: string;
  name: string;
  handle: string;
  metadata: any;
}

@Injectable({ providedIn: 'root' })
export class CnrService {
  private baseUrl = `${CURRENT_API_URL}/server/api`;

  constructor(private http: HttpClient) {}

  /** Generate a zip for an item UUID */
  generate(itemUUID: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/export/zip/${encodeURIComponent(itemUUID)}`, {});
  }

  /** Paginated generated-records list */
  getRecords(
    page: number = 0,
    size: number = 10,
    submitted?: 'submit' | 'notSubmitted',
    sortBy: string = 'createdAt',
    sortDir: 'asc' | 'desc' = 'desc'
  ): Observable<any> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('size', String(size))
      .set('sortBy', sortBy)
      .set('sortDir', sortDir);

    if (submitted) {
      params = params.set('submitted', submitted);
    }

    return this.http.get<any>(`${this.baseUrl}/cnr/records`, { params });
  }

  /** Post (submit) a case by CNR */
  submitCase(cnr: string): Observable<any> {
    const params = new HttpParams().set('cnr', cnr);
    return this.http.post(`${this.baseUrl}/jtdr/submit`, null, { params });
  }

  /** Check JTDR status using ackId */
  checkStatus(ackId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/jtdr/status/${encodeURIComponent(ackId)}`);
  }

  /** Search (CINO or generic query) */
  getSearchResults(query: string): Observable<any> {
    const params = new HttpParams().set('query', query);
    return this.http.get<any>(`${this.baseUrl}/discover/search/objects`, { params });
  }

  /** Download report as CSV (already in your file) */
  getReportCsv(start: string, end: string): Observable<Blob> {
    const params = new HttpParams().set('start', start).set('end', end);
    return this.http.get(`${this.baseUrl}/jtdr/report`, {
      params,
      responseType: 'blob',
      headers: { Accept: 'text/csv' }
    });
  }

  /** NEW: Download report as PDF (component calls this) */
  getReportPdf(start: string, end: string): Observable<Blob> {
    const params = new HttpParams().set('start', start).set('end', end);
    return this.http.get(`${this.baseUrl}/jtdr/report`, {
      params,
      responseType: 'blob',
      headers: { Accept: 'application/pdf' }
    });
  }

  /** NEW: Delete a generated zip by its fileName shown in the list (component calls this) */
  deleteGenerated(fileName: string): Observable<void> {
    // If your backend expects query param instead, switch to the commented version below.
    return this.http.delete<void>(`${this.baseUrl}/export/zip/${encodeURIComponent(fileName)}`);
    // const params = new HttpParams().set('fileName', fileName);
    // return this.http.delete<void>(`${this.baseUrl}/export/zip`, { params });
  }
}
