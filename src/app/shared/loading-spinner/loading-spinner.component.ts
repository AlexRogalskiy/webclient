import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-loading-spinner',
  templateUrl: './loading-spinner.component.html',
  styleUrls: ['./loading-spinner.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingSpinnerComponent {
  @Input() showSpinner: boolean;

  @Input() optionalClasses = '';

  // Width and Height in Pixel unit
  @Input() width = 40;
  @Input() height = 40;
  @Input() color = '#3a4e63';
}
