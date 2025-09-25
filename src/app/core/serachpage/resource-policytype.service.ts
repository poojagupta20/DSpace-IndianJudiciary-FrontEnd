// resource-policy-entity.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface PolicyEntity {
  type: 'eperson' | 'group';
  uuid: string;
}

@Injectable({
  providedIn: 'root'
})
export class ResourcePolicyEntityService {
  private baseUrl = environment.rest.baseUrl;

  constructor(private http: HttpClient) {}

  /**
   * Get the eperson associated with a resource policy
   * 
   * @param policyId The ID of the resource policy
   * @returns Observable with the eperson data or null if not found
   */
  getEperson(policyId: string): Observable<any> {
    const url = `${this.baseUrl}/api/authz/resourcepolicies/${policyId}/eperson`;
    
    return this.http.get(url).pipe(
      catchError(() => {
        console.log(`No eperson found for policy ${policyId}`);
        return of(null);
      })
    );
  }

  /**
   * Get the group associated with a resource policy
   * 
   * @param policyId The ID of the resource policy
   * @returns Observable with the group data or null if not found
   */
  getGroup(policyId: string): Observable<any> {
    const url = `${this.baseUrl}/api/authz/resourcepolicies/${policyId}/group`;
    
    return this.http.get(url).pipe(
      catchError(() => {
        console.log(`No group found for policy ${policyId}`);
        return of(null);
      })
    );
  }

  /**
   * Determine the entity type (eperson or group) and UUID for a resource policy
   * 
   * @param policyId The ID of the resource policy
   * @returns Observable with the entity type and UUID
   */
  determineEntityType(policyId: string): Observable<PolicyEntity> {
    return forkJoin({
      eperson: this.getEperson(policyId),
      group: this.getGroup(policyId)
    }).pipe(
      map(result => {
        if (result.eperson && result.eperson.uuid) {
          console.log(`Policy ${policyId} is associated with eperson ${result.eperson.uuid}`);
          return {
            type: 'eperson' as const,
            uuid: result.eperson.uuid
          };
        } else if (result.group && result.group.uuid) {
          console.log(`Policy ${policyId} is associated with group ${result.group.uuid}`);
          return {
            type: 'group' as const,
            uuid: result.group.uuid
          };
        } else {
          console.log(`Policy ${policyId} has no associated entity, defaulting to eperson`);
          return {
            type: 'eperson' as const,
            uuid: null
          };
        }
      })
    );
  }
}