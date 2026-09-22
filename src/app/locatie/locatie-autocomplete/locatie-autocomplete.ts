import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  linkedSignal,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ControlValueAccessor, NgControl } from '@angular/forms';
import {
  catchError,
  debounce,
  map,
  merge,
  Observable,
  of,
  startWith,
  Subject,
  Subscription,
  switchMap,
  take,
  tap,
  timer,
} from 'rxjs';

import { LocatieApiService } from '../locatie-api.service';
import { LocatieKey, LocatieModel, LocatieType } from '../locatie.model';

type Status = 'loading' | 'loaded' | 'error';

/** The state of the latest search: its status, the query it was for and its results. */
interface SearchState {
  status: Status;
  query: string | null;
  results: LocatieModel[];
}

const INITIAL_SEARCH: SearchState = { status: 'loading', query: null, results: [] };

let nextId = 0;

/** Dutch text for the most common reactive-forms validators. */
const ERROR_MESSAGES: Record<string, string> = {
  required: 'Dit veld is verplicht.',
  email: 'Vul een geldig e-mailadres in.',
  minlength: 'De waarde is te kort.',
  maxlength: 'De waarde is te lang.',
  pattern: 'De waarde heeft niet de juiste vorm.',
};

@Component({
  selector: 'app-locatie-autocomplete',
  templateUrl: './locatie-autocomplete.html',
  styleUrl: './locatie-autocomplete.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // No NG_VALUE_ACCESSOR provider: this component wires itself up as the value accessor of its
  // own NgControl below, which avoids a circular dependency between the two.
})
export class LocatieAutocomplete implements ControlValueAccessor, OnInit {
  private readonly api = inject(LocatieApiService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly ngControl = inject(NgControl, { optional: true, self: true });
  private readonly destroyRef = inject(DestroyRef);

  /** Types to search in. Empty means: all types. */
  readonly types = input<readonly LocatieType[]>([]);
  /** The field that is used as key (the value of the control). */
  readonly key = input.required<LocatieKey>();
  readonly maxResults = input(10);
  readonly debounceMs = input(300);
  readonly placeholder = input('');
  /** Type for the optional filter toggle above the results. No type means: no filter button. */
  readonly filterType = input<LocatieType | undefined>(undefined);
  /** Label of the filter toggle; falls back to the type itself. */
  readonly filterLabel = input<string | undefined>(undefined);

  private readonly id = `locatie-autocomplete-${nextId++}`;
  protected readonly listId = `${this.id}-list`;
  protected readonly descriptionId = `${this.id}-description`;
  protected readonly open = signal(false);
  protected readonly inputText = signal('');
  protected readonly disabled = signal(false);
  /** Whether the filter toggle is active; resets when a new value is loaded. */
  protected readonly filterActive = signal(false);
  /** The location that belongs to the current value, once known. */
  readonly selected = signal<LocatieModel | null>(null);

  /** The types actually searched: only `filterType` while the filter toggle is active. */
  protected readonly effectiveTypes = computed(() => {
    const filterType = this.filterType();
    return this.filterActive() && filterType ? [filterType] : this.types();
  });
  protected readonly filterButtonLabel = computed(() => this.filterLabel() ?? this.filterType());

  private readonly typed$ = new Subject<string>();
  private readonly immediate$ = new Subject<string>();
  /** Lets a debounced (typed) query through immediately. */
  private readonly flush$ = new Subject<void>();

  private readonly searchState = toSignal(this.searches(), { initialValue: INITIAL_SEARCH });
  protected readonly status = computed(() => this.searchState().status);
  protected readonly results = computed(() => this.searchState().results);
  /** The row that is active for the arrow keys; starts over when there are new results. */
  protected readonly activeIndex = linkedSignal<LocatieModel[], number>({
    source: this.results,
    computation: () => -1,
  });

  protected readonly activeId = computed(() =>
    this.activeIndex() >= 0 ? this.optionId(this.activeIndex()) : null,
  );
  /** Short description of the selected location, shown below the field. */
  protected readonly description = computed(() => this.selected()?.omschrijving || null);

  // Bridges the NgControl's non-signal state (touched, status, errors) into a signal. Bumped
  // from ngOnInit, because `ngControl.control` is only set after construction (by the [formControl]
  // input binding), not yet available here in a field initializer.
  private readonly formStateTick = signal(0);
  protected readonly invalid = computed(() => {
    this.formStateTick();
    return !!(this.ngControl?.invalid && this.ngControl?.touched);
  });
  protected readonly errorMessage = computed(() => {
    this.formStateTick();
    if (!this.invalid()) {
      return null;
    }
    const errorKey = Object.keys(this.ngControl?.errors ?? {})[0];
    return errorKey ? (ERROR_MESSAGES[errorKey] ?? 'Ongeldige waarde.') : null;
  });

  private committedKey: string | null = null;
  private reloadSubscription?: Subscription;
  /** An Enter that waits for the results of the current text. */
  private pendingEnter = false;
  /** The full location, not just the key, is returned to the form on selection. */
  private onChange: (value: LocatieModel | null) => void = () => {};
  private onTouched: () => void = () => {};

  constructor() {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }

    // Keep the active row (arrow keys) visible in the scrollable list.
    afterRenderEffect(() => {
      const id = this.activeId();
      if (id) {
        this.host.nativeElement.querySelector(`#${id}`)?.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  ngOnInit(): void {
    // By now [formControl]/formControlName has set ngControl.control, unlike in the constructor.
    this.ngControl?.control?.events
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.formStateTick.update((tick) => tick + 1));
  }

  /** Every query (typed with debounce, or immediate) becomes a search; the state follows it. */
  private searches(): Observable<SearchState> {
    return merge(
      this.typed$.pipe(debounce(() => merge(timer(this.debounceMs()), this.flush$).pipe(take(1)))),
      this.immediate$,
    ).pipe(
      // switchMap cancels the request of an earlier query.
      switchMap((query) =>
        this.api
          .search({
            types: this.effectiveTypes(),
            key: this.key(),
            query,
            maxresult: this.maxResults(),
          })
          .pipe(
            map((results): SearchState => ({ status: 'loaded', query, results })),
            catchError(() => of<SearchState>({ status: 'error', query, results: [] })),
            startWith<SearchState>({ status: 'loading', query, results: [] }),
          ),
      ),
      tap((state) => this.completePendingEnter(state)),
    );
  }

  /** Selects the first result when an Enter was waiting for the search of the current text. */
  private completePendingEnter(state: SearchState): void {
    // Results of an older query leave a waiting Enter in place.
    if (!this.pendingEnter || state.status === 'loading' || state.query !== this.inputText()) {
      return;
    }
    this.pendingEnter = false;
    if (state.results[0]) {
      this.select(state.results[0]);
    }
  }

  writeValue(value: string | null): void {
    this.reloadSubscription?.unsubscribe();
    this.pendingEnter = false;
    this.filterActive.set(false);
    this.committedKey = value || null;
    this.inputText.set(value ?? '');
    this.selected.set(null);

    if (!value) {
      return;
    }
    // Reload the item that belongs to the key; the key itself stays visible if nothing is found.
    this.reloadSubscription = this.api
      .search({ types: this.types(), key: this.key(), query: value, maxresult: 1 })
      .subscribe({ next: (results) => this.selected.set(results[0] ?? null), error: () => {} });
  }

  registerOnChange(fn: (value: LocatieModel | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
    if (isDisabled) {
      this.open.set(false);
    }
  }

  protected optionId(index: number): string {
    return `${this.listId}-option-${index}`;
  }

  protected openDropdown(): void {
    if (this.open()) {
      return;
    }
    this.open.set(true);
    this.immediate$.next('');
  }

  protected toggleFilter(): void {
    this.filterActive.set(!this.filterActive());
    // Re-run the current search immediately, now with the toggled types.
    this.immediate$.next(this.inputText());
  }

  protected onInput(text: string): void {
    this.pendingEnter = false;
    this.inputText.set(text);
    this.open.set(true);
    this.typed$.next(text);

    if (!text && this.committedKey !== null) {
      this.committedKey = null;
      this.selected.set(null);
      this.onChange(null);
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    const count = this.results().length;

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault();
        if (!this.open()) {
          this.openDropdown();
        } else if (count > 0) {
          const step = event.key === 'ArrowDown' ? 1 : -1;
          const current = this.activeIndex();
          // Without an active row, arrow down starts at the first and arrow up at the last row.
          this.activeIndex.set(
            current === -1 ? (step === 1 ? 0 : count - 1) : (current + step + count) % count,
          );
        }
        break;
      }
      case 'Enter': {
        if (this.open()) {
          this.onEnter(event);
        }
        break;
      }
      case 'Escape': {
        if (this.open()) {
          event.preventDefault();
          this.pendingEnter = false;
          this.open.set(false);
        }
        break;
      }
    }
  }

  /** Enter selects the active row; without one it selects the first result for the typed text. */
  private onEnter(event: KeyboardEvent): void {
    const active = this.results()[this.activeIndex()];
    if (active) {
      event.preventDefault();
      this.select(active);
      return;
    }

    const text = this.inputText();
    if (!text) {
      return;
    }
    event.preventDefault();

    const state = this.searchState();
    if (state.status === 'loaded' && state.query === text) {
      if (state.results[0]) {
        this.select(state.results[0]);
      }
      return;
    }

    // The results are not (yet) for this text: search right away and select when they arrive.
    this.pendingEnter = true;
    this.typed$.next(text);
    this.flush$.next();
  }

  protected onBlur(): void {
    this.pendingEnter = false;
    this.open.set(false);
    // Text that was not confirmed with a selection is discarded.
    this.inputText.set(this.committedKey ?? '');
    this.onTouched();
  }

  protected select(item: LocatieModel): void {
    this.pendingEnter = false;
    this.committedKey = item.key;
    this.selected.set(item);
    this.inputText.set(item.key);
    this.open.set(false);
    this.onChange(item);
  }

  protected secondaryText(item: LocatieModel): string {
    return [item.straat, item.plaats].filter(Boolean).join(', ');
  }
}
