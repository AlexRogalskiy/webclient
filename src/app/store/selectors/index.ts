import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import * as fromRouter from '@ngrx/router-store';
import { Injectable } from '@angular/core';

import { RouterStateUrl } from '../datatypes';

@Injectable({
  providedIn: 'root',
})
export class CustomSerializer implements fromRouter.RouterStateSerializer<RouterStateUrl> {
  serialize(routerState: RouterStateSnapshot): RouterStateUrl {
    const { url, root } = routerState;
    const { queryParams } = root;

    let state: ActivatedRouteSnapshot = root;
    while (state.firstChild) {
      state = state.firstChild;
    }
    const { params } = state;

    return { url, queryParams, params, state };
  }
}
