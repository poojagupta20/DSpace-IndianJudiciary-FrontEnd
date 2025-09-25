import { Pipe, type PipeTransform } from "@angular/core"
import type { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser"

@Pipe({
  name: "safe",
  standalone: true,
})
export class SafePipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url)
  }
}

