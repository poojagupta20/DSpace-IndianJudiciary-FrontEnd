import { Injectable } from "@angular/core"
import { HttpClient } from "@angular/common/http"
import { Observable } from "rxjs"
import { environment } from "../../../environments/environment"

/**
* Service to handle resource policy permissions API calls
*/
@Injectable({ providedIn: "root" })
export class ResourcePolicyPermissionsService {
  constructor(private http: HttpClient) {}

  /**
   * Update the permissions for a specific resource policy
   * 
   * @param policyId The ID of the resource policy to update
   * @param permissions The permissions object with all fields
   * @returns An Observable with the response from the server
   */
  updatePermissions(policyId: string, permissions: any): Observable<any> {
    // Use the correct API endpoint with the dynamic policy ID
    const url = `${environment.rest.baseUrl}/api/custom/resourcepolicies/${policyId}/update-permissions`
    
    // Log the complete object being sent
    console.log(`Calling API endpoint: ${url} with permissions:`, permissions)
    
    // Send the permissions object
    return this.http.put(url, permissions)
  }
}