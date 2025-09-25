import { Component, OnInit } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { ProximitySearchService } from "../core/serachpage/proximity-search.service";

@Component({
  selector: "app-proximity-search",
  templateUrl: "./proximity-search.component.html",
  styleUrls: ["./proximity-search.component.scss"],
})
export class ProximitySearchComponent implements OnInit {
  private caseListSubject = new BehaviorSubject<any[]>([]);
  caseList$ = this.caseListSubject.asObservable();

  proximityQuery = '"JUSTICE ROUTRAY"~3';
  sortBy = "dc.title";
  sortOrder = "ASC";
  resultsPerPage = 10;
  startDate = "";
  endDate = "";
  page = 0;

  constructor(private proximitySearchService: ProximitySearchService) {}

  ngOnInit() {
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