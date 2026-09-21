import { InjectionToken } from '@angular/core';

export const LOCATIE_API_URL = new InjectionToken<string>('LOCATIE_API_URL', {
  factory: () => '/api/locaties',
});
