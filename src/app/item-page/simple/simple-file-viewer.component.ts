import { Component, Input, type OnChanges, type SimpleChanges } from "@angular/core"
import { CommonModule } from "@angular/common"
import type { SignpostingLink } from "../../core/data/signposting-links.model"

@Component({
  selector: "ds-simple-file-viewer",
  template: `
    <div class="file-viewer-container">
      <ng-container *ngIf="fileToDisplay">
        <!-- Image viewer -->
        <div *ngIf="isImage" class="image-container">
          <img [src]="fileToDisplay.href" alt="Item preview" class="item-image" />
        </div>
        
        <!-- Download link for other file types -->
        <div *ngIf="!isImage" class="download-container">
          <p>This file type ({{ fileToDisplay.type }}) cannot be previewed directly.</p>
          <a [href]="fileToDisplay.href" target="_blank" class="btn btn-primary">Download File</a>
        </div>
      </ng-container>
      
      <div *ngIf="!fileToDisplay" class="no-file">
        <p>No viewable file found in the item's resources.</p>
      </div>
    </div>
  `,
  styles: [
    `
    .file-viewer-container {
      width: 100%;
      margin: 1rem 0;
      border: 1px solid #ddd;
      border-radius: 4px;
      overflow: hidden;
    }
    
    .image-container {
      display: flex;
      justify-content: center;
      padding: 1rem;
    }
    
    .item-image {
      max-width: 100%;
      max-height: 80vh;
      object-fit: contain;
    }
    
    .download-container, .no-file {
      padding: 2rem;
      text-align: center;
    }
    
    .btn {
      margin-top: 1rem;
    }
  `,
  ],
  standalone: true,
  imports: [CommonModule],
})
export class SimpleFileViewerComponent implements OnChanges {
  @Input() signpostingLinks: SignpostingLink[] = []

  fileToDisplay: SignpostingLink | null = null
  isImage = false

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.signpostingLinks && this.signpostingLinks.length > 0) {
      this.setupFileViewer()
    }
  }

  private setupFileViewer(): void {
    // Find the first item link
    this.fileToDisplay = this.signpostingLinks.find((link) => link.rel === "item" && link.href && link.type) || null

    if (this.fileToDisplay) {
      this.isImage = this.fileToDisplay.type.includes("image")
    }
  }
}

