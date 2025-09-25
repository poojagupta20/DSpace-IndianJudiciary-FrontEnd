import { Component, OnInit } from '@angular/core';
import { SearchPageService } from '../core/serachpage/search-page.service';
import { BehaviorSubject } from 'rxjs';
import { FacetsService } from '../core/serachpage/casetype.service';

@Component({
  selector: 'app-search-page',
  templateUrl: './search-page.component.html',
  styleUrls: ['./search-page.component.scss']
})
export class SearchPageComponent implements OnInit {
  private caseListSubject = new BehaviorSubject<any[]>([]);
  caseList$ = this.caseListSubject.asObservable();

  caseNumber: string = '';
  caseType: string = '';
  caseYear: string = '';
  sortBy: string = 'dc.title'; // Default sorting field
  sortOrder: string = 'ASC'; // Default sorting order
  resultsPerPage: number = 10; // Default results per page
  caseTypeOptions: string[] = [];

  constructor(private searchPageService: SearchPageService , private facetsService: FacetsService) {}

  ngOnInit() {
    this.fetchCases();
    this.loadCaseTypeOptions();
  }

  fetchCases() {
    this.searchPageService.getSearchResults(
      this.caseNumber, 
      this.caseType, 
      this.caseYear, 
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

  loadCaseTypeOptions() {
    this.facetsService.getCaseTypeFacets().subscribe(
      (response) => {
        this.caseTypeOptions = response?._embedded?.values?.map(val => val.label) || [];
        console.log('📌 Loaded Case Type Options:', this.caseTypeOptions);
      },
      (error) => {
        console.error('❌ Failed to load case type facets:', error);
      }
    );
  }
  
  

  searchCases() {
    this.fetchCases();
  }

  resetForm() {
    this.caseNumber = '';
    this.caseType = '';
    this.caseYear = '';
    this.sortBy = 'dc.title';
    this.sortOrder = 'ASC';
    this.resultsPerPage = 10;
    this.fetchCases();
  }
}
