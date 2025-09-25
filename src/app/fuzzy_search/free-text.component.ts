import { Component, type OnInit } from "@angular/core"
import { BehaviorSubject } from "rxjs" 
import { FuzzyServiceService } from "../core/serachpage/fuzzy.service"

@Component({
  selector: "app-search-page",
  templateUrl: "./free-text.component.html",
  styleUrls: ["./free-text.component.scss"],
})
export class FuzzySearchComponent implements OnInit {
  private caseListSubject = new BehaviorSubject<any[]>([])
  caseList$ = this.caseListSubject.asObservable()

  freeTextQuery = "" // Free text search input
  sortBy = "dc.title"
  sortOrder = "ASC"
  resultsPerPage = 10
  startDate = ""
  endDate = ""
  page = 0

  constructor(private searchPageService: FuzzyServiceService) {}

  ngOnInit() {
    this.freeTextQuery = "~" // Load default results with fuzzy search
    this.fetchCases()
  }

  onSearchClick() {
    this.fetchCases()
  }

  onSortChange(field: string) {
    this.sortBy = field
    this.page = 0
    this.fetchCases()
  }

  fetchCases() {
    this.searchPageService
      .getDateSearchResults(
        this.freeTextQuery,
        this.startDate,
        this.endDate,
        this.sortBy,
        this.sortOrder,
        this.resultsPerPage,
      )
      .subscribe((response) => {
        this.loadCases(response)
      })
  }

  storeSearchTerm() {
    if (this.freeTextQuery && this.freeTextQuery !== "~") {
      localStorage.setItem("pdfSearchTerm", this.freeTextQuery)
    } else {
      localStorage.removeItem("pdfSearchTerm")
    }
  }

  loadCases(response: any) {
    const objects = response?._embedded?.searchResult?._embedded?.objects || []

    const caseList = objects
      .map((obj) => {
        const indexableObject = obj?._embedded?.indexableObject
        return {
          uuid: indexableObject?.uuid,
          metadata: indexableObject?.metadata,
        }
      })
      .filter((item) => item.uuid && item.metadata?.["dc.casetype"]?.[0]?.value)

    console.log("✅ Processed Case List:", caseList)
    this.caseListSubject.next(caseList)
  }
}
