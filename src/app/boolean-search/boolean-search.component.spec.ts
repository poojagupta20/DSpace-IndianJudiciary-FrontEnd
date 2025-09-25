import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BooleanSearchComponent } from './boolean-search.component';
import { FormsModule } from '@angular/forms';
import { SearchPageService } from '../core/serachpage/search-page.service';
import { of } from 'rxjs';

describe('BooleanSearchComponent', () => {
  let component: BooleanSearchComponent;
  let fixture: ComponentFixture<BooleanSearchComponent>;
  let mockService: any;

  beforeEach(async () => {
    mockService = { getSearchResultsWithFilters: jasmine.createSpy().and.returnValue(of({ _embedded: { searchResult: { _embedded: { objects: [] } } } })) };
    await TestBed.configureTestingModule({
      declarations: [BooleanSearchComponent],
      imports: [FormsModule],
      providers: [
        { provide: SearchPageService, useValue: mockService }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(BooleanSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should add a filter', () => {
    component.newFilter = { field: 'dc.title', operator: 'equals', value: '123' };
    component.addFilter();
    expect(component.filters.length).toBe(1);
  });

  it('should remove a filter', () => {
    component.filters = [{ field: 'dc.title', operator: 'equals', value: '123' }];
    component.removeFilter(0);
    expect(component.filters.length).toBe(0);
  });

  it('should call search service on search', () => {
    component.filters = [{ field: 'dc.title', operator: 'equals', value: '123' }];
    component.search();
    expect(mockService.getSearchResultsWithFilters).toHaveBeenCalled();
  });
}); 