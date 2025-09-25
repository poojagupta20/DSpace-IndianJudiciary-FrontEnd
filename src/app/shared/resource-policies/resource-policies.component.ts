import {
  AsyncPipe,
  NgForOf,
  NgIf,
} from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  Input,
  OnDestroy,
  OnInit,
} from '@angular/core';
import {
  ActivatedRoute,
  Router,
  NavigationEnd,
} from '@angular/router';
import {
  TranslateModule,
  TranslateService,
} from '@ngx-translate/core';
import {
  BehaviorSubject,
  from as observableFrom,
  Observable,
  Subscription,
  of,
  timer,
} from 'rxjs';
import {
  concatMap,
  distinctUntilChanged,
  filter,
  map,
  reduce,
  scan,
  take,
  catchError,
  finalize,
  delay,
} from 'rxjs/operators';

import { DSONameService } from '../../core/breadcrumbs/dso-name.service';
import { RequestService } from '../../core/data/request.service';
import { EPersonDataService } from '../../core/eperson/eperson-data.service';
import { GroupDataService } from '../../core/eperson/group-data.service';
import { ResourcePolicy } from '../../core/resource-policy/models/resource-policy.model';
import { ResourcePolicyDataService } from '../../core/resource-policy/resource-policy-data.service';
import { getAllSucceededRemoteData } from '../../core/shared/operators';
import { BtnDisabledDirective } from '../btn-disabled.directive';
import {
  hasValue,
  isEmpty,
  isNotEmpty,
} from '../empty.util';
import { NotificationsService } from '../notifications/notifications.service';
import { followLink } from '../utils/follow-link-config.model';
import {
  ResourcePolicyCheckboxEntry,
  ResourcePolicyEntryComponent,
} from './entry/resource-policy-entry.component';

@Component({
  selector: 'ds-resource-policies',
  styleUrls: ['./resource-policies.component.scss'],
  templateUrl: './resource-policies.component.html',
  imports: [
    ResourcePolicyEntryComponent,
    TranslateModule,
    NgIf,
    AsyncPipe,
    NgForOf,
    BtnDisabledDirective,
  ],
  standalone: true,
})
/**
 * Component that shows the policies for given resource
 */
export class ResourcePoliciesComponent implements OnInit, OnDestroy {

  /**
   * The resource UUID
   * @type {string}
   */
  @Input() public resourceUUID: string;

  /**
   * The resource type (e.g. 'item', 'bundle' etc) used as key to build automatically translation label
   * @type {string}
   */
  @Input() public resourceType: string;

  /**
   * The resource name
   * @type {string}
   */
  @Input() public resourceName: string;

  /**
   * A boolean representing if component is active
   * @type {boolean}
   */
  private isActive: boolean;

  /**
   * A boolean representing if a submission delete operation is pending
   * @type {BehaviorSubject<boolean>}
   */
  private processingDelete$ = new BehaviorSubject<boolean>(false);

  /**
   * The list of policies for given resource
   * @type {BehaviorSubject<ResourcePolicyCheckboxEntry[]>}
   */
  private resourcePoliciesEntries$: BehaviorSubject<ResourcePolicyCheckboxEntry[]> =
    new BehaviorSubject<ResourcePolicyCheckboxEntry[]>([]);
    
  /**
   * Flag to indicate if data is currently loading
   * @type {BehaviorSubject<boolean>}
   */
  private loading$ = new BehaviorSubject<boolean>(false);
  
  /**
   * Flag to track if a refresh is already in progress
   */
  private refreshInProgress = false;

  /**
   * Array to track all subscriptions and unsubscribe them onDestroy
   * @type {Array}
   */
  private subs: Subscription[] = [];
  
  /**
   * Timestamp of the last refresh
   */
  public lastRefreshTime: Date = null;
  
  /**
   * Counter for refresh attempts
   */
  private refreshAttempts = 0;
  
  /**
   * Maximum number of refresh attempts
   */
  private maxRefreshAttempts = 3;

