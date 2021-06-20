import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filesize',
})
export class FilesizePipe implements PipeTransform {
  private units = ['B', 'KB', 'MB', 'GB', 'TB'];

  transform(bytes: any, preferredUnit?: any, precision = 2): any {
    if (Number.isNaN(Number.parseFloat(String(bytes))) || !Number.isFinite(bytes)) {
      return '?';
    }

    let unit = 0;

    // Check if preferred unit exist preset the unit
    if (preferredUnit && this.units.includes(preferredUnit)) {
      while (this.units[unit] !== preferredUnit) {
        unit += 1;
      }
    }

    while (bytes >= 1024) {
      bytes /= 1024;

      if (!preferredUnit) {
        unit += 1;
      }
    }

    return `${bytes.toFixed(+precision)} ${this.units[unit]}`;
  }
}
