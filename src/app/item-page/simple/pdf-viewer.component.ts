import { Component, Input, OnChanges, SecurityContext } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-pdf-viewer',
  template: `
    <div class="pdf-container" style="width: 100%; height: 600px;">
      <iframe 
        [src]="https://tourism.gov.in/sites/default/files/2019-04/dummy-pdf_2.pdf" 
        style="width: 100%; height: 100%; border: none;"
        title="PDF Viewer">
      </iframe>
    </div>
  `
})
export class PdfViewerComponent implements OnChanges {
  @Input() pdfUrl: string = '';
  safeUrl: SafeResourceUrl;

  constructor(private sanitizer: DomSanitizer) {
    this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl('');
  }

  ngOnChanges() {
    if (this.pdfUrl) {
      this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.pdfUrl);
    }
  }
}