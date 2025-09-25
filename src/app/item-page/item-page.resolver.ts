import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  ResolveFn,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { AppState } from '../app.reducer';
import { AuthService } from '../core/auth/auth.service';
import { ItemDataService } from '../core/data/item-data.service';
import { RemoteData } from '../core/data/remote-data';
import { ResolvedAction } from '../core/resolving/resolver.actions';
import { redirectOn4xx } from '../core/shared/authorized.operators';
import { Item } from '../core/shared/item.model';
import { getFirstCompletedRemoteData } from '../core/shared/operators';
import { hasValue } from '../shared/empty.util';
import { getItemPageLinksToFollow } from './item.resolver';
import { getItemPageRoute } from './item-page-routing-paths';


export const itemPageResolver: ResolveFn<RemoteData<Item>> = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
  router: Router = inject(Router),
  itemService: ItemDataService = inject(ItemDataService),
  store: Store<AppState> = inject(Store<AppState>),
  authService: AuthService = inject(AuthService),
): Observable<RemoteData<Item>> => {
  const itemRD$ = itemService.findById(
    route.params.id,
    true,
    false,
    ...getItemPageLinksToFollow(),
  ).pipe(
    getFirstCompletedRemoteData(),
    redirectOn4xx(router, authService),
  );

  itemRD$.subscribe((itemRD: RemoteData<Item>) => {
    store.dispatch(new ResolvedAction(state.url, itemRD.payload));
  });

  return itemRD$.pipe(
    map((rd: RemoteData<Item>) => {
      if (rd.hasSucceeded && hasValue(rd.payload)) {
        const thisRoute = state.url;
        const itemRoute = router.parseUrl(getItemPageRoute(rd.payload)).toString();

        if (!thisRoute.startsWith(itemRoute)) {
          const itemId = rd.payload.uuid;
          const subRoute = thisRoute.substring(thisRoute.indexOf(itemId) + itemId.length, thisRoute.length);
          void router.navigateByUrl(itemRoute + subRoute);
        }
      }
      return rd;
    }),
  );
};
