// import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
// import { ActivatedRoute, Router } from '@angular/router';
// import { Bitstream } from '../core/shared/bitstream.model';
// import { CaseDetailsService } from '../core/serachpage/case-details.service';

// @Component({
//   selector: 'app-case-details',
//   templateUrl: './case-details.component.html',
//   styleUrls: ['./case-details.component.scss']
// })
// export class CaseDetailsComponent implements OnInit {
//   metadata: any = {};
//   attachments: Bitstream[] = [];

//   itemUuid = '';
//   showMore = false;
//   currentPage = 1;
//   pageSize = 3;
//   loading = true;
//   loadError = false;

//   customMetadataLabels: { [key: string]: string } = {
//     "dc.caseyear": "Case Year",
//     "dc.casetype": "Case Type",
//     "dc.case.number": "Case Number",
//     "dc.case.district": "District",
//     "dc.pname": "Petitioner name",
//     "dc.rname": "Respondent name",
//     "dc.paname": "Petitioner Advocate",
//     "dc.raname": "Respondent Advocate",
//     "dc.contributor.author": "Judge Name",
//     "dc.date.accessioned": "Access Date",
//     "dc.date.issued": "Issued Year",
//     "dc.identifier.uri": "Handle URL",
//     "dc.title": "Title",
//     "dc.title.alternative": "Alternative Title",
//     "dc.type": "Document Type",
//     "dc.barcode": "Barcode",
//     "dc.batch-number": "Batch Number",
//     "dc.char-count": "Character Count",
//     "dc.date.scan": "Scan Date",
//     "dc.date.verification": "Verification Date",
//     "dc.pages": "Page Count",
//     "dc.size": "Size (KB)",
//     "dc.verified-by": "Verified By",
//     "dc.district":"Distict",
//     "dc.date.disposal":"Disposal Date",
//     "dc.description.provenance":"Provenance"
//   };

//   visibleKeys = [
//     "dc.case.number", "dc.casetype", "dc.caseyear", "dc.date.issued",
//     "dc.contributor.author", "dc.pname", "dc.rname", "dc.paname", "dc.raname",
//     "dc.case.district", "dc.date.scan", "dc.verified-by"
//   ];


//   constructor(
//     private route: ActivatedRoute,
//     private router: Router,
//     private caseDetailsService: CaseDetailsService,
//     private cdr: ChangeDetectorRef // Add ChangeDetectorRef
//   ) {}

//   ngOnInit(): void {
//     this.route.paramMap.subscribe(params => {
//       const uuid = params.get('id');
//       if (uuid) {
//         this.itemUuid = uuid;
//         this.fetchData(uuid);
//       } else {
//         this.loading = false;
//         this.loadError = true;
//         console.error("❌ UUID missing in route");
//         this.cdr.detectChanges(); // Force change detection
//       }
//     });
//   }

//   get metadataOnly() {
//     return this.metadata?.metadata ?? {};
//   }

//   fetchData(uuid: string): void {
//     this.loading = true;
//     this.loadError = false;
//     this.cdr.detectChanges(); // Force change detection when loading starts
    
//     this.caseDetailsService.getCaseDataWithAttachments(uuid).subscribe({
//       next: (res) => {
//         this.metadata = res.metadata;
//         this.attachments = res.attachments;
//         this.loading = false;
//         this.cdr.detectChanges(); // Force change detection after data is loaded
//         console.log('Data loaded:', this.metadata, this.attachments); // Add logging
//       },
//       error: (err) => {
//         console.error("❌ Error fetching case details:", err);
//         this.loading = false;
//         this.loadError = true;
//         this.cdr.detectChanges(); // Force change detection after error
//       }
//     });
//   }

//   reloadData(): void {
//     if (this.itemUuid) {
//       this.fetchData(this.itemUuid);
//     }
//   }

//   getMetadataValue(field: string): string {
//     return this.metadata?.metadata?.[field]?.[0]?.value ?? '-';
//   }

//   get extraMetadata(): { key: string, label: string, value: string }[] {
//     return Object.keys(this.metadata?.metadata || {})
//       .filter(key => !this.visibleKeys.includes(key))
//       .map(key => ({
//         key,
//         label: this.customMetadataLabels[key] || key,
//         value: this.getMetadataValue(key)
//       }));
//   }

