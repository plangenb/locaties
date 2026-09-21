import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { LocatieApiService } from './locatie-api.service';
import { LocatieModel } from './locatie.model';

describe('LocatieApiService', () => {
  let service: LocatieApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(LocatieApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends types, key, query and maxresult as query parameters', () => {
    let result: LocatieModel[] | undefined;
    service
      .search({
        types: ['adres', 'plaats', 'recent'],
        key: 'postcode',
        query: '3511',
        maxresult: 5,
      })
      .subscribe((r) => (result = r));

    const req = http.expectOne((r) => r.url === '/api/locaties');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('types')).toBe('adres,plaats,recent');
    expect(req.request.params.get('key')).toBe('postcode');
    expect(req.request.params.get('query')).toBe('3511');
    expect(req.request.params.get('maxresult')).toBe('5');

    req.flush([{ key: '3511AA' }]);
    expect(result).toEqual([{ key: '3511AA' }]);
  });

  it('omits types when empty so the API searches all types', () => {
    service.search({ types: [], key: 'plaats' }).subscribe();

    const req = http.expectOne((r) => r.url === '/api/locaties');
    expect(req.request.params.has('types')).toBe(false);
    expect(req.request.params.has('query')).toBe(false);
    expect(req.request.params.has('maxresult')).toBe(false);
    req.flush([]);
  });
});
