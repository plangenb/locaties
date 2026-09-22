import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject } from 'rxjs';

import { LocatieApiService } from '../locatie-api.service';
import { LocatieModel, LocatieSearchParams } from '../locatie.model';
import { LocatieAutocomplete } from './locatie-autocomplete';

const DOMPLEIN: LocatieModel = {
  key: '3512JC',
  plaats: 'Utrecht',
  straat: 'Domplein 1',
  omschrijving: 'Domplein 1, Utrecht',
};
const DAM: LocatieModel = {
  key: '1012JS',
  plaats: 'Amsterdam',
  straat: 'Dam 1',
  omschrijving: 'Dam 1, Amsterdam',
};

describe('LocatieAutocomplete', () => {
  let fixture: ComponentFixture<LocatieAutocomplete>;
  let component: LocatieAutocomplete;
  let requests: { params: LocatieSearchParams; response: Subject<LocatieModel[]> }[];
  let onChange: jasmine.Spy<(value: LocatieModel | null) => void>;
  let onTouched: jasmine.Spy<() => void>;

  const input = () => fixture.nativeElement.querySelector('input') as HTMLInputElement;
  const texts = (selector: string) =>
    Array.from(fixture.nativeElement.querySelectorAll(selector) as NodeListOf<HTMLElement>).map(
      (e) => e.textContent?.trim(),
    );
  const focus = () => {
    input().dispatchEvent(new Event('focus'));
    fixture.detectChanges();
  };
  const type = (text: string) => {
    input().value = text;
    input().dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const press = (key: string) => {
    input().dispatchEvent(new KeyboardEvent('keydown', { key, cancelable: true }));
    fixture.detectChanges();
  };
  const respond = (index: number, items: LocatieModel[]) => {
    requests[index].response.next(items);
    requests[index].response.complete();
    fixture.detectChanges();
  };

  beforeEach(() => {
    requests = [];
    TestBed.configureTestingModule({
      providers: [
        {
          provide: LocatieApiService,
          useValue: {
            search: (params: LocatieSearchParams) => {
              const response = new Subject<LocatieModel[]>();
              requests.push({ params, response });
              return response;
            },
          },
        },
      ],
    });

    fixture = TestBed.createComponent(LocatieAutocomplete);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('key', 'postcode');
    fixture.componentRef.setInput('types', ['adres', 'recent']);
    onChange = jasmine.createSpy<(value: LocatieModel | null) => void>('onChange');
    onTouched = jasmine.createSpy<() => void>('onTouched');
    component.registerOnChange(onChange);
    component.registerOnTouched(onTouched);
    fixture.detectChanges();
  });

  afterEach(() => jasmine.clock().uninstall());

  it('opens on focus, shows a loading message and searches without query', () => {
    focus();

    expect(texts('.message')).toEqual(['Locaties worden geladen']);
    expect(requests).toHaveSize(1);
    expect(requests[0].params).toEqual({
      types: ['adres', 'recent'],
      key: 'postcode',
      query: '',
      maxresult: 10,
    });
  });

  it('lists the recent locations when there is no query', () => {
    focus();
    respond(0, [DOMPLEIN, DAM]);

    expect(texts('.primary')).toEqual(['Domplein 1, Utrecht', 'Dam 1, Amsterdam']);
    expect(texts('.secondary')).toEqual(['Domplein 1, Utrecht', 'Dam 1, Amsterdam']);
  });

  it('shows a message when there are no locations', () => {
    focus();
    respond(0, []);

    expect(texts('.message')).toEqual(['Geen locaties gevonden']);
  });

  it('shows a message when the api fails', () => {
    focus();
    requests[0].response.error(new Error('boom'));
    fixture.detectChanges();

    expect(texts('.message')).toEqual(['Locaties konden niet worden geladen']);
  });

  it('searches after the debounce time when typing', () => {
    jasmine.clock().install();
    focus();
    respond(0, []);

    type('35');
    jasmine.clock().tick(299);
    expect(requests).toHaveSize(1);

    type('3511');
    jasmine.clock().tick(299);
    expect(requests).toHaveSize(1);

    jasmine.clock().tick(1);
    expect(requests).toHaveSize(2);
    expect(requests[1].params.query).toBe('3511');
  });

  it('cancels the request of an earlier query', () => {
    jasmine.clock().install();
    focus();
    respond(0, []);

    type('35');
    jasmine.clock().tick(300);
    type('3511');
    jasmine.clock().tick(300);

    expect(requests).toHaveSize(3);
    expect(requests[1].response.observed).toBe(false);
    expect(requests[2].response.observed).toBe(true);
  });

  it('walks through the results with the arrow keys and selects with enter', () => {
    focus();
    respond(0, [DOMPLEIN, DAM]);

    press('ArrowDown');
    expect(texts('.active .primary')).toEqual(['Domplein 1, Utrecht']);
    press('ArrowDown');
    expect(texts('.active .primary')).toEqual(['Dam 1, Amsterdam']);
    press('ArrowDown');
    expect(texts('.active .primary')).toEqual(['Domplein 1, Utrecht']);
    press('ArrowUp');
    expect(texts('.active .primary')).toEqual(['Dam 1, Amsterdam']);

    press('Enter');

    expect(onChange).toHaveBeenCalledOnceWith(DAM);
    expect(input().value).toBe('1012JS');
    expect(component.selected()).toEqual(DAM);
    expect(fixture.nativeElement.querySelector('[role="listbox"]')).toBeNull();
  });

  describe('enter without an active row', () => {
    /** Opens the dropdown, types the text and answers the debounced search with the items. */
    const typeAndLoad = (text: string, items: LocatieModel[]) => {
      jasmine.clock().install();
      focus();
      respond(0, []);
      type(text);
      jasmine.clock().tick(300);
      respond(1, items);
    };

    it('selects the first result', () => {
      typeAndLoad('3511', [DOMPLEIN, DAM]);

      press('Enter');

      expect(onChange).toHaveBeenCalledOnceWith(DOMPLEIN);
      expect(input().value).toBe('3512JC');
      expect(component.selected()).toEqual(DOMPLEIN);
      expect(fixture.nativeElement.querySelector('[role="listbox"]')).toBeNull();
    });

    it('does nothing when the field is empty', () => {
      focus();
      respond(0, [DOMPLEIN, DAM]);

      press('Enter');

      expect(onChange).not.toHaveBeenCalled();
      expect(fixture.nativeElement.querySelector('[role="listbox"]')).not.toBeNull();
    });

    it('does nothing when there are no results', () => {
      typeAndLoad('zzzzzz', []);

      press('Enter');

      expect(onChange).not.toHaveBeenCalled();
      expect(input().value).toBe('zzzzzz');
      expect(texts('.message')).toEqual(['Geen locaties gevonden']);
    });

    it('searches right away during the debounce and selects the first result', () => {
      jasmine.clock().install();
      focus();
      respond(0, []);
      type('3511');
      jasmine.clock().tick(100);
      expect(requests).toHaveSize(1);

      press('Enter');

      expect(requests).toHaveSize(2);
      expect(requests[1].params.query).toBe('3511');
      expect(onChange).not.toHaveBeenCalled();

      respond(1, [DOMPLEIN, DAM]);
      expect(onChange).toHaveBeenCalledOnceWith(DOMPLEIN);

      // The skipped debounce does not fire a second search.
      jasmine.clock().tick(500);
      expect(requests).toHaveSize(2);
    });

    it('waits for a running request and selects the first result when it arrives', () => {
      jasmine.clock().install();
      focus();
      respond(0, []);
      type('3511');
      jasmine.clock().tick(300);
      expect(requests).toHaveSize(2);

      press('Enter');
      expect(onChange).not.toHaveBeenCalled();

      respond(requests.length - 1, [DAM, DOMPLEIN]);
      expect(onChange).toHaveBeenCalledOnceWith(DAM);
    });

    it('does not select from the results of an earlier text', () => {
      typeAndLoad('35', [DOMPLEIN]);
      type('3511');

      press('Enter');
      expect(onChange).not.toHaveBeenCalled();

      respond(requests.length - 1, [DAM]);
      expect(onChange).toHaveBeenCalledOnceWith(DAM);
    });

    it('selects nothing when the api fails', () => {
      jasmine.clock().install();
      focus();
      respond(0, []);
      type('3511');
      press('Enter');

      requests[requests.length - 1].response.error(new Error('boom'));
      fixture.detectChanges();

      expect(onChange).not.toHaveBeenCalled();
      expect(input().value).toBe('3511');
      expect(texts('.message')).toEqual(['Locaties konden niet worden geladen']);
    });

    it('is cancelled when the user keeps typing', () => {
      jasmine.clock().install();
      focus();
      respond(0, []);
      type('35');
      press('Enter');
      type('351');

      respond(1, [DOMPLEIN]);

      expect(onChange).not.toHaveBeenCalled();
    });

    it('is cancelled when the field loses focus', () => {
      jasmine.clock().install();
      focus();
      respond(0, []);
      type('35');
      press('Enter');
      input().dispatchEvent(new Event('blur'));

      respond(1, [DOMPLEIN]);

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  it('selects a location on click, shows its key and returns the full model to the form', () => {
    focus();
    respond(0, [DOMPLEIN, DAM]);

    (fixture.nativeElement.querySelectorAll('.option')[0] as HTMLElement).click();
    fixture.detectChanges();

    // The field shows the key, but the form gets the whole LocatieModel, not just the key.
    expect(input().value).toBe('3512JC');
    expect(onChange).toHaveBeenCalledOnceWith(DOMPLEIN);
    expect(fixture.nativeElement.querySelector('[role="listbox"]')).toBeNull();
  });

  it('closes with escape', () => {
    focus();
    respond(0, [DOMPLEIN]);

    press('Escape');

    expect(fixture.nativeElement.querySelector('[role="listbox"]')).toBeNull();
  });

  it('reloads the selected item by key with maxresult 1 on writeValue', () => {
    component.writeValue('3512JC');
    fixture.detectChanges();

    expect(input().value).toBe('3512JC');
    expect(requests).toHaveSize(1);
    expect(requests[0].params).toEqual({
      types: ['adres', 'recent'],
      key: 'postcode',
      query: '3512JC',
      maxresult: 1,
    });

    respond(0, [DOMPLEIN]);
    expect(component.selected()).toEqual(DOMPLEIN);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('keeps the key visible when the reload finds nothing', () => {
    component.writeValue('9999ZZ');
    respond(0, []);

    expect(component.selected()).toBeNull();
    expect(input().value).toBe('9999ZZ');
  });

  it('clears everything on writeValue(null)', () => {
    component.writeValue('3512JC');
    respond(0, [DOMPLEIN]);

    component.writeValue(null);
    fixture.detectChanges();

    expect(input().value).toBe('');
    expect(component.selected()).toBeNull();
  });

  it('emits null when the text is cleared', () => {
    component.writeValue('3512JC');
    respond(0, [DOMPLEIN]);
    focus();

    type('');

    expect(onChange).toHaveBeenCalledOnceWith(null);
    expect(component.selected()).toBeNull();
  });

  it('discards unconfirmed text on blur and marks the control as touched', () => {
    component.writeValue('3512JC');
    respond(0, [DOMPLEIN]);
    focus();
    type('35');

    input().dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(input().value).toBe('3512JC');
    expect(onTouched).toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[role="listbox"]')).toBeNull();
  });

  describe('description of the selected location', () => {
    const description = () =>
      fixture.nativeElement.querySelector('.description') as HTMLElement | null;

    it('is shown below the field after a selection', () => {
      focus();
      respond(0, [DOMPLEIN, DAM]);

      (fixture.nativeElement.querySelectorAll('.option')[0] as HTMLElement).click();
      fixture.detectChanges();

      expect(description()?.textContent?.trim()).toBe('Domplein 1, Utrecht');
      expect(input().getAttribute('aria-describedby')).toBe(description()?.id ?? null);
    });

    it('is shown after a reloaded value has been found by the api', () => {
      component.writeValue('3512JC');
      fixture.detectChanges();
      expect(description()).toBeNull();

      respond(0, [DOMPLEIN]);

      expect(description()?.textContent?.trim()).toBe('Domplein 1, Utrecht');
    });

    it('is not shown when the location has no omschrijving', () => {
      component.writeValue('X1');
      respond(0, [{ key: 'X1', plaats: 'Utrecht' }]);

      expect(description()).toBeNull();
      expect(input().hasAttribute('aria-describedby')).toBeFalse();
    });

    it('is removed when the text is cleared', () => {
      component.writeValue('3512JC');
      respond(0, [DOMPLEIN]);
      focus();

      type('');

      expect(description()).toBeNull();
    });

    it('is removed on writeValue(null)', () => {
      component.writeValue('3512JC');
      respond(0, [DOMPLEIN]);

      component.writeValue(null);
      fixture.detectChanges();

      expect(description()).toBeNull();
    });
  });

  describe('scrolling the list with the arrow keys', () => {
    const many: LocatieModel[] = Array.from({ length: 30 }, (_, i) => ({
      key: `K${i}`,
      omschrijving: `Item ${i}`,
      straat: `Straat ${i}`,
      plaats: 'Utrecht',
    }));
    const list = () => fixture.nativeElement.querySelector('.list') as HTMLElement;
    const expectActiveRowVisible = () => {
      const active = list().querySelector('.active') as HTMLElement;
      expect(active).not.toBeNull();
      expect(active.offsetTop).toBeGreaterThanOrEqual(list().scrollTop);
      expect(active.offsetTop + active.offsetHeight).toBeLessThanOrEqual(
        list().scrollTop + list().clientHeight,
      );
    };

    beforeEach(() => {
      focus();
      respond(0, many);
    });

    it('has a list that is scrollable', () => {
      expect(list().scrollHeight).toBeGreaterThan(list().clientHeight);
      expect(list().scrollTop).toBe(0);
    });

    it('scrolls down along with the active row', () => {
      for (let i = 0; i < 20; i++) {
        press('ArrowDown');
        expectActiveRowVisible();
      }

      expect(texts('.active .primary')).toEqual(['Item 19']);
      expect(list().scrollTop).toBeGreaterThan(0);
    });

    it('scrolls back up along with the active row', () => {
      for (let i = 0; i < 20; i++) press('ArrowDown');
      for (let i = 0; i < 15; i++) {
        press('ArrowUp');
        expectActiveRowVisible();
      }

      expect(texts('.active .primary')).toEqual(['Item 4']);
    });

    it('starts at the last row with arrow up and scrolls to it', () => {
      press('ArrowUp');

      expect(texts('.active .primary')).toEqual(['Item 29']);
      expectActiveRowVisible();
      expect(list().scrollTop).toBeGreaterThan(0);
    });

    it('wraps from the last to the first row and scrolls back to the top', () => {
      press('ArrowUp');
      press('ArrowDown');

      expect(texts('.active .primary')).toEqual(['Item 0']);
      expectActiveRowVisible();
      expect(list().scrollTop).toBe(0);
    });
  });

  describe('filter toggle', () => {
    const filterButton = () =>
      fixture.nativeElement.querySelector('.filter-toggle') as HTMLButtonElement | null;

    it('is not shown without a filterType', () => {
      focus();

      expect(filterButton()).toBeNull();
    });

    it('shows the label and searches only that type once toggled on', () => {
      fixture.componentRef.setInput('filterType', 'station');
      fixture.componentRef.setInput('filterLabel', 'Alleen stations');
      focus();
      respond(0, []);

      expect(filterButton()?.textContent?.trim()).toBe('Alleen stations');
      expect(filterButton()?.getAttribute('aria-pressed')).toBe('false');

      filterButton()!.click();
      fixture.detectChanges();

      expect(filterButton()?.getAttribute('aria-pressed')).toBe('true');
      expect(requests).toHaveSize(2);
      expect(requests[1].params.types).toEqual(['station']);
    });

    it('searches the configured types again once toggled off', () => {
      fixture.componentRef.setInput('filterType', 'station');
      focus();
      respond(0, []);

      filterButton()!.click();
      fixture.detectChanges();
      respond(1, []);
      filterButton()!.click();
      fixture.detectChanges();

      expect(filterButton()?.getAttribute('aria-pressed')).toBe('false');
      expect(requests).toHaveSize(3);
      expect(requests[2].params.types).toEqual(['adres', 'recent']);
    });

    it('resets when a new value is loaded', () => {
      fixture.componentRef.setInput('filterType', 'station');
      focus();
      respond(0, []);
      filterButton()!.click();
      fixture.detectChanges();
      respond(1, []);
      expect(filterButton()?.getAttribute('aria-pressed')).toBe('true');

      // writeValue does not close the dropdown, so the (still rendered) button is checked directly.
      component.writeValue(null);
      fixture.detectChanges();

      expect(filterButton()?.getAttribute('aria-pressed')).toBe('false');
    });
  });

  it('can be disabled', () => {
    component.setDisabledState(true);
    fixture.detectChanges();

    expect(input().disabled).toBe(true);
  });
});

describe('LocatieAutocomplete met reactive forms validatie', () => {
  @Component({
    imports: [ReactiveFormsModule, LocatieAutocomplete],
    template: `<app-locatie-autocomplete key="postcode" [formControl]="control" />`,
  })
  class HostComponent {
    readonly control = new FormControl<LocatieModel | string | null>(null, Validators.required);
  }

  let fixture: ComponentFixture<HostComponent>;
  let requests: { params: LocatieSearchParams; response: Subject<LocatieModel[]> }[];

  const input = () => fixture.nativeElement.querySelector('input') as HTMLInputElement;
  const control = () => fixture.componentInstance.control;

  beforeEach(() => {
    requests = [];
    TestBed.configureTestingModule({
      providers: [
        {
          provide: LocatieApiService,
          useValue: {
            search: (params: LocatieSearchParams) => {
              const response = new Subject<LocatieModel[]>();
              requests.push({ params, response });
              return response;
            },
          },
        },
      ],
    });

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('shows no invalid state before the field is touched', () => {
    expect(input().classList).not.toContain('invalid');
    expect(fixture.nativeElement.querySelector('.error')).toBeNull();
  });

  it('shows the invalid class and a message once a required field is touched and empty', () => {
    input().dispatchEvent(new Event('focus'));
    input().dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(input().classList).toContain('invalid');
    const error = fixture.nativeElement.querySelector('.error') as HTMLElement;
    expect(error.textContent?.trim()).toBe('Dit veld is verplicht.');
    expect(input().getAttribute('aria-describedby')).toBe(error.id);
  });

  it('clears the invalid state once a valid location is selected', () => {
    input().dispatchEvent(new Event('focus'));
    input().dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(input().classList).toContain('invalid');

    // The first (unfinished) search was for the earlier focus; blur left the dropdown closed, so
    // this second focus starts a new one.
    input().dispatchEvent(new Event('focus'));
    const last = requests.length - 1;
    requests[last].response.next([
      { key: 'UT', omschrijving: 'Utrecht Centraal' } satisfies LocatieModel,
    ]);
    requests[last].response.complete();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.option') as HTMLElement).click();
    fixture.detectChanges();

    expect(input().classList).not.toContain('invalid');
    expect(fixture.nativeElement.querySelector('.error')).toBeNull();
    expect(control().value).toEqual({ key: 'UT', omschrijving: 'Utrecht Centraal' });
  });

  it('reacts to errors set from outside, such as an async or server-side validator', () => {
    control().setErrors({ email: true });
    control().markAsTouched();
    fixture.detectChanges();

    const error = fixture.nativeElement.querySelector('.error') as HTMLElement;
    expect(error.textContent?.trim()).toBe('Vul een geldig e-mailadres in.');
  });
});
