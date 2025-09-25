import { Pipe, type PipeTransform } from "@angular/core"
import type { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser"

/**
 * Pipe to sanitize and mark URLs as safe for use in resource contexts like iframe src
 */
@Pipe({
  name: "safeResourceUrl",
  standalone: true,
})
export class SafeResourceUrlPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url)
  }
}

