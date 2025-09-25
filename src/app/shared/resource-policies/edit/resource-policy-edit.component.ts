import {
  Component,
  OnInit,
} from '@angular/core';
import {
  ActivatedRoute,
  Router,
} from '@angular/router';
import {
  TranslateModule,
  TranslateService,
} from '@ngx-translate/core';
import {
  BehaviorSubject,
  combineLatest as observableCombineLatest,
  Observable,
  of,
} from 'rxjs';
import {
  map,
  switchMap,
  take,
} from 'rxjs/operators';

import { RemoteData } from '../../../core/data/remote-data';
import { ResourcePolicy } from '../../../core/resource-policy/models/resource-policy.model';
import { RESOURCE_POLICY } from '../../../core/resource-policy/models/resource-policy.resource-type';
import { ResourcePolicyDataService } from '../../../core/resource-policy/resource-policy-data.service';
import { getFirstCompletedRemoteData } from '../../../core/shared/operators';
import { ITEM_EDIT_AUTHORIZATIONS_PATH } from '../../../item-page/edit-item-page/edit-item-page.routing-paths';
import { NotificationsService } from '../../notifications/notifications.service';
import {
  ResourcePolicyEvent,
  ResourcePolicyFormComponent,
} from '../form/resource-policy-form.component';
import { ResourcePolicyPermissionsService } from 'src/app/core/serachpage/resource-policy-permissions.service';
import { RequestService } from 'src/app/core/data/request.service'; 
import { PolicyEntity, ResourcePolicyEntityService } from 'src/app/core/serachpage/resource-policytype.service';
@Component({
  selector: "ds-resource-policy-edit",
  templateUrl: "./resource-policy-edit.component.html",
  imports: [ResourcePolicyFormComponent, TranslateModule],
  standalone: true,
})
export class ResourcePolicyEditComponent implements OnInit {
  /**
   * The resource policy object to edit
   */
  public resourcePolicy: ResourcePolicy

  /**
   * A boolean representing if a submission editing operation is pending
   * @type {BehaviorSubject<boolean>}
   */
  private processing$ = new BehaviorSubject<boolean>(false)

  /**
   * The entity (eperson or group) associated with this policy
   */
  private policyEntity: PolicyEntity = null;
    
  /**
   * The bitstream ID from the route parameters
   */
  private bitstreamId: string;

  /**
   * Initialize instance variables
   *
   * @param {NotificationsService} notificationsService
   * @param {ResourcePolicyDataService} resourcePolicyService
   * @param {ActivatedRoute} route
   * @param {Router} router
   * @param {TranslateService} translate
   * @param {ResourcePolicyPermissionsService} resourcePolicyPermissionsService
   * @param {RequestService} requestService
   * @param {ResourcePolicyEntityService} policyEntityService
   */
  constructor(
    private notificationsService: NotificationsService,
    private resourcePolicyService: ResourcePolicyDataService,
    private route: ActivatedRoute,
    private router: Router,
    private translate: TranslateService,
    private resourcePolicyPermissionsService: ResourcePolicyPermissionsService,
    private requestService: RequestService,
    private policyEntityService: ResourcePolicyEntityService
  ) {}

  /**
   * Initialize the component
   * Ensure we load fresh data by clearing any cached requests first
   */
  ngOnInit(): void {
    this.route.parent.params.pipe(take(1)).subscribe(params => {
      if (params['id']) {
        this.bitstreamId = params['id'];
        console.log("Bitstream ID from route params:", this.bitstreamId);
      } else {
        console.warn("Bitstream ID not found in route params");
      }
    });

    // Get the resource policy from the route data
    this.route.params.pipe(
      take(1),
      map(params => params['id']),
      switchMap(routeId => {
        // Clear any cached requests for this resource policy
        if (routeId) {
          this.requestService.removeByHrefSubstring(`/api/authz/resourcepolicies/${routeId}`);
        }
        
        // Now get the data from the route
        return this.route.data;
      }),
      take(1),
    ).subscribe((data: any) => {
      this.resourcePolicy = (data.resourcePolicy as RemoteData<ResourcePolicy>).payload;
      console.log("Loaded resource policy:", this.resourcePolicy);
      
      // Now that we have the resource policy, use its ID to determine the entity type
      if (this.resourcePolicy && this.resourcePolicy.id) {
        this.policyEntityService.determineEntityType(this.resourcePolicy.id.toString()).subscribe(entity => {
          this.policyEntity = entity;
          console.log("Determined policy entity:", this.policyEntity);
        });
      }
    });
  }

  /**
   * Return a boolean representing if an operation is pending
   *
   * @return {Observable<boolean>}
   */
  isProcessing(): Observable<boolean> {
    return this.processing$.asObservable()
  }

  /**
   * Redirect to the authorizations page
   */
  redirectToAuthorizationsPage() {
    this.router.navigate([`../../${ITEM_EDIT_AUTHORIZATIONS_PATH}`], { relativeTo: this.route })
    // this.router.navigate([`/bitstreams/${this.bitstreamId}/edit`]);
  }

