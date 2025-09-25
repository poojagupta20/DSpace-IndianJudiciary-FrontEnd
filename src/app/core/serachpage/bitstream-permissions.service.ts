// import { Injectable } from '@angular/core';
// import { HttpClient } from '@angular/common/http';
// import { Observable, of } from 'rxjs';
// import { catchError, map } from 'rxjs/operators';

// export interface BitstreamPermission {
//   userId: string;
//   policies: BitstreamPolicy[];
//   bitstreamId: string;
// }

// export interface BitstreamPolicy {
//   endDate: string | null;
//   pageStart: number;
//   pageEnd: number;
//   policyType: string;
//   name: string | null;
//   description: string | null;
//   action: string;
//   startDate: string | null;
// }

// @Injectable({
//   providedIn: 'root'
// })
// export class BitstreamPermissionsService {
//   private baseUrl = 'http://10.184.240.87:8080/server/api/custom/bitstreams';

//   constructor(private http: HttpClient) { }

//   /**
//    * Get permissions for a specific bitstream
//    * @param bitstreamId The UUID of the bitstream
//    * @returns Observable of BitstreamPermission
//    */
//   getBitstreamPermissions(bitstreamId: string): Observable<BitstreamPermission> {
//     return this.http.get<BitstreamPermission>(`${this.baseUrl}/${bitstreamId}/permissions`)
//       .pipe(
//         catchError(error => {
//           console.error(`Error fetching permissions for bitstream ${bitstreamId}:`, error);
//           // Return an empty permission object on error
//           return of({ userId: '', policies: [], bitstreamId });
//         })
//       );
//   }

//   /**
//    * Check if a bitstream has any policies (permissions)
//    * @param bitstreamId The UUID of the bitstream
//    * @returns Observable<boolean> - true if the bitstream has policies, false otherwise
//    */
//   hasBitstreamPermissions(bitstreamId: string): Observable<boolean> {
//     return this.getBitstreamPermissions(bitstreamId).pipe(
//       map(permission => permission.policies && permission.policies.length > 0)
//     );
//   }
// }

// import { Injectable } from '@angular/core';
// import { HttpClient } from '@angular/common/http';
// import { Observable, of } from 'rxjs';
// import { catchError, map } from 'rxjs/operators';

// export interface BitstreamPermission {
//   userId: string;
//   policies: BitstreamPolicy[];
//   bitstreamId: string;
// }

// export interface BitstreamPolicy {
//   endDate: string | null;
//   pageStart: number;
//   pageEnd: number;
//   policyType: string;
//   name: string | null;
//   description: string | null;
//   action: string;
//   startDate: string | null;
//   print: boolean;    // Added print permission
//   download: boolean; // Added download permission
// }

// @Injectable({
//   providedIn: 'root'
// })
// export class BitstreamPermissionsService {
//   private baseUrl = 'http://10.184.240.87:8080/server/api/custom/bitstreams';

//   constructor(private http: HttpClient) { }

//   /**
//    * Get permissions for a specific bitstream
//    * @param bitstreamId The UUID of the bitstream
//    * @returns Observable of BitstreamPermission
//    */
//   getBitstreamPermissions(bitstreamId: string): Observable<BitstreamPermission> {
//     return this.http.get<BitstreamPermission>(`${this.baseUrl}/${bitstreamId}/permissions`)
//       .pipe(
//         catchError(error => {
//           console.error(`Error fetching permissions for bitstream ${bitstreamId}:`, error);
//           // Return an empty permission object on error
//           return of({ userId: '', policies: [], bitstreamId });
//         })
//       );
//   }

//   /**
//    * Check if a bitstream has any policies (permissions)
//    * @param bitstreamId The UUID of the bitstream
//    * @returns Observable<boolean> - true if the bitstream has policies, false otherwise
//    */
//   hasBitstreamPermissions(bitstreamId: string): Observable<boolean> {
//     return this.getBitstreamPermissions(bitstreamId).pipe(
//       map(permission => permission.policies && permission.policies.length > 0)
//     );
//   }

//   /**
//    * Check if a bitstream has download permission
//    * @param bitstreamId The UUID of the bitstream
//    * @returns Observable<boolean> - true if download is allowed
//    */
//   canDownload(bitstreamId: string): Observable<boolean> {
//     return this.getBitstreamPermissions(bitstreamId).pipe(
//       map(permission => {
//         if (!permission.policies || permission.policies.length === 0) {
//           return false;
//         }
//         return permission.policies.some(policy => policy.download === true);
//       })
//     );
//   }

