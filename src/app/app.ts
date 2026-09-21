import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { LocatieAutocomplete } from './locatie/locatie-autocomplete/locatie-autocomplete';

@Component({
  selector: 'app-root',
  imports: [ReactiveFormsModule, LocatieAutocomplete],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly address = new FormControl<string | null>(null);
  protected readonly station = new FormControl<string | null>('UT');
  protected readonly anything = new FormControl<string | null>(null);
}
