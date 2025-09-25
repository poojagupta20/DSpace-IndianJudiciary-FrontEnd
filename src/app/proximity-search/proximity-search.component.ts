import { Component, OnInit } from "@angular/core";
import { BehaviorSubject } from "rxjs"; 
import { ProximitySearchService } from "../core/serachpage/proximity-search.service";
import { FreeTextService } from "../core/serachpage/free-text.service";

@Component({
  selector: "app-proximity-search",
  templateUrl: "./proximity-search.component.html",
  styleUrls: ["./proximity-search.component.scss"],
})
export class ProximitySearchComponent implements OnInit {
  private caseListSubject = new BehaviorSubject<any[]>([]);
  caseList$ = this.caseListSubject.asObservable();

  // Search mode: 'wildcard' or 'proximity'
  mode: 'wildcard' | 'proximity' = 'wildcard';

  // Query fields for both modes
  wildcardQuery = '*';
  proximityQuery = '"JUSTICE ROUTRAY"~3';
  sortBy = "dc.title";
  sortOrder = "ASC";
  resultsPerPage = 10;
  startDate = "";
  endDate = "";
  page = 0;

  constructor(
    private proximitySearchService: ProximitySearchService,
    private freeTextService: FreeTextService
  ) {}

  ngOnInit() {
    this.fetchCases();
  }

  // Toggle between Wildcard and Proximity search modes
  setMode(mode: 'wildcard' | 'proximity') {
    this.mode = mode;
    this.fetchCases();
  }

  onSearchClick() {
    this.fetchCases();
  }

  onSortChange(field: string) {
    this.sortBy = field;
    this.page = 0;
    this.fetchCases();
  }

  fetchCases() {
    if (this.mode === 'wildcard') {
      this.freeTextService
        .getDateSearchResults(
          this.wildcardQuery,
          this.startDate,
          this.endDate,
          this.sortBy,
          this.sortOrder,
          this.resultsPerPage
        )
        .subscribe((response) => {
          this.loadCases(response);
        });
    } else {
      this.proximitySearchService
        .getProximitySearchResults(
          this.proximityQuery,
          this.sortBy,
          this.sortOrder,
          this.resultsPerPage,
          this.startDate,
          this.endDate
        )
        .subscribe((response) => {
          this.loadCases(response);
        });
    }
  }

  loadCases(response: any) {
    const objects = response?._embedded?.searchResult?._embedded?.objects || [];
    const caseList = objects
      .map((obj: any) => {
        const indexableObject = obj?._embedded?.indexableObject;
        return {
          uuid: indexableObject?.uuid,
          metadata: indexableObject?.metadata,
        };
      })
      .filter((item: any) => item.uuid && item.metadata?.["dc.casetype"]?.[0]?.value);
    this.caseListSubject.next(caseList);
  }
} 