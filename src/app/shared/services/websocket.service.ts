import { Injectable, OnDestroy } from '@angular/core';
import { Store } from '@ngrx/store';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

import { AppState, UserState, AuthState } from '../../store/datatypes';
import { WebSocketNewMessage } from '../../store/websocket.store';
import { Logout } from '../../store/actions';
import { Mail } from '../../store/models';
import { apiUrl } from '../config';

import { LoggerService } from './logger.service';

@UntilDestroy()
@Injectable({
  providedIn: 'root',
})
export class WebsocketService {
  private webSocket: WebSocket;

  private retryCount = 1;

  private userId: number = Date.now();

  private isAuthenticated = false;

  constructor(private store: Store<AppState>) {
    this.store
      .select(state => state.user)
      .pipe(untilDestroyed(this))
      .subscribe((userState: UserState) => {
        this.userId = userState.id ? userState.id : this.userId;
      });

    this.store
      .select(state => state.auth)
      .pipe(untilDestroyed(this))
      .subscribe((authState: AuthState) => {
        this.isAuthenticated = authState.isAuthenticated;
      });
  }

  public connect() {
    const url = `${apiUrl.replace('http', 'ws')}connect/?user_id=${this.userId}`;
    this.webSocket = new WebSocket(url);
    this.webSocket.onmessage = response => {
      const data = JSON.parse(response.data);
      if (data.logout === true || data.reason === 'INVALID_TOKEN') {
        this.disconnect();
        this.store.dispatch(new Logout(data));
      } else {
        this.store.dispatch(new WebSocketNewMessage(data));
      }
    };

    this.webSocket.onclose = e => {
      if (this.isAuthenticated) {
        LoggerService.log(
          `Socket is closed. Reconnect will be attempted in ${1000 + this.retryCount * 1000} second. ${e.reason}`,
        );
        setTimeout(() => {
          this.connect();
          this.retryCount += 1;
        }, 1000 + this.retryCount * 1000);
      } else {
        LoggerService.log('Socket is closed.');
      }
    };

    this.webSocket.addEventListener('error', (error: any) => {
      LoggerService.error('Socket encountered error: ', error.message, 'Closing socket');
      this.webSocket?.close();
    });
  }

  public disconnect() {
    if (this.webSocket) {
      this.webSocket.close();
      this.webSocket = null;
    }
  }
}

export interface Message extends Object {
  id: number;
  folder: string;
  parent_id?: number;
  mail: Mail;
  total_count?: number;
  marked_as_read?: boolean;
  is_outbox_mail_sent?: boolean;
  unread_count?: any;
  folders: string[];

  /**
   * Id's list when a messsage is marked as read/unread.
   */
  ids?: Array<number>;
  used_storage: number;
}