//   /**
//    * Check if a bitstream has print permission
//    * @param bitstreamId The UUID of the bitstream
//    * @returns Observable<boolean> - true if printing is allowed
//    */
//   canPrint(bitstreamId: string): Observable<boolean> {
//     return this.getBitstreamPermissions(bitstreamId).pipe(
//       map(permission => {
//         if (!permission.policies || permission.policies.length === 0) {
//           return false;
//         }
//         return permission.policies.some(policy => policy.print === true);
//       })
//     );
//   }
// }



import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { CURRENT_API_URL } from './api-urls';

export interface BitstreamPermission {
  userId: string
  policies: BitstreamPolicy[]
  bitstreamId: string
  isAdmin?: boolean // Added isAdmin flag
}

export interface BitstreamPolicy {
  endDate: string | null
  pageStart: number
  pageEnd: number
  policyType: string
  name: string | null
  description: string | null
  action: string
  startDate: string | null
  print: boolean
  download: boolean
}

export interface TimeAccessStatus {
  hasAccess: boolean
  message: string
  validUntil: Date | null
  validFrom: Date | null
}

@Injectable({
  providedIn: "root",
})
export class BitstreamPermissionsService {
  private baseUrl = `${CURRENT_API_URL}/server/api/custom/bitstreams`

  constructor(private http: HttpClient) {}

  /**
   * Get permissions for a specific bitstream
   * @param bitstreamId The UUID of the bitstream
   * @returns Observable of BitstreamPermission
   */
  getBitstreamPermissions(bitstreamId: string): Observable<BitstreamPermission> {
    return this.http.get<BitstreamPermission>(`${this.baseUrl}/${bitstreamId}/permissions`).pipe(
      catchError((error) => {
        console.error(`Error fetching permissions for bitstream ${bitstreamId}:`, error)
        // Return an empty permission object on error
        return of({ userId: "", policies: [], bitstreamId })
      }),
    )
  }

  /**
   * Check if a bitstream has any policies (permissions) or if user is admin
   * @param bitstreamId The UUID of the bitstream
   * @returns Observable<boolean> - true if the bitstream has policies or user is admin, false otherwise
   */
  hasBitstreamPermissions(bitstreamId: string): Observable<boolean> {
    return this.getBitstreamPermissions(bitstreamId).pipe(
      map((permission) => {
        // User has permission if they are admin OR they have policies
        return permission.isAdmin === true || (permission.policies && permission.policies.length > 0)
      }),
    )
  }

  /**
   * Check if a bitstream has download permission
   * @param bitstreamId The UUID of the bitstream
   * @returns Observable<boolean> - true if download is allowed
   */
  canDownload(bitstreamId: string): Observable<boolean> {
    return this.getBitstreamPermissions(bitstreamId).pipe(
      map((permission) => {
        // Admin can always download
        if (permission.isAdmin === true) {
          return true
        }

        if (!permission.policies || permission.policies.length === 0) {
          return false
        }

        const now = new Date()
        return permission.policies.some((policy) => {
          // Check if policy allows download and is within time range
          if (!policy.download) return false

          // Check time restrictions
          const isWithinTimeRange = this.isWithinTimeRange(policy, now)
          return isWithinTimeRange
        })
      }),
    )
  }

  /**
   * Check if a bitstream has print permission
   * @param bitstreamId The UUID of the bitstream
   * @returns Observable<boolean> - true if printing is allowed
   */
  canPrint(bitstreamId: string): Observable<boolean> {
    return this.getBitstreamPermissions(bitstreamId).pipe(
      map((permission) => {
        // Admin can always print
        if (permission.isAdmin === true) {
          return true
        }

        if (!permission.policies || permission.policies.length === 0) {
          return false
        }

        const now = new Date()
        return permission.policies.some((policy) => {
          // Check if policy allows printing and is within time range
          if (!policy.print) return false

          // Check time restrictions
          const isWithinTimeRange = this.isWithinTimeRange(policy, now)
          return isWithinTimeRange
        })
      }),
    )
  }

