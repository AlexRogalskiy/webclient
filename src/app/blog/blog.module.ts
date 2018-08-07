// Angular
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// Components
import { BlogDetailComponent } from './blog-detail/blog-detail.component';
import { BlogListComponent } from './blog-list/blog-list.component';

// Modules
import { BlogRoutingModule } from './blog-routing.module';
import { MailModule } from '../mail/mail.module';
import { SharedModule } from '../shared/shared.module';

// Services
import { BlogService } from '../store/services';
import { BlogSampleComponent } from './shared/blog-sample/blog-sample.component';
import { BlogGridComponent } from './shared/blog-grid/blog-grid.component';



@NgModule({
  imports: [
    CommonModule,
    BlogRoutingModule,
    MailModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule
  ],
  declarations: [
    BlogDetailComponent,
    BlogListComponent,
    BlogSampleComponent,
    BlogGridComponent,
  ],
  exports: [
    BlogSampleComponent,
    BlogGridComponent,
  ],
  providers: [
    BlogService
  ]
})
export class BlogModule { }
