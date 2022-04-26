import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { BitcoinFormComponent } from '../shared/components/bitcoin-form/bitcoin-form.component';
import { PricingPlansComponent } from '../shared/components/pricing-plans/pricing-plans.component';
import { StripeFormComponent } from '../shared/components/stripe-form/stripe-form.component';

import { PagesDonateComponent } from './pages-donate/pages-donate.component';
import { PaymentOptionsComponent } from './pages-donate/payment-options/payment-options.component';

const routes: Routes = [
  {
    path: 'donate',
    component: PagesDonateComponent,
    children: [
      { path: '', component: PaymentOptionsComponent },
      { path: 'stripe', component: StripeFormComponent },
      { path: 'bitcoin', component: BitcoinFormComponent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PagesRoutingModule {}
