import { Component, Input, type OnChanges, type SimpleChanges } from "@angular/core"
import { CommonModule } from "@angular/common"
import { NgxExtendedPdfViewerModule } from "ngx-extended-pdf-viewer"
import type { SignpostingLink } from "../../core/data/signposting-links.model"

@Component({
  selector: "ds-file-viewer",
  templateUrl: "./file-viewer.component.html",
  styleUrls: ["./file-viewer.component.scss"],
  standalone: true,
  imports: [CommonModule, NgxExtendedPdfViewerModule],
})
export class FileViewerComponent implements OnChanges {
  @Input() signpostingLinks: SignpostingLink[] = []

  fileToDisplay: SignpostingLink | null = null
  isPdf = false
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
      this.isPdf = this.fileToDisplay.type.includes("pdf")
      this.isImage = this.fileToDisplay.type.includes("image")
    }
  }
}

