import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';
import { PetitionerRespondentSearchService } from '../core/serachpage/petitioner-respondent-search.service';

@Component({
  selector: 'app-petitioner-respondent-search',
  templateUrl: './petitioner-respondent-search.component.html',
  styleUrls: ['./petitioner-respondent-search.component.scss']
})
export class PetitionerRespondentSearchComponent implements OnInit {
  searchForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  results: any[] = [];
  page = 0;
  size = 10;
  sortBy = 'dc.title';
  sortOrder = 'ASC';
  totalPages = 0;
  resultsPerPage = 10;

  petitionerResults: any[] = [];
  respondentResults: any[] = [];
  
  // 👇 New: Track which field is active
  activeField: 'petitioner' | 'respondent' | null = null;


  caseListSubject: BehaviorSubject<any[]> = new BehaviorSubject<any[]>([]);
  caseList$ = this.caseListSubject.asObservable();

  showPetitionerInput = false;
  showRespondentInput = false;

  constructor(
    private fb: FormBuilder,
    private searchService: PetitionerRespondentSearchService
  ) {
    this.searchForm = this.fb.group({
      petitionerName: [''],
      respondentName: ['']
    });
  }

  ngOnInit() {
    // Optional: load default cases
    this.fetchCases();
  }

  togglePetitionerInput() {
    this.showPetitionerInput = !this.showPetitionerInput;
    this.activeField = this.showPetitionerInput ? 'petitioner' : null;
    if (!this.showPetitionerInput) {
      this.searchForm.get('petitionerName')?.reset();
    }
  }

  toggleRespondentInput() {
    this.showRespondentInput = !this.showRespondentInput;
    this.activeField = this.showRespondentInput ? 'respondent' : null;
    if (!this.showRespondentInput) {
      this.searchForm.get('respondentName')?.reset();
    }
  }

  searchPetitioner() {
    const query = this.searchForm.value.petitionerName?.trim();
    if (!query) { this.petitionerResults = []; return; }
  
    this.isLoading = true;
    this.searchService.searchPetitioners(query, 0, 20).subscribe(
      data => {
        this.isLoading = false;
        this.petitionerResults = data._embedded?.entries || [];
      },
      error => {
        this.isLoading = false;
        this.errorMessage = 'Error fetching petitioner data';
      }
    );
  }
  
  searchRespondent() {
    const query = this.searchForm.value.respondentName?.trim();
    if (!query) { this.respondentResults = []; return; }
  
    this.isLoading = true;
    this.searchService.searchRespondents(query, 0, 20).subscribe(
      data => {
        this.isLoading = false;
        this.respondentResults = data._embedded?.entries || [];
      },
      error => {
        this.isLoading = false;
        this.errorMessage = 'Error fetching respondent data';
      }
    );
  }

  fetchCases() {
    const petitioner = this.searchForm.value.petitionerName?.trim() || '';
    const respondent = this.searchForm.value.respondentName?.trim() || '';
  
    this.searchService
      .searchCombined(petitioner, respondent, this.page, this.size, this.sortBy, this.sortOrder ,  this.resultsPerPage,)
      .subscribe(
        response => {
          this.isLoading = false;
          this.totalPages = response?.page?.totalPages || 0;
          this.loadCases(response);
        },
        error => {
          this.isLoading = false;
          this.errorMessage = 'Error fetching combined search results';
          console.error(error);
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
  

  
  selectPetitioner(value: string) {
    this.searchForm.patchValue({ petitionerName: value });
    this.petitionerResults = [];
  }
  
  selectRespondent(value: string) {
    this.searchForm.patchValue({ respondentName: value });
    this.respondentResults = [];
  }
  
  
  onCombinedSearchClick() {
    this.page = 0; // reset to first page
    this.fetchCases();
  }

  onCombinedSearchClick1() {
    this.page = 0;
    this.fetchCases();
  }

    // 👇 New: smart suggestion selector
 selectSuggestion(value: string) {
   if (this.activeField === 'petitioner') {
     this.selectPetitioner(value);
   } else if (this.activeField === 'respondent') {
     this.selectRespondent(value);
   }
 }

  
  onSortChange(field: string) {
    this.sortBy = field;
    this.page = 0;
    this.fetchCases();
  }
  
  onSortOrderChange(order: string) {
    this.sortOrder = order;
    this.page = 0;
    this.fetchCases();
  }
  
  onPageChange(delta: number) {
    this.page += delta;
    if (this.page < 0) this.page = 0;
    if (this.page >= this.totalPages) this.page = this.totalPages - 1;
    this.fetchCases();
  }
  
  clearSearch() {
    this.searchForm.reset();
    this.showPetitionerInput = false;
    this.showRespondentInput = false;
    this.results = [];
    this.caseListSubject.next([]); // Clear combined results
    this.activeField = null;
  }
}
