import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { LocatieAutocomplete } from './locatie/locatie-autocomplete/locatie-autocomplete';
import { LocatieModel } from './locatie/locatie.model';

@Component({
  selector: 'app-root',
  imports: [ReactiveFormsModule, LocatieAutocomplete],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  // writeValue still takes the key (string); a selection returns the full LocatieModel.
  protected readonly address = new FormControl<LocatieModel | string | null>(
    null,
    Validators.required,
  );
  protected readonly station = new FormControl<LocatieModel | string | null>('UT');
  protected readonly anything = new FormControl<LocatieModel | string | null>(null);

  /** Shows a value of either shape (the persisted key, or a selected LocatieModel) as text. */
  protected describeValue(value: LocatieModel | string | null): string {
    if (!value) {
      return 'geen';
    }
    return typeof value === 'string' ? value : (value.omschrijving ?? value.key);
  }
}
