import { Component, OnInit } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { SearchPageService } from '../core/serachpage/search-page.service';
import { FacetsService } from '../core/serachpage/casetype.service';

@Component({
  selector: 'app-cataloging-metadata-search',
  templateUrl: './cataloging-metadata-search.component.html',
  styleUrls: ['./cataloging-metadata-search.component.scss']
})
export class CatalogingMetadataSearchComponent implements OnInit {
  private caseListSubject = new BehaviorSubject<any[]>([]);
  caseList$ = this.caseListSubject.asObservable();

  searchQuery: string = '';
  searchOperator: 'AND' | 'OR' = 'OR'; // Default to OR for broader results
  sortBy: string = 'dc.title';
  sortOrder: string = 'ASC';
  resultsPerPage: number = 10;

  constructor(private searchPageService: SearchPageService, private facetsService: FacetsService) {}

  ngOnInit() {
    this.fetchCases();
  }

  searchCases() {
    this.fetchCases();
  }

  resetForm() {
    this.searchQuery = '';
    this.searchOperator = 'OR';
    this.sortBy = 'dc.title';
    this.sortOrder = 'ASC';
    this.resultsPerPage = 10;
    this.fetchCases();
  }

  toggleOperator() {
    this.searchOperator = this.searchOperator === 'OR' ? 'AND' : 'OR';
    this.fetchCases();
  }

  onSortChange(value: string) {
    this.sortBy = value;
    this.fetchCases();
  }

  onSearchClick() {
    this.fetchCases();
  }

  fetchCases() {
    // Use the search query as a general search term across all metadata fields
    // Split the query into individual terms for more flexible searching
    const searchTerms = this.searchQuery.trim().split(/\s+/).filter(term => term.length > 0);
    
    // Create a combined search query that searches across all fields
    let combinedQuery = '';
    if (searchTerms.length > 0) {
      // Create search terms with intelligent wildcard handling
      const processedTerms = searchTerms.map(term => this.processSearchTerm(term));
      // Join terms with the selected operator (AND or OR)
      combinedQuery = processedTerms.join(` ${this.searchOperator} `);
    }

    // Use the search service with the combined query
    this.searchPageService.getSearchResultsWithFilters(
      this.buildSearchParams(combinedQuery)
    ).subscribe((response) => {
      this.loadCases(response);
    });
  }

  private processSearchTerm(term: string): string {
    // Remove any existing wildcards from user input
    const cleanTerm = term.replace(/\*/g, '');
    
    if (!cleanTerm) return '';
    
    // Check if the term is numeric (works better with wildcards)
    const isNumeric = /^\d+$/.test(cleanTerm);
    
    // Check if the term is short (less than 3 characters)
    const isShort = cleanTerm.length < 3;
    
    if (isNumeric || isShort) {
      // For numbers and short terms, use wildcards for better matching
      return `*${cleanTerm}*`;
    } else {
      // For longer text terms, use multiple search strategies to avoid leading wildcard issues
      // This creates a more flexible search that should find partial matches
      return `(${cleanTerm} OR *${cleanTerm} OR ${cleanTerm}*)`;
    }
  }

  private buildSearchParams(query: string): any {
    let params: any = {
      'sort': `${this.sortBy},${this.sortOrder}`,
      'size': this.resultsPerPage.toString()
    };

    if (query && query.trim()) {
      params['query'] = query;
    }

    return params;
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
      .filter((item: any) => item.uuid && item.metadata?.['dc.casetype']?.[0]?.value);
    this.caseListSubject.next(caseList);
  }
} 