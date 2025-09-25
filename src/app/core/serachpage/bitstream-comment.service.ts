import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CURRENT_API_URL } from './api-urls';

export interface BitstreamComment {
  id?: number;
  bitstreamId: string;
  comment?: string; // request field
  text?: string;    // response field
}



@Injectable({ providedIn: 'root' })
export class BitstreamCommentService {
  private baseUrl = `${CURRENT_API_URL}/server/api/bitstream/comment`;

  constructor(private http: HttpClient) {}

  getComments(bitstreamId: string): Observable<BitstreamComment[]> {
    return this.http.get<BitstreamComment[]>(`${this.baseUrl}/bitstream/${bitstreamId}`, {
      withCredentials: true
    });
  }

  addComment(comment: BitstreamComment): Observable<BitstreamComment> {
    return this.http.post<BitstreamComment>(this.baseUrl, comment, {
      withCredentials: true
    });
  }

  updateComment(id: number, newText: string): Observable<BitstreamComment> {
    const headers = new HttpHeaders({ 'Content-Type': 'text/plain' });
    return this.http.put<BitstreamComment>(`${this.baseUrl}/${id}`, newText, {
      headers,
      withCredentials: true
    });
  }

  deleteComment(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`, {
      withCredentials: true
    });
  }
}
