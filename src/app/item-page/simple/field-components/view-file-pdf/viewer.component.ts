import {
  Component,
    OnInit,
    ElementRef,
  ViewChild,
    AfterViewInit,
    ChangeDetectorRef,
    OnDestroy,
} from "@angular/core"
import   { ActivatedRoute } from "@angular/router"
import   { SignpostingDataService } from "src/app/core/data/signposting-data.service"
import { CommonModule } from "@angular/common"
import * as pdfjsLib from "pdfjs-dist"
import "pdfjs-dist/build/pdf.worker.entry"
import { ViewEncapsulation } from "@angular/core"
import { SignpostingDataService1 } from "src/app/core/serachpage/signposting-metadata-data.service"
import { Location } from "@angular/common"
import { HttpClient } from "@angular/common/http"
import { PdfService } from "src/app/core/serachpage/pdf-auth.service"
import {
  BitstreamPermissionsService,
  TimeAccessStatus,
} from "src/app/core/serachpage/bitstream-permissions.service"
import { interval,  Subscription } from "rxjs"
import { FormsModule } from "@angular/forms"
import { BitstreamComment, BitstreamCommentService } from "src/app/core/serachpage/bitstream-comment.service"

@Component({
  selector: "app-viewer",
  templateUrl: "./viewer.component.html",
  styleUrls: ["./viewer.component.scss"],
  standalone: true,
  imports: [CommonModule, FormsModule],
  encapsulation: ViewEncapsulation.None,
})
export class ViewerComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild("pdfContainer", { static: false }) pdfContainer!: ElementRef<HTMLDivElement>
  isAdmin = false
  fileUrl = ""
  pdfDoc: any = null
  currentPage = 1
  totalPages = 0
  zoomLevel = 1.0
  fileType = ""
  isLoading = false
  currentBitstreamId = ""

  isPdfFile = false
  isImageFile = false
  isVideoFile = false
  isAudioFile = false

  isSearchVisible = false
  searchText = ""
  searchResults: any[] = []
  currentSearchIndex = -1

  searchTerm: string

  // Permission flags
  canDownloadFile = false
  canPrintFile = false
  checkingPermissions = false

  // Time-based access
  timeAccessStatus: TimeAccessStatus | null = null
  hasTimeAccess = false
  accessExpirationTimer: Subscription | null = null
  accessCheckInterval: Subscription | null = null

  // Fields to exclude from display
  excludedFields = ["dc.description.provenance", "dc.identifier.uri", "dc.date.accessioned"]

  comments: BitstreamComment[] = []
  newCommentText = ""
  isAddingComment = false

  // ✅ Custom confirmation modal properties
  showDeleteConfirmation = false
  commentToDelete: number | null = null
  deletingCommentId: number | null = null

  // Initial metadata array (will be replaced with API data)
  metadata: { name: string; value: string }[] = []

  // Ordered list of metadata keys to control display order
  orderedMetadataKeys = [
    "dc.casetype", // 1. Case Type
    "dc.title", // 2. Case Number
    "dc.caseyear", // 3. Case Year
    "dc.date.disposal", // 4. Disposal Date
    "dc.contributor.author", // 5. Judge Name
    "dc.pname", // 6. Petitioner Name
    "dc.rname", // 7. Respondent Name
    "dc.paname", // 8. Petitioner's Advocate Name
    "dc.raname", // 9. Respondent's Advocate Name
    "dc.district", // 10. District
    "dc.date.scan", // 11. Scan Date
    "dc.verified-by", // 12. Verified By
    "dc.date.verification", // 13. Date Verification
    "dc.barcode", // 14. Barcode Number
    "dc.batch-number", // 15. Batch Number
    "dc.size", // 16. File Size
    "dc.char-count", // 17. Character Count
    "dc.pages", // 18. No of Pages of the Main File
  ]

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
    "dc.title.alternative": "Alternative Title",
    "dc.type": "Document Type",
    "dc.barcode": "Barcode Number",
    "dc.batch-number": "Batch Number",
    "dc.char-count": "Character Count",
    "dc.date.scan": "Scan Date",
    "dc.date.verification": "Date Verification",
    "dc.pages": "No of Pages of the Main File",
    "dc.size": "File Size",
    "dc.verified-by": "Verified By",
  }

  isMetadataMinimized = false;
  isCommentMinimized = false;

  videoError = false;

  constructor(
    private route: ActivatedRoute,
    private signpostingService: SignpostingDataService,
    private metadataApiService: SignpostingDataService1,
    private location: Location,
    private cdr: ChangeDetectorRef,
    private http: HttpClient,
    private pdfService: PdfService,
    private bitstreamPermissionsService: BitstreamPermissionsService,
    private bitstreamCommentService: BitstreamCommentService,
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      const itemUuid = params["itemUuid"]
      const bitstreamUuid = params["bitstreamUuid"]

      if (itemUuid && bitstreamUuid) {
        this.currentBitstreamId = bitstreamUuid
        this.fetchMetadataFromApi(itemUuid)
        this.checkFilePermissions(bitstreamUuid)
      } else {
        console.error("❌ Missing itemUuid or bitstreamUuid in route")
      }
    })
  }

  checkFilePermissions(bitstreamId: string): void {
    this.checkingPermissions = true

    // Step 1: Fetch all permission info (includes isAdmin flag)
    this.bitstreamPermissionsService.getBitstreamPermissions(bitstreamId).subscribe({
      next: (permData) => {
        this.isAdmin = permData?.isAdmin === true

        if (this.isAdmin) {
          // ✅ Full access for admins
          this.canDownloadFile = true
          this.canPrintFile = true
          this.hasTimeAccess = true
          document.body.classList.add("can-print")

          const itemUuid = this.route.snapshot.params["itemUuid"]
          this.fetchFileData(itemUuid, bitstreamId)

          this.checkingPermissions = false
          this.cdr.detectChanges()
          return // ✅ Skip further permission/time checks
        }

        // ✅ Step 2: Check time-based access for non-admins
        this.bitstreamPermissionsService.checkTimeAccess(bitstreamId).subscribe({
          next: (accessStatus) => {
            this.timeAccessStatus = accessStatus
            this.hasTimeAccess = accessStatus.hasAccess

            console.log(`Time-based access for ${bitstreamId}:`, accessStatus)

            if (this.hasTimeAccess) {
              const itemUuid = this.route.snapshot.params["itemUuid"]
              this.fetchFileData(itemUuid, bitstreamId)

              this.setupAccessExpirationTimer()
              this.setupPeriodicAccessCheck(bitstreamId)
            }

            // ✅ Step 3: Download permission
            this.bitstreamPermissionsService.canDownload(bitstreamId).subscribe({
              next: (canDownload) => {
                this.canDownloadFile = canDownload
              },
              error: (err) => {
                console.error("Error checking download permission:", err)
                this.canDownloadFile = false
              },
            })

            // ✅ Step 4: Print permission
            this.bitstreamPermissionsService.canPrint(bitstreamId).subscribe({
              next: (canPrint) => {
                this.canPrintFile = canPrint
                if (canPrint) {
                  document.body.classList.add("can-print")
                } else {
                  document.body.classList.remove("can-print")
                }
              },
              error: (err) => {
                console.error("Error checking print permission:", err)
                this.canPrintFile = false
                document.body.classList.remove("can-print")
              },
              complete: () => {
                this.checkingPermissions = false
                this.cdr.detectChanges()
              },
            })
          },
          error: (err) => {
            console.error("Error checking time-based access:", err)
            this.hasTimeAccess = false
            this.timeAccessStatus = {
              hasAccess: false,
              message: "Error checking access permissions.",
              validUntil: null,
              validFrom: null,
            }
            this.checkingPermissions = false
            this.cdr.detectChanges()
          },
        })
      },
      error: (err) => {
        console.error("Error fetching bitstream permissions:", err)
        this.checkingPermissions = false
        this.cdr.detectChanges()
      },
    })
  }

  setupAccessExpirationTimer(): void {
    // Clear any existing timer
    if (this.accessExpirationTimer) {
      this.accessExpirationTimer.unsubscribe()
      this.accessExpirationTimer = null
    }

    // If we have an expiration time, set up a timer to check when access expires
    if (this.timeAccessStatus?.validUntil) {
      const now = new Date()
      const expirationTime = this.timeAccessStatus.validUntil
      const timeUntilExpiration = expirationTime.getTime() - now.getTime()

      if (timeUntilExpiration > 0) {
        console.log(`Setting up access expiration timer for ${timeUntilExpiration}ms`)

        // Set up timer to check access when it expires
        this.accessExpirationTimer = interval(timeUntilExpiration).subscribe(() => {
          console.log("Access expiration timer triggered")
          this.checkFilePermissions(this.currentBitstreamId)
        })
      }
    }
  }

  setupPeriodicAccessCheck(bitstreamId: string): void {
    // Clear any existing interval
    if (this.accessCheckInterval) {
      this.accessCheckInterval.unsubscribe()
      this.accessCheckInterval = null
    }

    // Set up periodic check (every minute) to ensure access is still valid
    this.accessCheckInterval = interval(60000).subscribe(() => {
      console.log("Periodic access check triggered")
      this.bitstreamPermissionsService.checkTimeAccess(bitstreamId).subscribe({
        next: (accessStatus) => {
          // If access status has changed, update UI
          if (this.hasTimeAccess !== accessStatus.hasAccess) {
            this.timeAccessStatus = accessStatus
            this.hasTimeAccess = accessStatus.hasAccess

            if (!this.hasTimeAccess) {
              // Access has been revoked, clean up resources
              if (this.fileUrl && this.fileUrl.startsWith("blob:")) {
                this.pdfService.revokeBlobUrl(this.fileUrl)
                this.fileUrl = ""
              }
              this.pdfDoc = null
            }

            this.cdr.detectChanges()
          }
        },
      })
    })
  }

  fetchMetadataFromApi(uuid: string): void {
    this.metadataApiService.getItemByUuid(uuid).subscribe({
      next: (res) => {
        const metadataMap: { [key: string]: string } = {}
        const apiMetadata = res.metadata

        // First, extract all metadata into a map, excluding the specified fields
        for (const key in apiMetadata) {
          if (apiMetadata.hasOwnProperty(key) && !this.excludedFields.includes(key)) {
            const values = apiMetadata[key]
            const combinedValue = values.map((v: any) => v.value).join(", ")
            metadataMap[key] = combinedValue
          }
        }

        // Then create the metadata array in the specified order
        const orderedMetadata: { name: string; value: string }[] = []

        // First add the ordered keys
        this.orderedMetadataKeys.forEach((key) => {
          if (metadataMap[key]) {
            orderedMetadata.push({
              name: this.customMetadataLabels[key] || key,
              value: metadataMap[key],
            })
          }
        })

        // Then add any remaining metadata not in the ordered list and not excluded
        for (const key in metadataMap) {
          if (!this.orderedMetadataKeys.includes(key)) {
            orderedMetadata.push({
              name: this.customMetadataLabels[key] || key,
              value: metadataMap[key],
            })
          }
        }

        this.metadata = orderedMetadata

        // Log the processed metadata
        console.log("Processed metadata:", this.metadata)

        // Log each metadata field individually for better readability
        console.log("Metadata fields:")
        this.metadata.forEach((item) => {
          console.log(`${item.name}: ${item.value}`)
        })

        this.cdr.detectChanges()
      },
      error: (err) => {
        console.error("Error fetching metadata from API", err)
      },
    })
  }

  goBack(): void {
    this.location.back()
  }

  fetchFileData(itemUuid: string, bitstreamUuid: string): void {
    this.videoError = false; // Reset error state on new file
    this.loadComments(bitstreamUuid)

    this.signpostingService.getLinks(itemUuid).subscribe((links) => {
      if (links && links.length > 0) {
        const fileItem = links.find((item) => item.rel === "item" && item.href.includes(bitstreamUuid))

        if (fileItem) {
          this.fileType = fileItem.type
          const lowerUrl = fileItem.href.toLowerCase()

          // Improved file type detection
          this.isPdfFile = this.fileType === "application/pdf" || lowerUrl.endsWith(".pdf")
          this.isImageFile = this.fileType.startsWith("image/") || [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".tiff", ".svg"].some(ext => lowerUrl.endsWith(ext))
          this.isVideoFile = this.fileType.startsWith("video/") || [".mp4", ".webm", ".ogg", ".mov", ".avi", ".mkv"].some(ext => lowerUrl.endsWith(ext))
          this.isAudioFile = this.fileType.startsWith("audio/") || [".mp3", ".wav", ".m4a", ".ogg", ".aac", ".flac"].some(ext => lowerUrl.endsWith(ext))

          // ✅ Load PDF via secure filtered-content endpoint
          if (this.isPdfFile) {
            this.fetchRestrictedPdf(bitstreamUuid) // Replaces direct fileUrl usage
          } else {
            this.fileUrl = fileItem.href
            this.cdr.detectChanges() // Moved here so it doesn't run before PDF blob is set
          }
        } else {
          console.error("❌ File with given bitstream UUID not found in signposting links")
        }
      } else {
        console.error("❌ No signposting links found for this item")
      }
    })
  }

  private fetchRestrictedPdf(bitstreamUuid: string): void {
    this.isLoading = true

    this.pdfService.fetchRestrictedPdf(bitstreamUuid).subscribe({
      next: (blob) => {
        const blobUrl = this.pdfService.createBlobUrl(blob)
        this.fileUrl = blobUrl
        this.loadPdf() // this uses fileUrl internally
        this.isLoading = false
        this.cdr.detectChanges()
      },
      error: (err) => {
        console.error("❌ Error fetching restricted PDF:", err)
        this.isLoading = false
        this.cdr.detectChanges()
      },
    })
  }

  loadPdf(): void {
    pdfjsLib
      .getDocument({ url: this.fileUrl })
      .promise.then((pdf) => {
        this.pdfDoc = pdf
        this.totalPages = pdf.numPages
        this.currentPage = 1
        this.renderAllPages()
        this.cdr.detectChanges()
      })
      .catch((err) => console.error("PDF loading error:", err))
  }

  renderAllPages(): void {
    const container = this.pdfContainer.nativeElement
    container.innerHTML = ""

    for (let pageNum = 1; pageNum <= this.totalPages; pageNum++) {
      this.pdfDoc.getPage(pageNum).then((page: any) => {
        const viewport = page.getViewport({ scale: this.zoomLevel })

        // Page container
        const pageContainer = document.createElement("div")
        pageContainer.classList.add("page-container")
        pageContainer.style.position = "relative"
        pageContainer.style.margin = "16px auto"
        pageContainer.dataset.pageNumber = pageNum.toString()
        pageContainer.style.width = `${viewport.width}px`
        pageContainer.style.height = `${viewport.height}px`

        // Canvas
        const canvas = document.createElement("canvas")
        canvas.width = viewport.width
        canvas.height = viewport.height
        const ctx = canvas.getContext("2d")!
        page.render({ canvasContext: ctx, viewport })

        pageContainer.appendChild(canvas)
        container.appendChild(pageContainer)

        // Text Layer
        page.getTextContent().then((textContent: any) => {
          const textLayerDiv = document.createElement("div")
          textLayerDiv.className = "textLayer"
          textLayerDiv.style.position = "absolute"
          textLayerDiv.style.top = "0"
          textLayerDiv.style.left = "0"
          textLayerDiv.style.height = `${viewport.height}px`
          textLayerDiv.style.width = `${viewport.width}px`
          textLayerDiv.style.pointerEvents = "none"

          pageContainer.appendChild(textLayerDiv)
          ;(pdfjsLib as any)
            .renderTextLayer({
              textContent,
              container: textLayerDiv,
              viewport,
              textDivs: [],
            })
            .promise.then(() => {
              const termToHighlight = this.searchText?.trim() || this.searchTerm?.trim()
              if (termToHighlight) {
                this.highlightMatches(textLayerDiv, termToHighlight)
              }
            })
        })
      })
    }
  }

  highlightMatches(textLayerDiv: HTMLElement, searchTerm: string): void {
    if (!searchTerm || searchTerm.trim() === "") return

    const normalizedSearch = searchTerm.trim().replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")
    const regex = new RegExp(normalizedSearch, "gi")

    // Remove old highlights
    const oldHighlights = textLayerDiv.querySelectorAll("span mark.highlight-search")
    oldHighlights.forEach((mark) => {
      const parent = mark.parentNode as HTMLElement
      if (parent) {
        parent.replaceChild(document.createTextNode(mark.textContent || ""), mark)
        parent.normalize()
      }
    })

    const spans = textLayerDiv.querySelectorAll("span")
    spans.forEach((span) => {
      const text = span.textContent || ""
      if (!regex.test(text)) return

      // Reset regex state for reuse
      regex.lastIndex = 0

      const frag = document.createDocumentFragment()
      let lastIndex = 0
      let match: RegExpExecArray | null

      while ((match = regex.exec(text)) !== null) {
        const start = match.index
        const end = start + match[0].length

        // Add unhighlighted text
        if (lastIndex < start) {
          frag.appendChild(document.createTextNode(text.slice(lastIndex, start)))
        }

        // Add highlighted match
        const highlight = document.createElement("mark")
        highlight.className = "highlight-search"
        highlight.textContent = match[0]
        frag.appendChild(highlight)

        lastIndex = end
      }

      // Add remaining text
      if (lastIndex < text.length) {
        frag.appendChild(document.createTextNode(text.slice(lastIndex)))
      }

      span.innerHTML = ""
      span.appendChild(frag)
    })
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++
      this.scrollToPage(this.currentPage)
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--
      this.scrollToPage(this.currentPage)
    }
  }

  scrollToPage(pageNumber: number): void {
    const container = this.pdfContainer.nativeElement
    const pages = container.querySelectorAll(".page-container")

    if (pages[pageNumber - 1]) {
      const offsetTop = (pages[pageNumber - 1] as HTMLElement).offsetTop
      container.scrollTo({ top: offsetTop - 20, behavior: "smooth" })
    }
  }

  updateCurrentPageOnScroll(): void {
    const container = this.pdfContainer.nativeElement
    const pages = Array.from(container.querySelectorAll(".page-container"))

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i] as HTMLElement
      const offsetTop = page.offsetTop
      const pageHeight = page.offsetHeight

      if (container.scrollTop < offsetTop + pageHeight / 2) {
        this.currentPage = i + 1
        this.cdr.detectChanges()
        break
      }
    }
  }

  ngAfterViewInit(): void {
    if (this.pdfContainer && this.pdfContainer.nativeElement) {
      this.pdfContainer.nativeElement.addEventListener("scroll", () => {
        this.updateCurrentPageOnScroll()
      })
    }
  }

  zoomIn(): void {
    this.zoomLevel += 0.2
    this.renderAllPages()
  }

  zoomOut(): void {
    if (this.zoomLevel > 0.5) {
      this.zoomLevel -= 0.2
      this.renderAllPages()
    }
  }

  toggleFullScreen(): void {
    const elem = document.querySelector(".file-container")
    if (elem && !document.fullscreenElement) {
      ;(elem as HTMLElement).requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  openInNewTab(): void {
    window.open(this.fileUrl, "_blank")
  }

  printFile(): void {
    if (!this.canPrintFile) {
      console.warn("Print permission denied")
      return
    }
    // Open the actual PDF in a new window and trigger print
    const pdfWindow = window.open(this.fileUrl, '_blank');
    if (pdfWindow) {
      // Wait for the PDF to load, then print
      const printListener = () => {
        pdfWindow.focus();
        pdfWindow.print();
        pdfWindow.removeEventListener('load', printListener);
      };
      pdfWindow.addEventListener('load', printListener);
    } else {
      alert('Popup blocked! Please allow popups for this site to print the PDF.');
    }
  }

  downloadFile(): void {
    if (!this.canDownloadFile) {
      console.warn("Download permission denied")
      return
    }

    // Default filename
    let fileName = "download.pdf"

    // Log the metadata to see what we're working with
    console.log("Current metadata array:", this.metadata)

    try {
      // Find metadata entries for case type, number, and year
      const caseTypeEntry = this.metadata.find((item) => item.name === "Case Type")
      const caseNumberEntry = this.metadata.find((item) => item.name === "Case Number")
      const caseYearEntry = this.metadata.find((item) => item.name === "Case Year")

      console.log("Found metadata entries:", {
        caseTypeEntry,
        caseNumberEntry,
        caseYearEntry,
      })

      // Extract values if entries exist
      const caseType = caseTypeEntry?.value?.trim() || ""
      const caseNumber = caseNumberEntry?.value?.trim() || ""
      const caseYear = caseYearEntry?.value?.trim() || ""

      console.log("Extracted values:", {
        caseType,
        caseNumber,
        caseYear,
      })

      // Only create custom filename if we have at least one piece of metadata
      if (caseType || caseNumber || caseYear) {
        // Create sanitized values for filename (remove special characters)
        const sanitizeCaseType = caseType.replace(/[^a-zA-Z0-9]/g, "")
        const sanitizeCaseNumber = caseNumber.replace(/[^a-zA-Z0-9]/g, "")
        const sanitizeCaseYear = caseYear.replace(/[^a-zA-Z0-9]/g, "")

        // Build filename parts array with available metadata
        const filenameParts = []
        if (sanitizeCaseType) filenameParts.push(sanitizeCaseType)
        if (sanitizeCaseNumber) filenameParts.push(sanitizeCaseNumber)
        if (sanitizeCaseYear) filenameParts.push(sanitizeCaseYear)

        // Join parts with underscore and add .pdf extension
        if (filenameParts.length > 0) {
          fileName = filenameParts.join("_") + ".pdf"
          console.log("Generated custom filename:", fileName)
        }
      } else {
        // If we couldn't find the standard metadata, try a more flexible approach
        console.log("Trying flexible metadata search...")

        // Look for any metadata that might contain case information
        const caseTypeAlt = this.findMetadataByPartialName("type")
        const caseNumberAlt = this.findMetadataByPartialName("number")
        const caseYearAlt = this.findMetadataByPartialName("year")

        console.log("Flexible search results:", {
          caseTypeAlt,
          caseNumberAlt,
          caseYearAlt,
        })

        if (caseTypeAlt || caseNumberAlt || caseYearAlt) {
          const sanitizeTypeAlt = (caseTypeAlt || "").replace(/[^a-zA-Z0-9]/g, "")
          const sanitizeNumberAlt = (caseNumberAlt || "").replace(/[^a-zA-Z0-9]/g, "")
          const sanitizeYearAlt = (caseYearAlt || "").replace(/[^a-zA-Z0-9]/g, "")

          const altParts = []
          if (sanitizeTypeAlt) altParts.push(sanitizeTypeAlt)
          if (sanitizeNumberAlt) altParts.push(sanitizeNumberAlt)
          if (sanitizeYearAlt) altParts.push(sanitizeYearAlt)

          if (altParts.length > 0) {
            fileName = altParts.join("_") + ".pdf"
            console.log("Generated alternative filename:", fileName)
          }
        }
      }
    } catch (error) {
      console.error("Error generating filename:", error)
    }

    console.log("Final download filename:", fileName)

    // Proceed with download using the generated filename
    fetch(this.fileUrl)
      .then((res) => {
        if (!res.ok) throw new Error("Network response was not ok")
        return res.blob()
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = fileName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      })
      .catch((err) => {
        console.error("Download error:", err)
      })
  }

  // Helper method to find metadata by partial name match (case insensitive)
  findMetadataByPartialName(partialName: string): string {
    const lowerPartialName = partialName.toLowerCase()

    // Find any metadata entry where the name contains the partial name
    const entry = this.metadata.find((item) => item.name.toLowerCase().includes(lowerPartialName))

    return entry?.value?.trim() || ""
  }

  imageZoomLevel = 1.0

  imageZoomIn(): void {
    this.imageZoomLevel += 0.2
  }

  imageZoomOut(): void {
    if (this.imageZoomLevel > 0.4) {
      this.imageZoomLevel -= 0.2
    }
  }

  downloadImage(): void {
    if (!this.canDownloadFile) {
      console.warn("Download permission denied")
      return
    }

    const img = new Image()
    img.crossOrigin = "anonymous"
    img.src = this.fileUrl

    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext("2d")
      ctx?.drawImage(img, 0, 0)

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = this.fileUrl.split("/").pop() || "image.jpg"
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
        }
      }, "image/jpeg")
    }

    img.onerror = () => {
      console.error("Image failed to load. Cannot download.")
    }
  }

  openImageInNewTab(): void {
    window.open(this.fileUrl, "_blank")
  }

  toggleImageFullScreen(): void {
    const elem = document.querySelector(".image-container")
    if (elem && !document.fullscreenElement) {
      ;(elem as HTMLElement).requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  toggleSearch(): void {
    this.isSearchVisible = !this.isSearchVisible
    this.cdr.detectChanges()
    if (this.isSearchVisible) {
      setTimeout(() => {
        const searchInput = document.getElementById("pdf-search-input")
        if (searchInput) {
          searchInput.focus()
        }
      }, 100)
    }
  }

  onSearchInput(event: Event): void {
    this.searchText = (event.target as HTMLInputElement).value
  }

  clearSearch(): void {
    this.searchText = ""
    this.searchResults = []
    this.currentSearchIndex = -1

    const container = this.pdfContainer?.nativeElement
    if (!container) return

    const textLayers = container.querySelectorAll(".textLayer")

    textLayers.forEach((layer) => {
      const oldMarks = layer.querySelectorAll("mark.highlight-search")
      oldMarks.forEach((mark) => {
        const parent = mark.parentNode
        if (parent) {
          parent.replaceChild(document.createTextNode(mark.textContent || ""), mark)
          parent.normalize()
        }
      })
    })

    this.cdr.detectChanges()
  }

  searchPdf(): void {
    if (!this.searchText.trim() || !this.pdfDoc) return

    this.searchResults = []
    this.currentSearchIndex = -1

    const searchPromises = []

    for (let i = 1; i <= this.totalPages; i++) {
      searchPromises.push(
        this.pdfDoc.getPage(i).then((page: any) => {
          return page.getTextContent().then((textContent: any) => {
            const text = textContent.items.map((item: any) => item.str).join(" ")
            const regex = new RegExp(this.searchText, "gi")
            let match

            while ((match = regex.exec(text)) !== null) {
              this.searchResults.push({
                pageNum: i,
                position: match.index,
                text: match[0],
              })
            }
          })
        }),
      )
    }

    Promise.all(searchPromises).then(() => {
      if (this.searchResults.length > 0) {
        this.currentSearchIndex = 0

        // 👇 First render all pages, THEN scroll to first match
        this.renderAllPages()

        // 👇 Wait for rendering to complete before scrolling
        setTimeout(() => {
          this.navigateToSearchResult(0)
        }, 300) // Delay ensures DOM is ready
      }

      this.cdr.detectChanges()
    })
  }

  navigateToSearchResult(index: number): void {
    if (index >= 0 && index < this.searchResults.length) {
      const result = this.searchResults[index]
      this.currentSearchIndex = index

      const container = this.pdfContainer.nativeElement
      const pageContainers = container.querySelectorAll(".page-container")
      const targetPage = pageContainers[result.pageNum - 1] as HTMLElement

      if (targetPage) {
        container.scrollTo({
          top: targetPage.offsetTop - 50,
          behavior: "smooth",
        })

        const oldActives = container.querySelectorAll(".highlight-search.active")
        oldActives.forEach((el) => el.classList.remove("active"))

        const textLayers = container.querySelectorAll(".textLayer")
        textLayers.forEach((layer) => {
          this.highlightMatches(layer as HTMLElement, this.searchText)
        })

        const currentTextLayer = targetPage.querySelector(".textLayer")
        if (currentTextLayer) {
          const matches = currentTextLayer.querySelectorAll(".highlight-search")
          if (matches.length > 0) {
            ;(matches[0] as HTMLElement).classList.add("active")
          }
        }
      }
    }
  }

  nextSearchResult(): void {
    if (this.currentSearchIndex < this.searchResults.length - 1) {
      this.navigateToSearchResult(this.currentSearchIndex + 1)
    }
  }

  prevSearchResult(): void {
    if (this.currentSearchIndex > 0) {
      this.navigateToSearchResult(this.currentSearchIndex - 1)
    }
  }

  downloadVideo(): void {
    if (!this.canDownloadFile) {
      console.warn("Download permission denied")
      return
    }

    fetch(this.fileUrl)
      .then((res) => {
        if (!res.ok) throw new Error("Network response was not ok")
        return res.blob()
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = this.fileUrl.split("/").pop() || "video.mp4"
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      })
      .catch((err) => {
        console.error("Download error:", err)
      })
  }

  openVideoInNewTab(): void {
    window.open(this.fileUrl, "_blank")
  }

  openAudioInNewTab(): void {
    window.open(this.fileUrl, "_blank")
  }

  downloadAudio(): void {
    if (!this.canDownloadFile) {
      console.warn("Download permission denied")
      return
    }

    fetch(this.fileUrl)
      .then((res) => {
        if (!res.ok) throw new Error("Network response was not ok")
        return res.blob()
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = this.fileUrl.split("/").pop() || "audio.mp3"
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      })
      .catch((err) => {
        console.error("Download error:", err)
      })
  }

  ngOnDestroy() {
    localStorage.removeItem("pdfSearchTerm")

    if (this.fileUrl && this.fileUrl.startsWith("blob:")) {
      this.pdfService.revokeBlobUrl(this.fileUrl)
    }

    document.body.classList.remove("can-print")

    if (this.accessExpirationTimer) {
      this.accessExpirationTimer.unsubscribe()
    }

    if (this.accessCheckInterval) {
      this.accessCheckInterval.unsubscribe()
    }
  }

  loadComments(bitstreamId: string): void {
    this.bitstreamCommentService.getComments(bitstreamId).subscribe({
      next: (res) => {
        this.comments = res
        this.cdr.detectChanges()
      },
      error: (err) => console.error("Failed to load comments", err),
    })
  }

  addComment(): void {
    const comment = this.newCommentText.trim()
    if (!comment || this.isAddingComment) return

    this.isAddingComment = true

    const newComment: BitstreamComment = {
      bitstreamId: this.currentBitstreamId,
      comment: comment,
    }

    this.bitstreamCommentService.addComment(newComment).subscribe({
      next: (res) => {
        this.comments.push(res)
        this.newCommentText = ""
        this.isAddingComment = false
        this.cdr.detectChanges()
      },
      error: (err) => {
        console.error("Failed to add comment", err)
        this.isAddingComment = false
        this.cdr.detectChanges()
      },
    })
  }

  // ✅ Custom confirmation modal methods
  confirmDelete(commentId: number): void {
    this.commentToDelete = commentId
    this.showDeleteConfirmation = true
  }

  cancelDelete(): void {
    this.showDeleteConfirmation = false
    this.commentToDelete = null
  }

  confirmDeleteComment(): void {
    if (this.commentToDelete === null) return
    
    this.deletingCommentId = this.commentToDelete
    this.showDeleteConfirmation = false
    
    this.bitstreamCommentService.deleteComment(this.commentToDelete).subscribe({
      next: () => {
        this.comments = this.comments.filter((c) => c.id !== this.commentToDelete)
        this.deletingCommentId = null
        this.commentToDelete = null
        this.cdr.detectChanges()
      },
      error: (err) => {
        console.error("Delete failed", err)
        this.deletingCommentId = null
        this.commentToDelete = null
        this.cdr.detectChanges()
      },
    })
  }

  toggleMetadataPanel() {
    this.isMetadataMinimized = !this.isMetadataMinimized;
  }

  toggleCommentPanel() {
    this.isCommentMinimized = !this.isCommentMinimized;
  }

  maximizePdfView() {
    this.isMetadataMinimized = true;
    this.isCommentMinimized = true;
  }

  restorePanels() {
    this.isMetadataMinimized = false;
    this.isCommentMinimized = false;
  }

  onVideoError(event: Event): void {
    this.videoError = true;
    console.error('Video failed to load:', this.fileUrl, event);
  }
}