  /**
   * Initialize instance variables
   *
   * @param {ChangeDetectorRef} cdr
   * @param {DSONameService} dsoNameService
   * @param {EPersonDataService} ePersonService
   * @param {GroupDataService} groupService
   * @param {NotificationsService} notificationsService
   * @param {RequestService} requestService
   * @param {ResourcePolicyDataService} resourcePolicyService
   * @param {ActivatedRoute} route
   * @param {Router} router
   * @param {TranslateService} translate
   */
  constructor(
    private cdr: ChangeDetectorRef,
    private dsoNameService: DSONameService,
    private ePersonService: EPersonDataService,
    private groupService: GroupDataService,
    private notificationsService: NotificationsService,
    private requestService: RequestService,
    private resourcePolicyService: ResourcePolicyDataService,
    private route: ActivatedRoute,
    private router: Router,
    private translate: TranslateService,
  ) {
  }

  /**
   * Initialize the component, setting up the resource's policies
   */
  ngOnInit(): void {
    
    this.isActive = true;
    
    
    // Clear caches on initialization
    this.clearCaches();
    
    // Initial load of resource policies with a slight delay to ensure caches are cleared
    timer(100).subscribe(() => {
      this.loadResourcePolicies();
    });
    
    // Listen for navigation events to refresh data when returning to this component
    this.subs.push(
      this.router.events.pipe(
        filter(event => event instanceof NavigationEnd)
      ).subscribe(() => {
        console.log('Navigation detected, refreshing resource policies');
        
        // Clear caches and load data with a slight delay to ensure caches are cleared
        this.clearCaches();
        timer(100).subscribe(() => {
          this.loadResourcePolicies();
        });
      })
    );
  }
  
  /**
   * Clear caches related to resource policies, epersons, and groups
   */
  private clearCaches(): void {
    try {
      // Clear cache for resource policies
      this.requestService.setStaleByHrefSubstring('/api/authz/resourcepolicies');
      
      // Clear cache for eperson and group endpoints
      this.requestService.setStaleByHrefSubstring('/api/eperson/epersons');
      this.requestService.setStaleByHrefSubstring('/api/eperson/groups');
      
      console.log('Cleared caches for resource policies, epersons, and groups');
    } catch (error) {
      console.error('Error clearing caches:', error);
    }
  }

  /**
   * Check if there are any selected resource's policies to be deleted
   *
   * @return {Observable<boolean>}
   */
  canDelete(): Observable<boolean> {
    return observableFrom(this.resourcePoliciesEntries$.value).pipe(
      filter((entry: ResourcePolicyCheckboxEntry) => entry.checked),
      reduce((acc: any, value: any) => [...acc, value], []),
      map((entries: ResourcePolicyCheckboxEntry[]) => isNotEmpty(entries)),
      distinctUntilChanged(),
    );
  }

  /**
   * Delete the selected resource's policies
   */
  deleteSelectedResourcePolicies(): void {
    this.processingDelete$.next(true);
    const policiesToDelete: ResourcePolicyCheckboxEntry[] = this.resourcePoliciesEntries$.value
      .filter((entry: ResourcePolicyCheckboxEntry) => entry.checked);
    this.subs.push(
      observableFrom(policiesToDelete).pipe(
        concatMap((entry: ResourcePolicyCheckboxEntry) => this.resourcePolicyService.delete(entry.policy.id)),
        scan((acc: any, value: any) => [...acc, value], []),
        filter((results: boolean[]) => results.length === policiesToDelete.length),
        take(1),
        finalize(() => this.processingDelete$.next(false))
      ).subscribe({
        next: (results: boolean[]) => {
          const failureResults = results.filter((result: boolean) => !result);
          if (isEmpty(failureResults)) {
            this.notificationsService.success(null, this.translate.get('resource-policies.delete.success.content'));
            
            // Refresh the list after successful deletion
            this.refreshResourcePolicies();
          } else {
            this.notificationsService.error(null, this.translate.get('resource-policies.delete.failure.content'));
          }
        },
        error: (error) => {
          console.error('Error deleting policies:', error);
          this.notificationsService.error(null, this.translate.get('resource-policies.delete.error.content'));
        }
      }),
    );
  }

  /**
   * Return all resource's policies
   *
   * @return an observable that emits all resource's policies
   */
  getResourcePolicies(): Observable<ResourcePolicyCheckboxEntry[]> {
    return this.resourcePoliciesEntries$.asObservable();
  }
  
  /**
   * Check if data is currently loading
   * 
   * @return an observable that emits the loading state
   */
  isLoading(): Observable<boolean> {
    return this.loading$.asObservable();
  }

