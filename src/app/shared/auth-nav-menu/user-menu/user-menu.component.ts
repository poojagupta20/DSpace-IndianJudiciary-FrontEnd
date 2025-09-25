import {
  AsyncPipe,
  NgClass,
  NgIf,
} from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import {
  RouterLink,
  RouterLinkActive,
} from '@angular/router';
import {
  select,
  Store,
} from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { Observable } from 'rxjs';

import { AppState } from '../../../app.reducer';
import {
  getProfileModuleRoute,
  getSubscriptionsModuleRoute,
} from '../../../app-routing-paths';
import { AuthService } from '../../../core/auth/auth.service';
import { isAuthenticationLoading } from '../../../core/auth/selectors';
import { DSONameService } from '../../../core/breadcrumbs/dso-name.service';
import { EPerson } from '../../../core/eperson/models/eperson.model';
import { MYDSPACE_ROUTE } from '../../../my-dspace-page/my-dspace-page.component';
import { ThemedLoadingComponent } from '../../loading/themed-loading.component';
import { LogOutComponent } from '../../log-out/log-out.component';
import { AuthorizationDataService } from '../../../core/data/feature-authorization/authorization-data.service';
import { SiteDataService } from '../../../core/data/site-data.service';
import { switchMap } from 'rxjs/operators';
import { Site } from '../../../core/shared/site.model';
import { FeatureID } from '../../../core/data/feature-authorization/feature-id';

/**
 * This component represents the user nav menu.
 */
@Component({
  selector: 'ds-base-user-menu',
  templateUrl: './user-menu.component.html',
  styleUrls: ['./user-menu.component.scss'],
  standalone: true,
  imports: [NgIf, ThemedLoadingComponent, RouterLinkActive, NgClass, RouterLink, LogOutComponent, AsyncPipe, TranslateModule],
  
})
export class UserMenuComponent implements OnInit {

  /**
   * The input flag to show user details in navbar expandable menu
   */
  @Input() inExpandableNavbar = false;

  /**
   * Emits an event when the route changes
   */
  @Output() changedRoute: EventEmitter<any> = new EventEmitter<any>();

  /**
   * True if the authentication is loading.
   * @type {Observable<boolean>}
   */
  public loading$: Observable<boolean>;

  /**
   * The authenticated user.
   * @type {Observable<EPerson>}
   */
  public user$: Observable<EPerson>;

  /**
   * The mydspace page route.
   * @type {string}
   */
  public mydspaceRoute = MYDSPACE_ROUTE;

  /**
   * The profile page route
   */
  public profileRoute = getProfileModuleRoute();


  public isAdmin$: Observable<boolean>;


  /**
   * The profile page route
   */
  public subscriptionsRoute = getSubscriptionsModuleRoute();

  constructor(
    protected store: Store<AppState>,
    protected authService: AuthService,
    public dsoNameService: DSONameService,
    private authorizationService: AuthorizationDataService,
    private siteDataService: SiteDataService


  ) {
  }

  /**
   * Initialize all instance variables
   */
  ngOnInit(): void {

    // set loading
    this.loading$ = this.store.pipe(select(isAuthenticationLoading));

    // set user
    this.user$ = this.authService.getAuthenticatedUserFromStore();

    

    // this.isAdmin$ = this.siteDataService.find().pipe(
    //   switchMap((site: Site) =>
    //     this.authorizationService.isAuthorized(
    //       FeatureID.AdministratorOf,
    //       site._links.self.href
    //     )
    //   )
    // );
    
    this.isAdmin$ = this.siteDataService.find().pipe(
      switchMap((site: Site) =>
        this.authorizationService.isAuthorized(
          FeatureID.AdministratorOf,
          site._links.self.href
        )
      )
    );
    
    
        
    
    
    
    
    

  }

  /**
   * Emits an event when the menu item is clicked
   */
  onMenuItemClick() {
    this.changedRoute.emit();
  }
}
