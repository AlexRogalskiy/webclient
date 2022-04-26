import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { UsersBillingInfoComponent } from '../shared/components/users-billing-info/users-billing-info.component';
import { AuthGuard } from '../store/services';

import { UsersSignInComponent } from './users-sign-in/users-sign-in.component';
import { UsersSignUpComponent } from './users-sign-up/users-sign-up.component';
import { UsersCreateAccountComponent } from './users-create-account/users-create-account.component';
import { DecryptMessageComponent } from './decrypt/decrypt-message.component';

const routes: Routes = [
  { path: '', redirectTo: 'signin', pathMatch: 'full' },
  { path: 'signin', component: UsersSignInComponent, canActivate: [AuthGuard] },
  { path: 'billing-info', component: UsersBillingInfoComponent },
  { path: 'message/:hash/:secret/:senderId', component: DecryptMessageComponent },
  { path: '**', redirectTo: 'signin' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { relativeLinkResolution: 'legacy' })],
  exports: [RouterModule],
})
export class UsersRoutingModule {}
