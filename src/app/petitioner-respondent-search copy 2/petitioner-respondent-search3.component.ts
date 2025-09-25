import { Component } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms'; 
import { PetitionerRespondentSearchService } from '../core/serachpage/petitioner-respondent-search.service';

@Component({
  selector: 'app-petitioner-respondent-search3',
  templateUrl: './petitioner-respondent-search3.component.html',
  styleUrls: ['./petitioner-respondent-search3.component.scss']
})
export class PetitionerRespondentSearchComponent3 {
  searchForm: FormGroup;
  respondents: any[] = [];
  isLoading = false;
  errorMessage = '';
  paginationOptions = { pageSize: 20, page: 0 };

  // Controls visibility of petitioner/respondent input fields
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

  // Toggle Petitioner Input
  togglePetitionerInput() {
    this.showPetitionerInput = !this.showPetitionerInput;
    if (!this.showPetitionerInput) {
      this.searchForm.get('petitionerName')?.reset();
    }
  }

  // Toggle Respondent Input
  toggleRespondentInput() {
    this.showRespondentInput = !this.showRespondentInput;
    if (!this.showRespondentInput) {
      this.searchForm.get('respondentName')?.reset();
    }
  }

  // Search Function
  search() {
    const petitionerQuery = this.searchForm.value.petitionerName?.trim();
    const respondentQuery = this.searchForm.value.respondentName?.trim();

    if (!petitionerQuery && !respondentQuery) {
      this.respondents = [];
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.searchService.searchRespondents(
      petitionerQuery || respondentQuery, 
      this.paginationOptions.page, 
      this.paginationOptions.pageSize
    ).subscribe(
      (data) => {
        this.isLoading = false;
        this.respondents = data._embedded?.entries || [];
      },
      (error) => {
        this.isLoading = false;
        this.errorMessage = 'Error fetching data';
        console.error('Error:', error);
      }
    );
  }

  // Populate Petitioner Input When Clicked
  selectPetitioner(value: string) {
    this.searchForm.patchValue({ petitionerName: value });
    this.showPetitionerInput = true; // Ensure input is shown
  }

  // Populate Respondent Input When Clicked
  selectRespondent(value: string) {
    this.searchForm.patchValue({ respondentName: value });
    this.showRespondentInput = true; // Ensure input is shown
  }

  clearSearch() {
    this.searchForm.reset();
    this.showPetitionerInput = false;
    this.showRespondentInput = false;
    this.respondents = [];
  }
}