//   paginatedAttachments(): Bitstream[] {
//     const start = (this.currentPage - 1) * this.pageSize;
//     return this.attachments.slice(start, start + this.pageSize);
//   }

//   get totalPages(): number {
//     return Math.ceil(this.attachments.length / this.pageSize);
//   }

//   nextPage(): void {
//     if (this.currentPage < this.totalPages) this.currentPage++;
//   }

//   prevPage(): void {
//     if (this.currentPage > 1) this.currentPage--;
//   }

//   extractUuidFromBitstream(file: any): string {
//     const href = file._links?.content?.href || '';
//     const parts = href.split('/');
//     return parts.length > 2 ? parts[parts.length - 2] : '';
//   }

//   viewFile(file: Bitstream): void {
//     const bitstreamUuid = this.extractUuidFromBitstream(file);
//     if (bitstreamUuid && this.itemUuid) {
//       this.router.navigate([`/viewer/i/${this.itemUuid}/f/${bitstreamUuid}`]);
//     }
//   }
// }

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Bitstream } from '../core/shared/bitstream.model';
import { CaseDetailsService } from '../core/serachpage/case-details.service';
// import { BitstreamPermissionsService } from '../core/shared/bitstream-permissions.service';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize, map, switchMap } from 'rxjs/operators';
import { BitstreamPermissionsService } from '../core/serachpage/bitstream-permissions.service';



@Component({
  selector: "app-case-details",
  templateUrl: "./case-details.component.html",
  styleUrls: ["./case-details.component.scss"],
})
export class CaseDetailsComponent implements OnInit {
  metadata: any = {}
  attachments: Bitstream[] = []
  filteredAttachments: Bitstream[] = []

