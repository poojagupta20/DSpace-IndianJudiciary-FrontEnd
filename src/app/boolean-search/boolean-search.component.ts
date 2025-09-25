import { Component, OnInit } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { SearchPageService } from "../core/serachpage/search-page.service";
import { CollectionDataService } from '../core/data/collection-data.service';
import { Collection } from '../core/shared/collection.model';
import { HttpParams } from '@angular/common/http';

interface SearchFilter {
  field: string;
  operator: string;
  value: string;
}

interface SortableField {
  label: string;
  value: string;
}

@Component({
  selector: "app-boolean-search",
  templateUrl: "./boolean-search.component.html",
  styleUrls: ["./boolean-search.component.scss"],
})
export class BooleanSearchComponent implements OnInit {
  filters: SearchFilter[] = [];
  collections: Collection[] = [];
  selectedCollectionId: string = '';
  availableFields = [
    { label: 'Case Number', value: 'title' },
    { label: 'Judge Name', value: 'author' },
    { label: 'Case Year', value: 'dc_case_year' },
    { label: 'Case Type', value: 'dc_case_type' },
    { label: 'Petitioner Name', value: 'dc_party_firstpetitioner' },
    { label: 'Respondent Name', value: 'dc_party_firstrespondent' },
    { label: 'District', value: 'dc_case_district' },
    { label: 'Petitioner Advocate Name', value: 'dc_advocate_firstpetitioner' },
    { label: 'Respondent Advocate Name', value: 'dc_advocate_firstrespondent' },
    { label: 'Date of Case Disposal', value: 'dc_case_disposaldate' },
    { label: 'Batch Name', value: 'dc_case_batchnumber' },
    { label: 'Section', value: 'dc.section' },
  ];
  availableOperators = [
    { label: "Equals", value: "equals" },
    { label: "Not Equals", value: "notequals" },
    { label: "Contains", value: "contains" },
    { label: "Not Contains", value: "notcontains" },
  ];
  newFilter: SearchFilter = { field: "dc.title", operator: "equals", value: "" };
  results$ = new BehaviorSubject<any[]>([]);
  loading = false;
  error = "";

  // Pagination properties
  page = 0;
  size = 10;
  totalResults = 0;

  // Sorting properties
  sortField = "";
  sortDirection = "asc";
  sortableFields: SortableField[] = [
    { label: "Case Type", value: "dc.casetype" },
    { label: "Case Number", value: "dc.title" },
    { label: "Case Year", value: "dc.caseyear" },
    { label: "District", value: "dc.district" },
    { label: "Judge Name", value: "dc.contributor.author" },
    { label: "First Petitioner", value: "dc.pname" },
    { label: "First Respondent", value: "dc.rname" },
    { label: "Disposal Date", value: "dc.date.disposal" },
  ];

  constructor(private searchService: SearchPageService, private collectionDataService: CollectionDataService) {}

  ngOnInit() {
    this.collectionDataService.findAll({ elementsPerPage: 1000 }).subscribe(rd => {
      if (rd && rd.payload) {
        this.collections = rd.payload.page;
      }
    });
  }

  addFilter() {
    if (this.newFilter.value.trim()) {
      this.filters.push({ ...this.newFilter, field: this.newFilter.field });
      this.newFilter = { field: "title", operator: "equals", value: "" };
    }
  }

  removeFilter(index: number) {
    this.filters.splice(index, 1);
  }

  search() {
    this.loading = true;
    this.error = "";
    let httpParams = new HttpParams();
    this.filters.forEach((filter) => {
      httpParams = httpParams.append(`f.${filter.field}`, `${filter.value},${filter.operator}`);
    });
    httpParams = httpParams.set("page", this.page.toString());
    httpParams = httpParams.set("size", this.size.toString());
    // Add collection scope if selected
    if (this.selectedCollectionId) {
      httpParams = httpParams.set("scope", this.selectedCollectionId);
    }
    // Add sorting parameters
    if (this.sortField) {
      httpParams = httpParams.set("sort", `${this.sortField},${this.sortDirection}`);
    }
    this.searchService.getSearchResultsWithFilters(httpParams).subscribe({
      next: (response) => {
        const objects = response?._embedded?.searchResult?._embedded?.objects || [];
        const results = objects.map((obj: any) => obj?._embedded?.indexableObject);
        this.results$.next(results);
        this.totalResults = response?._embedded?.searchResult?.page?.totalElements || 0;
        this.loading = false;
      },
      error: (err) => {
        this.error = "Search failed.";
        this.loading = false;
      },
    });
  }

  // Sorting methods
  onSortChange() {
    if (this.filters.length > 0) {
      this.page = 0; // Reset to first page when sorting changes
      this.search();
    }
  }

  sortBy(field: string) {
    if (this.sortField === field) {
      // Toggle direction if same field
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // Set new field with default ascending direction
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    
    if (this.filters.length > 0) {
      this.page = 0; // Reset to first page when sorting changes
      this.search();
    }
  }

  // Enhanced pagination methods
  nextPage() {
    if ((this.page + 1) * this.size < this.totalResults) {
      this.page++;
      this.search();
    }
  }

  prevPage() {
    if (this.page > 0) {
      this.page--;
      this.search();
    }
  }

  firstPage() {
    if (this.page !== 0) {
      this.page = 0;
      this.search();
    }
  }

  lastPage() {
    const lastPage = Math.ceil(this.totalResults / this.size) - 1;
    if (this.page !== lastPage) {
      this.page = lastPage;
      this.search();
    }
  }

  goToPage(pageNum: number) {
    if (pageNum >= 0 && pageNum < this.getTotalPages()) {
      this.page = pageNum;
      this.search();
    }
  }

  onPageSizeChange() {
    this.page = 0; // Reset to first page when page size changes
    if (this.filters.length > 0) {
      this.search();
    }
  }

  getTotalPages(): number {
    return this.totalResults ? Math.ceil(this.totalResults / this.size) : 1;
  }

  getStartIndex(): number {
    return this.totalResults === 0 ? 0 : this.page * this.size + 1;
  }

  getEndIndex(resultsLength: number): number {
    return this.page * this.size + resultsLength;
  }

  getVisiblePageNumbers(): number[] {
    const totalPages = this.getTotalPages();
    const currentPage = this.page + 1;
    const pages: number[] = [];
    
    if (totalPages <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show current page, 2 before, 2 after, and first/last
      const start = Math.max(1, currentPage - 2);
      const end = Math.min(totalPages, currentPage + 2);
      
      if (start > 1) {
        pages.push(1);
        if (start > 2) {
          pages.push(-1); // Ellipsis placeholder
        }
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (end < totalPages) {
        if (end < totalPages - 1) {
          pages.push(-1); // Ellipsis placeholder
        }
        pages.push(totalPages);
      }
    }
    
    return pages.filter(p => p !== -1); // Remove ellipsis placeholders
  }

  getFieldLabel(fieldValue: string): string {
    const field = this.availableFields.find(f => f.value === fieldValue);
    return field ? field.label : fieldValue;
  }

  getOperatorLabel(operatorValue: string): string {
    const op = this.availableOperators.find(o => o.value === operatorValue);
    return op ? op.label : operatorValue;
  }

  resetFilters() {
    this.filters = [];
    this.newFilter = { field: "title", operator: "equals", value: "" };
    this.results$.next([]);
    this.page = 0;
    this.totalResults = 0;
    this.error = "";
    this.sortField = "";
    this.sortDirection = "asc";
  }
} 