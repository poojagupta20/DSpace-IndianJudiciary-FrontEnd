import {
  Location,
  NgIf,
} from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import {
  TranslateModule,
  TranslateService,
} from '@ngx-translate/core';
import { UiSwitchModule } from 'ngx-ui-switch';
import { take } from 'rxjs/operators';

import { DSONameService } from '../../core/breadcrumbs/dso-name.service';
import {
  BATCH_IMPORT_SCRIPT_NAME,
  ScriptDataService,
} from '../../core/data/processes/script-data.service';
import { RemoteData } from '../../core/data/remote-data';
import { DSpaceObject } from '../../core/shared/dspace-object.model';
import { getFirstCompletedRemoteData } from '../../core/shared/operators';
import { getProcessDetailRoute } from '../../process-page/process-page-routing.paths';
import { Process } from '../../process-page/processes/process.model';
import { ProcessParameter } from '../../process-page/processes/process-parameter.model';
import { ImportBatchSelectorComponent } from '../../shared/dso-selector/modal-wrappers/import-batch-selector/import-batch-selector.component';
import {
  isEmpty,
  isNotEmpty,
} from '../../shared/empty.util';
import { NotificationsService } from '../../shared/notifications/notifications.service';
import { FileDropzoneNoUploaderComponent } from '../../shared/upload/file-dropzone-no-uploader/file-dropzone-no-uploader.component';
import { HttpClient } from '@angular/common/http';
import { CURRENT_API_URL } from 'src/app/core/serachpage/api-urls';

@Component({
  selector: 'ds-batch-import-page',
  templateUrl: './batch-import-page.component.html',
  imports: [
    NgIf,
    TranslateModule,
    FormsModule,
    UiSwitchModule,
    FileDropzoneNoUploaderComponent,
  ],
  standalone: true,
})
export class BatchImportPageComponent {

  fileObject: File;

  validateOnly = true;


  dso: DSpaceObject = null;

  isUpload = true;


  fileURL: string;

  public constructor(private location: Location,
    protected translate: TranslateService,
    protected notificationsService: NotificationsService,
    private scriptDataService: ScriptDataService,
    private router: Router,
    private modalService: NgbModal,
    private dsoNameService: DSONameService,
    private http: HttpClient) {
  }


  setFile(file) {
    this.fileObject = file;
  }


  public onReturn() {
    this.location.back();
  }

  public selectCollection() {
    const modalRef = this.modalService.open(ImportBatchSelectorComponent);
    modalRef.componentInstance.response.pipe(take(1)).subscribe((dso) => {
      this.dso = dso || null;
    });
  }


  public importMetadata() {
    if (this.fileObject == null && isEmpty(this.fileURL)) {
      if (this.isUpload) {
        this.notificationsService.error(this.translate.get('admin.metadata-import.page.error.addFile'));
      } else {
        this.notificationsService.error(this.translate.get('admin.metadata-import.page.error.addFileUrl'));
      }
    } else {
      const parameterValues: ProcessParameter[] = [
        Object.assign(new ProcessParameter(), { name: '--add' }),
      ];
      if (this.isUpload) {
        parameterValues.push(Object.assign(new ProcessParameter(), { name: '--zip', value: this.fileObject.name }));
      } else {
        this.fileObject = null;
        parameterValues.push(Object.assign(new ProcessParameter(), { name: '--url', value: this.fileURL }));
      }
      if (this.dso) {
        parameterValues.push(Object.assign(new ProcessParameter(), { name: '--collection', value: this.dso.uuid }));
      }
      if (this.validateOnly) {
        parameterValues.push(Object.assign(new ProcessParameter(), { name: '-v', value: true }));
      }
      const formData = new FormData();
      formData.append('file', this.fileObject);

      const collectionId = this.dso.uuid;  // dynamic if needed
      const url = `${CURRENT_API_URL}/server/api/bulk-upload/upload/${collectionId}`;

      this.http.post(url, formData).subscribe({
        next: (response) => {
          this.notificationsService.success('Upload Success', 'Bulk file uploaded successfully.');
          this.resetForm(); 

        },
        error: (error) => {
          this.notificationsService.error('Upload Failed', 'Could not upload bulk file.');
        }
      });

    }
  }

  getDspaceObjectName(): string {
    if (this.dso) {
      return this.dsoNameService.getName(this.dso);
    }
    return null;
  }

  removeDspaceObject(): void {
    this.dso = null;
  }

  toggleUpload() {
    this.isUpload = !this.isUpload;
  }

  resetForm() {
    this.fileObject = null;
    this.fileURL = '';
    this.dso = null;
    this.validateOnly = true;
    this.isUpload = true;
  }
  
}
