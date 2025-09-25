import { Component, OnInit } from '@angular/core'; 
import { BehaviorSubject } from 'rxjs';   
import { JudegNameService } from '../core/serachpage/judgename.service';

@Component({
  selector: 'judge-name-page',
  templateUrl: './judgename.component.html',
  styleUrls: ['./judgename.component.scss']
})
export class JudgeNameComponent implements OnInit {
  private caseListSubject = new BehaviorSubject<any[]>([]);
  caseList$ = this.caseListSubject.asObservable();
 
  judgeName: string = '';
  sortBy: string = 'dc.title'; // Default sorting field
  sortOrder: string = 'ASC'; // Default sorting order
  resultsPerPage: number = 10; // Default results per page
 

  constructor(private searchPageService: JudegNameService  ) {}

  ngOnInit() {
    this.fetchCases(); 
  }

  fetchCases() {
    this.searchPageService.getSearchResults(
   
      this.judgeName, 
      this.sortBy, 
      this.sortOrder, 
      this.resultsPerPage
    ).subscribe(
      (response) => {
        console.log('🔹 API Response:', response);
        this.loadCases(response);
      },
      (error) => {
        console.error('❌ Error fetching cases:', error);
      }
    );
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
  
 
  searchCases() {
    this.fetchCases();
  }

  resetForm() { 
    this.judgeName = '';
    this.sortBy = 'dc.title';
    this.sortOrder = 'ASC';
    this.resultsPerPage = 10;
    this.fetchCases();
  }
}
