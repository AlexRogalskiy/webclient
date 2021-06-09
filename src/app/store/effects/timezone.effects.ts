import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { TimezoneActionTypes, TimezoneGet, TimezoneGetSuccess } from '../actions/timezone.action';
import { TimezoneService } from '../services/timezone.service';
import { SnackErrorPush } from '../actions';
@Injectable({
  providedIn: 'root',
})
export class TimezoneEffects {
  constructor(private actions: Actions, private timezoneService: TimezoneService) {}

  @Effect()
  getTimezones: Observable<any> = this.actions.pipe(
    ofType(TimezoneActionTypes.TIMEZONE_GET),
    map((action: TimezoneGet) => action.payload),
    switchMap(() => {
      return this.timezoneService.getTimezones().pipe(
        map(timezones => {
          return new TimezoneGetSuccess(timezones);
        }),
        catchError(() => of(new SnackErrorPush({ message: 'Failed to get timezones.' }))),
      );
    }),
  );
}
