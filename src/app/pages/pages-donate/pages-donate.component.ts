import { Component, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { AppState } from '../../store/datatypes';
import { SnackErrorPush } from '../../store/actions';
import { DynamicScriptLoaderService } from '../../shared/services/dynamic-script-loader.service';

@Component({
  selector: 'app-pages-donate',
  templateUrl: './pages-donate.component.html',
  styleUrls: ['./pages-donate.component.scss'],
})
export class PagesDonateComponent implements OnInit {
  constructor(private dynamicScriptLoader: DynamicScriptLoaderService, private store: Store<AppState>) {}

  ngOnInit() {
    this.loadStripeScripts();
  }

  private loadStripeScripts() {
    this.dynamicScriptLoader
      .load('stripe')
      .then(data => {
        this.dynamicScriptLoader
          .load('stripe-key')
          .then(() => {
            // Stripe Loaded Successfully
          })
          .catch(() =>
            this.store.dispatch(new SnackErrorPush({ message: 'Failed to load the Stripe payment gateway.' })),
          );
      })
      .catch(() =>
        this.store.dispatch(new SnackErrorPush({ message: 'Failed to load the payment processing gateway.' })),
      );
  }
}