  /**
   * Update a resource policy
   *
   * @param event The {{ResourcePolicyEvent}} emitted
   */
  updateResourcePolicy(event: ResourcePolicyEvent) {
    this.processing$.next(true)

    // Create a complete updated object for the standard PUT API
    const updatedObject = Object.assign({}, this.resourcePolicy, event.object);
    
    // Ensure we have the correct type and links
    updatedObject.type = RESOURCE_POLICY;
    
    console.log("Updating resource policy with complete object:", updatedObject);
    console.log("Target information:", event.target);

    const updateTargetSucceeded$ = event.updateTarget
      ? this.resourcePolicyService
          .updateTarget(
            this.resourcePolicy.id,
            this.resourcePolicy._links.self.href,
            event.target.uuid,
            event.target.type,
          )
          .pipe(
            getFirstCompletedRemoteData(),
            map((responseRD) => {
              // Clear cache for this specific target update
              if (responseRD && responseRD.hasSucceeded) {
                this.requestService.removeByHrefSubstring(`/api/authz/resourcepolicies/${this.resourcePolicy.id}`);
                this.requestService.removeByHrefSubstring('/api/eperson/epersons');
                this.requestService.removeByHrefSubstring('/api/eperson/groups');
              }
              return responseRD && responseRD.hasSucceeded;
            }),
          )
      : of(true)

    // Create a plain JavaScript object with all the fields we want to send to the custom API
    const permissionsData: any = {
      // Include all fields from the updated object
      name: updatedObject.name,
      description: updatedObject.description,
      policyType: updatedObject.policyType,
      action: updatedObject.action,
      startDate: updatedObject.startDate,
      endDate: updatedObject.endDate,
      // Include the four special fields
      pageStart: updatedObject.pageStart,
      pageEnd: updatedObject.pageEnd,
      print: updatedObject.print,
      download: updatedObject.download
    };
    
    // If a new target is selected, use that
    if (event.updateTarget && event.target && event.target.type) {
      if (event.target.type === 'eperson') {
        permissionsData.eperson = event.target.uuid;
        // Don't include group field
      } else if (event.target.type === 'group') {
        permissionsData.group = event.target.uuid;
        // Don't include eperson field
      }
    } 
    // Otherwise use the current entity type and UUID
    else if (this.policyEntity) {
      if (this.policyEntity.type === 'eperson') {
        permissionsData.eperson = this.policyEntity.uuid;
        // Don't include group field
      } else if (this.policyEntity.type === 'group') {
        permissionsData.group = this.policyEntity.uuid;
        // Don't include eperson field
      }
    }
    // Fallback if we don't have entity information
    else {
      // Default to eperson=null if we couldn't determine the entity
      permissionsData.eperson = null;
    }
    
    console.log("Sending permissions data with eperson/group:", permissionsData);

    // Update the permissions via our custom API
    const updatePermissionsSucceeded$ = this.resourcePolicyPermissionsService
      .updatePermissions(this.resourcePolicy.id, permissionsData)
      .pipe(
        map(() => {
          // Clear cache after permissions update
          this.requestService.removeByHrefSubstring(`/api/authz/resourcepolicies/${this.resourcePolicy.id}`);
          return true;
        }), 
        take(1),
      )

    // Update the resource policy via the standard PUT API
    const updateResourcePolicySucceeded$ = this.resourcePolicyService.update(updatedObject).pipe(
      getFirstCompletedRemoteData(),
      map((responseRD) => {
        // Clear cache after resource policy update
        if (responseRD && responseRD.hasSucceeded) {
          this.requestService.removeByHrefSubstring(`/api/authz/resourcepolicies/${this.resourcePolicy.id}`);
        }
        return responseRD && responseRD.hasSucceeded;
      }),
    )

    // Combine all three operations
    observableCombineLatest([
      updateTargetSucceeded$,
      updatePermissionsSucceeded$,
      updateResourcePolicySucceeded$,
    ]).subscribe(([updateTargetSucceeded, updatePermissionsSucceeded, updateResourcePolicySucceeded]) => {
      this.processing$.next(false)

      if (updateTargetSucceeded && updatePermissionsSucceeded && updateResourcePolicySucceeded) {
        this.notificationsService.success(null, this.translate.get("resource-policies.edit.page.success.content"))
        this.redirectToAuthorizationsPage()
      } else {
        // Handle different failure scenarios
        if (!updatePermissionsSucceeded) {
          this.notificationsService.error(null, "Failed to update permissions (page restrictions, print, download)")
        }

        if (!updateResourcePolicySucceeded) {
          this.notificationsService.error(null, this.translate.get("resource-policies.edit.page.other-failure.content"))
        }

        if (!updateTargetSucceeded && event.updateTarget) {
          this.notificationsService.error(
            null,
            this.translate.get("resource-policies.edit.page.target-failure.content"),
          )
        }

        if (!updateTargetSucceeded && !updatePermissionsSucceeded && !updateResourcePolicySucceeded) {
          this.notificationsService.error(null, this.translate.get("resource-policies.edit.page.failure.content"))
        }
      }
    })
  }
}