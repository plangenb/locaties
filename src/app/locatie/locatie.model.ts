export type LocatieType = 'adres' | 'plaats' | 'loc' | 'station' | 'recent';

export type LocatieKey = 'postcode' | 'stationscode' | 'plaats';

export interface LocatieModel {
  /** Key of the item, always filled. */
  key: string;
  plaats?: string;
  straat?: string;
  omschrijving?: string;
}

export interface LocatieSearchParams {
  /** Empty means: search all types. */
  types: readonly LocatieType[];
  key: LocatieKey;
  query?: string;
  maxresult?: number;
}