  /**
   * Check if current time is within the policy's time range
   * @param bitstreamId The UUID of the bitstream
   * @returns Observable<TimeAccessStatus> - Access status with message
   */
  checkTimeAccess(bitstreamId: string): Observable<TimeAccessStatus> {
    return this.getBitstreamPermissions(bitstreamId).pipe(
      map((permission) => {
        // Admin always has access
        if (permission.isAdmin === true) {
          return {
            hasAccess: true,
            message: "You have admin access to this file.",
            validUntil: null,
            validFrom: null,
          }
        }

        if (!permission.policies || permission.policies.length === 0) {
          return {
            hasAccess: false,
            message: "No access policies found for this file.",
            validUntil: null,
            validFrom: null,
          }
        }

        const now = new Date()

        // Check if any policy grants access at the current time
        for (const policy of permission.policies) {
          const timeStatus = this.getTimeAccessStatus(policy, now)
          if (timeStatus.hasAccess) {
            return timeStatus
          }
        }

        // If we get here, no policy grants access at the current time
        // Find the next upcoming access window if any
        let nextAccessPolicy: BitstreamPolicy | null = null
        let nextAccessDate: Date | null = null

        for (const policy of permission.policies) {
          if (!policy.startDate) continue

          const startDate = new Date(policy.startDate)
          if (startDate > now && (!nextAccessDate || startDate < nextAccessDate)) {
            nextAccessPolicy = policy
            nextAccessDate = startDate
          }
        }

        if (nextAccessPolicy && nextAccessDate) {
          return {
            hasAccess: false,
            message: `Access will be available from ${this.formatDate(nextAccessDate)}.`,
            validUntil: null,
            validFrom: nextAccessDate,
          }
        }

        // Check if access has expired
        let lastExpiredPolicy: BitstreamPolicy | null = null
        let lastExpiredDate: Date | null = null

        for (const policy of permission.policies) {
          if (!policy.endDate) continue

          const endDate = new Date(policy.endDate)
          if (endDate < now && (!lastExpiredDate || endDate > lastExpiredDate)) {
            lastExpiredPolicy = policy
            lastExpiredDate = endDate
          }
        }

        if (lastExpiredPolicy && lastExpiredDate) {
          return {
            hasAccess: false,
            message: `Access expired on ${this.formatDate(lastExpiredDate)}.`,
            validUntil: lastExpiredDate,
            validFrom: null,
          }
        }

        return {
          hasAccess: false,
          message: "You do not have access to view this file at this time.",
          validUntil: null,
          validFrom: null,
        }
      }),
    )
  }

  /**
   * Get detailed time access status for a specific policy
   */
  private getTimeAccessStatus(policy: BitstreamPolicy, now: Date): TimeAccessStatus {
    const isWithinTimeRange = this.isWithinTimeRange(policy, now)

    if (isWithinTimeRange) {
      let message = "You have access to view this file"
      let validUntil: Date | null = null

      if (policy.endDate) {
        const endDate = new Date(policy.endDate)
        validUntil = endDate

        // Calculate time remaining
        const timeRemaining = this.getTimeRemainingText(now, endDate)
        message += ` until ${this.formatDate(endDate)} (${timeRemaining})`
      }

      return {
        hasAccess: true,
        message,
        validUntil,
        validFrom: policy.startDate ? new Date(policy.startDate) : null,
      }
    } else {
      // Access denied due to time restrictions
      if (policy.startDate && new Date(policy.startDate) > now) {
        const startDate = new Date(policy.startDate)
        return {
          hasAccess: false,
          message: `Access will be available from ${this.formatDate(startDate)}.`,
          validUntil: null,
          validFrom: startDate,
        }
      } else if (policy.endDate && new Date(policy.endDate) < now) {
        const endDate = new Date(policy.endDate)
        return {
          hasAccess: false,
          message: `Access expired on ${this.formatDate(endDate)}.`,
          validUntil: endDate,
          validFrom: null,
        }
      }

      return {
        hasAccess: false,
        message: "You do not have access to view this file at this time.",
        validUntil: null,
        validFrom: null,
      }
    }
  }

  /**
   * Check if current time is within the policy's time range
   */
  private isWithinTimeRange(policy: BitstreamPolicy, now: Date): boolean {
    // Check start date if it exists
    if (policy.startDate) {
      const startDate = new Date(policy.startDate)
      if (now < startDate) {
        return false
      }
    }

    // Check end date if it exists
    if (policy.endDate) {
      const endDate = new Date(policy.endDate)
      if (now > endDate) {
        return false
      }
    }

    return true
  }

  /**
   * Format date for display
   */
  private formatDate(date: Date): string {
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  /**
   * Get human-readable time remaining text
   */
  private getTimeRemainingText(now: Date, endDate: Date): string {
    const diffMs = endDate.getTime() - now.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

    if (diffDays > 0) {
      return `${diffDays} day${diffDays !== 1 ? "s" : ""} ${diffHours} hour${diffHours !== 1 ? "s" : ""} remaining`
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""} remaining`
    } else {
      return `${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""} remaining`
    }
  }
}
