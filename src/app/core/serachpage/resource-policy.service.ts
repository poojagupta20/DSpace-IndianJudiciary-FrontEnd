import { Injectable } from "@angular/core"
import{ HttpClient } from "@angular/common/http"
import {  Observable, throwError } from "rxjs"
import { catchError, map } from "rxjs/operators"
import { ResourcePolicy } from "../../core/resource-policy/models/resource-policy.model"
import { environment } from "../../../environments/environment"

@Injectable({
  providedIn: "root",
})
export class ResourcePolicyService {
  private apiUrl = environment.rest.baseUrl

  constructor(private http: HttpClient) {}

  /**
   * Fetch all policies for a specific bitstream
   *
   * @param bitstreamId The UUID of the bitstream
   * @returns Observable with an array of ResourcePolicy objects
   */
  getAllPoliciesForBitstream(bitstreamId: string): Observable<ResourcePolicy[]> {
    const url = `${this.apiUrl}/api/authz/bitstreams/${bitstreamId}/policies`

    return this.http.get<any>(url).pipe(
      map((response) => {
        if (response && response._embedded && response._embedded.policies) {
          return response._embedded.policies
        }
        return []
      }),
      catchError((error) => {
        console.error("Error fetching bitstream policies:", error)
        return throwError(() => new Error("Failed to fetch policies for bitstream"))
      }),
    )
  }

  /**
   * Delete a specific resource policy
   *
   * @param policyId The ID of the policy to delete
   * @returns Observable indicating success or failure
   */
  deletePolicy(policyId: string): Observable<boolean> {
    const url = `${this.apiUrl}/api/authz/resourcepolicies/${policyId}`

    return this.http.delete(url).pipe(
      map(() => true),
      catchError((error) => {
        console.error("Error deleting policy:", error)
        return throwError(() => new Error("Failed to delete policy"))
      }),
    )
  }

  /**
   * Create a new resource policy for a bitstream
   *
   * @param bitstreamId The UUID of the bitstream
   * @param policyData The policy data to create
   * @returns Observable with the created policy
   */
  createPolicy(bitstreamId: string, policyData: any): Observable<ResourcePolicy> {
    const url = `${this.apiUrl}/api/authz/bitstreams/${bitstreamId}/policies`

    return this.http.post<ResourcePolicy>(url, policyData).pipe(
      catchError((error) => {
        console.error("Error creating policy:", error)
        return throwError(() => new Error("Failed to create policy"))
      }),
    )
  }
}
