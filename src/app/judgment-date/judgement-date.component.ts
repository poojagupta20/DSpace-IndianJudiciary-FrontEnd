import { Component, OnInit } from '@angular/core'; 
import { BehaviorSubject } from 'rxjs';
import { JudgementDateService } from '../core/serachpage/search-date.service';

@Component({
  selector: 'app-search-page',
  templateUrl: './judgement-date.component.html',
  styleUrls: ['./judgement-date.component.scss']
})
export class JudgementDateComponent implements OnInit {
  private caseListSubject = new BehaviorSubject<any[]>([]);
  caseList$ = this.caseListSubject.asObservable();

  caseNumber: string = '';
  caseType: string = '';
  caseYear: string = '';
  startDate: string = '';  // Capture Start Date
  endDate: string = '';    // Capture End Date
  sortBy: string = 'dc.title';
  sortOrder: string = 'ASC';
  resultsPerPage: number = 10;
  page: 0;

  constructor(private searchPageService: JudgementDateService) {}

  ngOnInit() {
    this.fetchCases();
  }

  fetchCases() {
    this.searchPageService.getDateSearchResults(
      this.startDate, 
      this.endDate, 
      this.sortBy, 
      this.sortOrder, 
      this.resultsPerPage
    ).subscribe(response => {
      console.log(response);
      this.loadCases(response);
    });
  }

  loadCases(response: any) {
    const objects = response?._embedded?.searchResult?._embedded?.objects || [];
  
    const caseList = objects
      .map(obj => {
        const indexableObject = obj?._embedded?.indexableObject;
        return {
          uuid: indexableObject?.uuid,
          metadata: indexableObject?.metadata
        };
      })
      .filter(item => item.uuid && item.metadata?.['dc.casetype']?.[0]?.value);
  
    console.log('✅ Processed Case List:', caseList);
    this.caseListSubject.next(caseList);
  }
  onSortChange(field: string) {
    this.sortBy = field;
    this.page = 0;
    this.fetchCases();
  }

  onSortOrderChange(order: string) {
    this.sortOrder = order === 'descending' ? 'DESC' : 'ASC';
    this.page = 0;
    this.fetchCases();
  }
  onResultsPerPageChange(count: string) {
    this.resultsPerPage = +count; // Convert to number
    this.page = 0;
    this.fetchCases();
  }
    

  onDateChange() {
    this.fetchCases();  // Fetch cases when the date fields change
  }
}