  /**
   * Load the resource's policies list with fresh data
   */
  loadResourcePolicies() {
    // If a refresh is already in progress, don't start another one
    if (this.refreshInProgress) {
      console.log('Refresh already in progress, skipping');
      return;
    }
    
    console.log('Loading resource policies with fresh data');
    
    // Set loading state and refresh flag
    this.loading$.next(true);
    this.refreshInProgress = true;
    
    
    // Create a new subscription for loading the data
    const subscription = this.resourcePolicyService.searchByResource(
      this.resourceUUID, 
      null, 
      false, 
      true,
      followLink('eperson'), 
      followLink('group'),
    ).pipe(
      filter(() => this.isActive),
      getAllSucceededRemoteData(),
      take(1), // Take only one result to avoid multiple subscriptions
      catchError(error => {
        console.error('Error loading resource policies:', error);
        
        // Increment refresh attempts
        this.refreshAttempts++;
        
        // If we haven't reached max attempts, try again after a delay
        if (this.refreshAttempts < this.maxRefreshAttempts) {
          console.log(`Retry attempt ${this.refreshAttempts} of ${this.maxRefreshAttempts}`);
          
          // Try again after a delay
          timer(1000).subscribe(() => {
            this.refreshInProgress = false;
            this.loadResourcePolicies();
          });
        } else {
          // Reset attempts counter
          this.refreshAttempts = 0;
          
          // Show error notification
          this.notificationsService.error(null, this.translate.get('resource-policies.load.error.content'));
          
          // Return empty array to prevent the observable from breaking
          return of({ payload: { page: [] } });
        }
        
        // Return empty array to prevent the observable from breaking
        return of({ payload: { page: [] } });
      }),
      finalize(() => {
        // Always reset loading state and refresh flag when done
        this.loading$.next(false);
        this.refreshInProgress = false;
        
        // Reset attempts counter on success
        this.refreshAttempts = 0;
      })
    ).subscribe(result => {
      console.log('Resource policies loaded:', result.payload.page.length);
      
      const entries = result.payload.page.map((policy: ResourcePolicy) => {
        return {
          id: policy.id,
          policy: policy,
          checked: false,
        };
      });
      
      this.resourcePoliciesEntries$.next(entries);
      this.lastRefreshTime = new Date();
      
      // Force change detection to update the view
      this.cdr.detectChanges();
      console.log('Resource policies view updated at', this.lastRefreshTime);
    });
    
    this.subs.push(subscription);
  }

  /**
   * Initialize the resource's policies list (legacy method kept for compatibility)
   */
  initResourcePolicyList() {
    this.refreshResourcePolicies();
  }

  /**
   * Return a boolean representing if a delete operation is pending
   *
   * @return {Observable<boolean>}
   */
  isProcessingDelete(): Observable<boolean> {
    return this.processingDelete$.asObservable();
  }

  /**
   * Redirect to resource policy creation page
   */
  redirectToResourcePolicyCreatePage(): void {
    this.router.navigate([`./create`], {
      relativeTo: this.route,
      queryParams: {
        policyTargetId: this.resourceUUID,
        targetType: this.resourceType,
      },
    });
  }
  
  /**
   * Redirect to the edit page for a bitstream
   */
  redirectToBitstreamEditPage(): void {
    if (this.resourceType === 'bitstream' && this.resourceUUID) {
      this.router.navigate([`/bitstreams/${this.resourceUUID}/edit`]);
    }
  }

  /**
   * Select/unselect all checkbox in the list
   */
  selectAllCheckbox(event: any): void {
    const checked = event.target.checked;
    this.resourcePoliciesEntries$.value.forEach((entry: ResourcePolicyCheckboxEntry) => entry.checked = checked);
  }

  /**
   * Select/unselect checkbox
   */
  selectCheckbox(policyEntry: ResourcePolicyCheckboxEntry, checked: boolean) {
    policyEntry.checked = checked;
  }
  
  /**
   * Manually refresh the resource policies
   */
  refreshResourcePolicies(): void {
    console.log('Refreshing resource policies');
    
    // Clear all caches first
    this.clearCaches();
    
    // Then load the data with a slight delay to ensure caches are cleared
    timer(100).subscribe(() => {
      this.loadResourcePolicies();
    });
  }

  /**
   * Unsubscribe from all subscriptions
   */
  ngOnDestroy(): void {
    this.isActive = false;
    this.resourcePoliciesEntries$ = null;
    this.loading$.next(false);
    this.refreshInProgress = false;
    this.subs
      .filter((subscription) => hasValue(subscription))
      .forEach((subscription) => subscription.unsubscribe());
  }
}