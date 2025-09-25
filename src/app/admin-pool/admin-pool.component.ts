import { Component, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { OnInit } from '@angular/core';
import { CURRENT_API_URL } from '../core/serachpage/api-urls'; 
import { AdminPoolService } from './admin-service';

@Component({
    selector: 'app-admin-pool',
    templateUrl: './admin-pool.component.html',
    styleUrls: ['./admin-pool.component.scss'],
})
export class AdminPoolComponent implements OnInit {

    constructor(private adminPoolService: AdminPoolService, private cdr: ChangeDetectorRef) { }
    claimedTasks = [];
    pooledTasks = [];
    rejectedTasks = [];

    ngOnInit() {
        this.fetchClaimedTasks();
        this.fetchPooledTasks();
        this.fetchRejectedTasks();
        this.fetchAcceptedSubmissions();
    }

    fetchClaimedTasks() {
        this.adminPoolService.fetchBatches('CLAIMED').subscribe(
            (res) => {
                this.claimedTasks = res;
                this.cdr.markForCheck();
            },
            (err) => {
                console.error('Failed to fetch CLAIMED tasks', err);
                this.cdr.markForCheck();
            }
        );
    }

    fetchPooledTasks() {
        this.adminPoolService.getPooledTasks().subscribe(
            (res) => {
                this.pooledTasks = res;
                this.cdr.markForCheck();
            },
            (err) => {
                console.error('Failed to fetch pooled tasks', err);
                this.cdr.markForCheck();
            }
        );
    }

    fetchRejectedTasks() {
        this.adminPoolService.getRejectedSubmissions().subscribe(
            (res) => {
                this.rejectedTasks = res;
                this.cdr.markForCheck();
            },
            (err) => {
                console.error('Failed to fetch rejected tasks', err);
                this.cdr.markForCheck();
            }
        );
    }

    fetchAcceptedSubmissions() {
        this.adminPoolService.getAcceptedSubmissions().subscribe(
            (res) => {
                this.acceptedSubmissions = res;
                this.cdr.markForCheck();
            },
            (err) => {
                console.error('Failed to fetch accepted submissions', err);
                this.acceptedSubmissions = [];
                this.cdr.markForCheck();
            }
        );
    }

    selectedBatch: any = null;

    dummyFiles: any[] = [];  
    acceptedSubmissions: any[] = []; 

    actionUUID :any = null;
    collectionUuid :any = null; 
    reviewLoading: boolean = false;

    openReviewDialog(batch: any) {
        this.selectedBatch = batch;
        this.reviewLoading = true;
        const batchId = batch.bulkFileId;
        this.collectionUuid = batch.collection.collectionId;

        this.adminPoolService.getBatchFiles(batchId).subscribe(
            (res) => {

                this.actionUUID = res.requestId;
                this.dummyFiles = res.items.map(item => {
                    if (typeof item.metadata === 'string') {
                        try {
                            item.metadata = JSON.parse(item.metadata);
                        } catch (e) {
                            console.error("Failed to parse metadata for item:", item, e);
                            item.metadata = {}; // Fallback to empty object
                        }
                    }
                    return item;
                });
                this.reviewLoading = false;
                this.cdr.markForCheck();
                console.log("testing in the dialogue box",this.collectionUuid);

            },
            (err) => {
                console.error(`Failed to fetch files for batch ${batchId}`, err);
                this.dummyFiles = [];
                this.reviewLoading = false;
                this.cdr.markForCheck();
            }
        );
    }
    
    
    
    approve(uuid: string) {
      
        this.adminPoolService.approve(this.actionUUID, this.collectionUuid).subscribe(() => {
            console.log(this.collectionUuid);

          alert('✅ Approved successfully.');
          this.fetchClaimedTasks();
          this.fetchPooledTasks();
          this.fetchRejectedTasks();
          this.fetchAcceptedSubmissions();
          this.cancelReview();
        });
      }

    reject(uuid: string) {
        this.adminPoolService.reject(this.actionUUID).subscribe(() => {
            alert('Rejected successfully.');
            this.fetchClaimedTasks();
            this.fetchPooledTasks();
            this.fetchRejectedTasks();
            this.fetchAcceptedSubmissions();
            this.cancelReview();
            
        });
    }


    cancelReview() {
        this.selectedBatch = null;
        this.reviewLoading = false;
    }

    getBatchInfo() {
        alert("Fetching batch info...");
        // Placeholder for API integration
    }

    showAccepted = false;
    viewingAcceptedBatch: any = null;

    viewAcceptedSubmissions() {
        this.adminPoolService.getAcceptedSubmissions().subscribe(
            (res) => {
                this.acceptedSubmissions = res;
                this.showAccepted = true;
                this.viewingAcceptedBatch = null;
                this.cdr.markForCheck();
            },
            (err) => {
                console.error('Failed to fetch accepted submissions', err);
                this.acceptedSubmissions = [];
                this.showAccepted = true;
                this.viewingAcceptedBatch = null;
                this.cdr.markForCheck();
            }
        );
    }

    viewFiles(batch: any) {
        this.viewingAcceptedBatch = batch;
    }

    closeAcceptedView() {
        this.showAccepted = false;
        this.viewingAcceptedBatch = null;
    }
}
