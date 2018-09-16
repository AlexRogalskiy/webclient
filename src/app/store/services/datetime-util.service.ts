import { Injectable } from '@angular/core';
import { NgbDateStruct, NgbTimeStruct } from '@ng-bootstrap/ng-bootstrap';
import { Store } from '@ngrx/store';
import * as moment from 'moment-timezone';
import { AppState, UserState } from '../datatypes';

@Injectable()
export class DateTimeUtilService {
  readonly ISO8601_DATETIME_FORMAT = 'YYYY-MM-DDTHH:mm:ss.SSSZ';
  readonly preDefinedFormats = {
    'short': 'M/D/YY, h:mm A',
    'medium': 'MMM D, YYYY, h:mm:ss A',
    'long': 'MMMM D, YYYY, h:mm:ss A Z',
    'full': 'dddd, MMMM D, YYYY, h:mm:ss A Z',
    'shortDate': 'M/D/YY',
    'mediumDate': 'MMM D, YYYY',
    'longDate': 'MMMM D, YYYY',
    'fullDate': 'dddd, MMMM D, YYYY',
    'shortTime': 'h:mm A',
    'mediumTime': 'h:mm:ss A',
    'longTime': 'h:mm:ss A Z',
    'fullTime': 'h:mm:ss A Z'
  };

  private timezone: string;

  constructor(private store: Store<AppState>) {
    this.store.select(state => state.user)
      .subscribe((user: UserState) => {
        if (user.settings && user.settings.timezone !== this.timezone) {
          this.timezone = user.settings.timezone;
          if (this.timezone) {
            moment.tz.setDefault(this.timezone);
          } else {
            moment.tz.setDefault(); // set user's local timezone as default
          }
        }
      });
  }

  createDateTimeStrFromNgbDateTimeStruct(date: NgbDateStruct, time: NgbTimeStruct): string {
    return moment([date.year, date.month - 1, date.day, time.hour, time.minute, time.second])
      .utc()
      .format(this.ISO8601_DATETIME_FORMAT);
  }

  createDateTimeFromNgbDateTimeStruct(date: NgbDateStruct, time: NgbTimeStruct): moment.Moment {
    return moment([date.year, date.month - 1, date.day, time.hour, time.minute, time.second]).utc();
  }

  getNgbDateTimeStructsFromDateTimeStr(dateTimeStr: string): { date: NgbDateStruct, time: NgbTimeStruct } {
    const datetime = moment(dateTimeStr);
    if (datetime) {
      return {
        date: {
          year: datetime.year(),
          month: datetime.month(),
          day: datetime.date()
        },
        time: {
          hour: datetime.hour(),
          minute: datetime.minute(),
          second: datetime.second()
        }
      };
    }
    else {
      return { date: null, time: null };
    }
  }

  isDateTimeInPast(dateTimeStr: string): boolean {
    return moment().diff(moment(dateTimeStr)) >= 0;
  }

  getDiffFromCurrentDateTime(dateTimeStr: string, unit?: any): number {
    return moment(dateTimeStr).diff(moment(), unit);
  }

  getDiffToCurrentDateTime(dateTimeStr: string, unit?: any): number {
    return moment().diff(moment(dateTimeStr), unit);
  }
}
