import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { enableMocking } from './mocks/enable-mocking';

enableMocking()
  .then(() => bootstrapApplication(App, appConfig))
  .catch((err) => console.error(err));