  itemUuid = ""
  showMore = false
  currentPage = 1
  pageSize = 3
  loading = true
  loadError = false
  checkingPermissions = false
// Fields to exclude from display
excludedFields = [
  "dc.description.provenance",
  "dc.identifier.uri",
  "dc.date.accessioned"
  
];

customMetadataLabels: { [key: string]: string } = {
  "dc.caseyear": "Case Year",
  "dc.casetype": "Case Type",
  "dc.title": "Case Number",
  "dc.case.district": "District",
  "dc.district": "District",
  "dc.pname": "Petitioner Name",
  "dc.rname": "Respondent Name",
  "dc.paname": "Petitioner's Advocate Name",
  "dc.raname": "Respondent's Advocate Name",
  "dc.contributor.author": "Judge Name",
  "dc.date.accessioned": "Access Date",
  "dc.date.issued": "Issued Year",
  "dc.date.disposal": "Disposal Date",
  "dc.identifier.uri": "Handle URL",
  // "dc.title": "Title",
  "dc.title.alternative": "Alternative Title",
  "dc.type": "Document Type",
  "dc.barcode": "Barcode Number",
  "dc.batch-number": "Batch Number",
  "dc.char-count": "Character Count",
  "dc.date.scan": "Scan Date",
  "dc.date.verification": "Date Verification",
  "dc.pages": "No of Pages of the Main File",
  "dc.size": "File Size",
  "dc.verified-by": "Verified By"
};

// Updated visibleKeys array with the two specified fields removed
visibleKeys = [
  "dc.casetype",              // 1. Case Type
  "dc.title",           // 2. Case Number
  "dc.caseyear",              // 3. Case Year
  "dc.date.disposal",         // 4. Disposal Date
  "dc.contributor.author",    // 5. Judge Name
  "dc.pname",                 // 6. Petitioner Name
  "dc.rname",                 // 7. Respondent Name
  "dc.paname",                // 8. Petitioner's Advocate Name
  "dc.raname",                // 9. Respondent's Advocate Name
  "dc.district",              // 10. District
  "dc.date.scan",             // 11. Scan Date
  "dc.verified-by",           // 12. Verified By
  "dc.date.verification",     // 13. Date Verification
  "dc.barcode",               // 14. Barcode Number
  "dc.batch-number",          // 15. Batch Number
  "dc.size",                  // 16. File Size
  "dc.char-count",            // 17. Character Count
  "dc.pages"                  // 18. No of Pages of the Main File
];
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private caseDetailsService: CaseDetailsService,
    private bitstreamPermissionsService: BitstreamPermissionsService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const uuid = params.get("id")
      if (uuid) {
        this.itemUuid = uuid
        this.fetchData(uuid)
      } else {
        this.loading = false
        this.loadError = true
        console.error("❌ UUID missing in route")
        this.cdr.detectChanges()
      }
    })
  }

  get metadataOnly() {
    return this.metadata?.metadata ?? {}
  }

  fetchData(uuid: string): void {
    this.loading = true
    this.loadError = false
    this.cdr.detectChanges()

    this.caseDetailsService.getCaseDataWithAttachments(uuid).subscribe({
      next: (res) => {
        this.metadata = res.metadata
        this.attachments = res.attachments

        // After getting attachments, check permissions for each
        this.checkPermissionsForAttachments()
      },
      error: (err) => {
        console.error("❌ Error fetching case details:", err)
        this.loading = false
        this.loadError = true
        this.cdr.detectChanges()
      },
    })
  }

  checkPermissionsForAttachments(): void {
    if (!this.attachments || this.attachments.length === 0) {
      this.filteredAttachments = []
      this.loading = false
      this.cdr.detectChanges()
      return
    }

    this.checkingPermissions = true

    // Create an array of observables for each bitstream permission check
    const permissionChecks = this.attachments.map((file) => {
      const bitstreamId = this.extractUuidFromBitstream(file)
      if (!bitstreamId) {
        return of({ file, hasPermission: false, isAdmin: false })
      }

      return this.bitstreamPermissionsService.getBitstreamPermissions(bitstreamId).pipe(
        map((permission) => {
          // User has permission if they are admin OR they have policies
          const hasPermission = permission.isAdmin === true || (permission.policies && permission.policies.length > 0)

          return { file, hasPermission, isAdmin: permission.isAdmin === true }
        }),
        catchError((error) => {
          console.error(`Error checking permissions for ${file.name}:`, error)
          return of({ file, hasPermission: false, isAdmin: false })
        }),
      )
    })

    // Execute all permission checks in parallel
    forkJoin(permissionChecks)
      .pipe(
        finalize(() => {
          this.loading = false
          this.checkingPermissions = false
          this.cdr.detectChanges()
        }),
      )
      .subscribe({
        next: (results) => {
          // Filter attachments to only include those with permissions
          this.filteredAttachments = results.filter((result) => result.hasPermission).map((result) => result.file)

          console.log(
            `Filtered ${this.attachments.length} files to ${this.filteredAttachments.length} with permissions`,
          )
          console.log("Permission results:", results)
          this.currentPage = 1 // Reset to first page after filtering
          this.cdr.detectChanges()
        },
        error: (err) => {
          console.error("❌ Error checking file permissions:", err)
          this.filteredAttachments = [] // On error, show no files
          this.cdr.detectChanges()
        },
      })
  }

  reloadData(): void {
    if (this.itemUuid) {
      this.fetchData(this.itemUuid)
    }
  }

  getMetadataValue(field: string): string {
    return this.metadata?.metadata?.[field]?.[0]?.value ?? "-"
  }

  get extraMetadata(): { key: string, label: string, value: string }[] {
    return Object.keys(this.metadata?.metadata || {})
      .filter(key => !this.visibleKeys.includes(key) && !this.excludedFields.includes(key))
      .map(key => ({
        key,
        label: this.customMetadataLabels[key] || key,
        value: this.getMetadataValue(key)
      }));
  }

  navigateToEdit(): void {
    if (this.itemUuid) {
      this.router.navigate(["edit/metadata"], { relativeTo: this.route })
    }
  }

  paginatedAttachments(): Bitstream[] {
    const start = (this.currentPage - 1) * this.pageSize
    return this.filteredAttachments.slice(start, start + this.pageSize)
  }

  get totalPages(): number {
    return Math.ceil(this.filteredAttachments.length / this.pageSize)
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) this.currentPage++
  }

  prevPage(): void {
    if (this.currentPage > 1) this.currentPage--
  }

  extractUuidFromBitstream(file: any): string {
    const href = file._links?.content?.href || ""
    const parts = href.split("/")
    return parts.length > 2 ? parts[parts.length - 2] : ""
  }

  viewFile(file: Bitstream): void {
    const bitstreamUuid = this.extractUuidFromBitstream(file)
    if (bitstreamUuid && this.itemUuid) {
      this.router.navigate([`/viewer/i/${this.itemUuid}/f/${bitstreamUuid}`])
    }
  }
}
