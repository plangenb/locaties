# Locaties

Angular-applicatie waarin een autocomplete-component locaties zoekt via een externe API.

Functionele specificatie: @docs/location-autocomplete.md

## Stack

- Angular 21 (standalone components, geen NgModules), TypeScript 5.9, SCSS
- Geen zone.js: de app draait zoneless. Gebruik signals voor state.
- RxJS 7 beschikbaar (bijvoorbeeld voor debounce bij zoeken)
- Tests: Karma + Jasmine via `ng test` (builder `@angular/build:karma`, configuratie in `karma.conf.js`). Specs draaien in een echte Chrome-browser, niet in jsdom. Gebruik geen Vitest-API (`vi.*`) in specs.
- Formatting: Prettier (`.prettierrc`: printWidth 100, single quotes)
- Er zijn geen UI-libraries (zoals Angular Material) geïnstalleerd. Voeg geen dependencies toe zonder dit eerst te overleggen.
- Als er een MOCK van een api gemaakt moet worden mag MSW geinstalleerd en met `npx msw init public` ge init worden.

## Commando's

- `npm start`: dev server
- `npm test`: unit tests (Karma, watch-modus, opent Chrome)
- `npm test -- --no-watch --browsers=ChromeHeadless`: unit tests één keer headless draaien (voor CI en voor Claude)
- `npm run build`: productiebuild

## Conventies

- Nieuwe componenten zijn standalone en gebruiken `ChangeDetectionStrategy.OnPush`.
- Gebruik `inject()` in plaats van constructor-injectie.
- Gebruik `signal`, `computed`, `input()`, `output()` en `model()` in plaats van decorators als `@Input`/`@Output`.
- Gebruik de ingebouwde control flow (`@if`, `@for`) in templates, niet `*ngIf`/`*ngFor`.
- Componenten staan in eigen mapjes onder `src/app/`, met een `.spec.ts` ernaast.
- Specs zijn Jasmine: gebruik `jasmine.createSpy`/`spyOn` voor mocks, `jasmine.clock()` voor timers (de app is zoneless, dus geen `fakeAsync`), `toHaveSize` in plaats van `toHaveLength` en `toHaveBeenCalledOnceWith` in plaats van `toHaveBeenCalledExactlyOnceWith`.

## Taal

- UI-teksten zijn in het Nederlands.
- Code (namen, commentaar) is in het Engels.
