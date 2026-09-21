import { delay, http, HttpResponse } from 'msw';

import { LocatieKey, LocatieModel, LocatieType } from '../app/locatie/locatie.model';

interface MockLocatie {
  type: LocatieType;
  postcode?: string;
  stationscode?: string;
  plaats: string;
  straat?: string;
  omschrijving: string;
}

const LOCATIES: MockLocatie[] = [
  {
    type: 'adres',
    postcode: '3511AA',
    plaats: 'Utrecht',
    straat: 'Oudegracht 1',
    omschrijving: 'Oudegracht 1, Utrecht',
  },
  {
    type: 'adres',
    postcode: '3511AA',
    plaats: 'Utrecht',
    straat: 'Oudegracht 3',
    omschrijving: 'Oudegracht 3, Utrecht',
  },
  {
    type: 'adres',
    postcode: '3512JC',
    plaats: 'Utrecht',
    straat: 'Domplein 1',
    omschrijving: 'Domplein 1, Utrecht',
  },
  {
    type: 'adres',
    postcode: '1012JS',
    plaats: 'Amsterdam',
    straat: 'Dam 1',
    omschrijving: 'Dam 1, Amsterdam',
  },
  {
    type: 'adres',
    postcode: '3011AD',
    plaats: 'Rotterdam',
    straat: 'Coolsingel 40',
    omschrijving: 'Coolsingel 40, Rotterdam',
  },
  { type: 'plaats', plaats: 'Utrecht', omschrijving: 'Utrecht' },
  { type: 'plaats', plaats: 'Amsterdam', omschrijving: 'Amsterdam' },
  { type: 'plaats', plaats: 'Rotterdam', omschrijving: 'Rotterdam' },
  { type: 'plaats', plaats: 'Utrecht Overvecht', omschrijving: 'Utrecht Overvecht' },
  {
    type: 'loc',
    postcode: '3584CB',
    plaats: 'Utrecht',
    straat: 'Heidelberglaan 8',
    omschrijving: 'Universiteit Utrecht',
  },
  {
    type: 'loc',
    postcode: '1097DE',
    plaats: 'Amsterdam',
    straat: 'Science Park 904',
    omschrijving: 'Science Park',
  },
  { type: 'station', stationscode: 'UT', plaats: 'Utrecht', omschrijving: 'Utrecht Centraal' },
  { type: 'station', stationscode: 'ASD', plaats: 'Amsterdam', omschrijving: 'Amsterdam Centraal' },
  { type: 'station', stationscode: 'RTD', plaats: 'Rotterdam', omschrijving: 'Rotterdam Centraal' },
  {
    type: 'station',
    stationscode: 'GVC',
    plaats: "'s-Gravenhage",
    omschrijving: 'Den Haag Centraal',
  },
  { type: 'station', stationscode: 'EHV', plaats: 'Eindhoven', omschrijving: 'Eindhoven Centraal' },
  {
    type: 'recent',
    postcode: '3512JC',
    plaats: 'Utrecht',
    straat: 'Domplein 1',
    omschrijving: 'Domplein 1, Utrecht',
  },
  {
    type: 'recent',
    postcode: '1012JS',
    plaats: 'Amsterdam',
    straat: 'Dam 1',
    omschrijving: 'Dam 1, Amsterdam',
  },
  { type: 'recent', stationscode: 'UT', plaats: 'Utrecht', omschrijving: 'Utrecht Centraal' },
];

const KEYS: Record<LocatieKey, (l: MockLocatie) => string | undefined> = {
  postcode: (l) => l.postcode,
  stationscode: (l) => l.stationscode,
  plaats: (l) => l.plaats,
};

const normalize = (value: string) => value.toLowerCase().replaceAll(' ', '');

function search(
  types: LocatieType[],
  keyName: LocatieKey,
  query: string,
  maxresult: number,
): LocatieModel[] {
  const q = normalize(query);
  const results: LocatieModel[] = [];

  for (const locatie of LOCATIES) {
    if (types.length > 0 && !types.includes(locatie.type)) continue;
    // Without a query only the recent locations are returned.
    if (!q && locatie.type !== 'recent') continue;

    // The API only returns items that have a value for the requested key.
    const key = KEYS[keyName](locatie);
    if (!key) continue;

    const haystack = normalize(
      [key, locatie.plaats, locatie.straat, locatie.omschrijving].join(' '),
    );
    if (q && !haystack.includes(q)) continue;

    results.push({
      key,
      plaats: locatie.plaats,
      straat: locatie.straat,
      omschrijving: locatie.omschrijving,
    });
  }

  // Exact key matches first (used when reloading a stored key with maxresult=1).
  results.sort((a, b) => Number(normalize(b.key) === q) - Number(normalize(a.key) === q));
  return results.slice(0, maxresult);
}

export const handlers = [
  http.get('/api/locaties', async ({ request }) => {
    const params = new URL(request.url).searchParams;
    const types = (params.get('types') ?? '').split(',').filter(Boolean) as LocatieType[];
    const key = (params.get('key') ?? 'plaats') as LocatieKey;
    const query = params.get('query') ?? '';
    const maxresult = Number(params.get('maxresult') ?? 10);

    await delay(400);
    return HttpResponse.json(search(types, key, query, maxresult));
  }),
];
