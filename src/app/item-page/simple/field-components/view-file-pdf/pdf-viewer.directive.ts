import { Directive, ElementRef, Input, OnChanges, SimpleChanges } from "@angular/core"
import  { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser"


@Directive({
  selector: "[appPdfViewer]",
  standalone: true,
})
export class PdfViewerDirective implements OnChanges {
  @Input() pdfUrl: string | SafeResourceUrl = ""

  constructor(
    private el: ElementRef,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["pdfUrl"] && this.pdfUrl) {
      this.setupPdfViewer()
    }
  }

  private setupPdfViewer(): void {
    const iframe = document.createElement("iframe")
    iframe.style.width = "100%"
    iframe.style.height = "100%"
    iframe.style.border = "none"

    // If pdfUrl is already a SafeResourceUrl, we need to get the raw URL
    let url = typeof this.pdfUrl === "string" ? this.pdfUrl : this.pdfUrl.toString()

    // Add cache buster to prevent caching issues
    url = `${url}${url.includes("?") ? "&" : "?"}t=${new Date().getTime()}`

    // Set the src attribute
    iframe.src = url

    // Clear the element and append the iframe
    this.el.nativeElement.innerHTML = ""
    this.el.nativeElement.appendChild(iframe)
  }
}

