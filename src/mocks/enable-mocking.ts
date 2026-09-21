// Development: start the MSW mock api. Replaced by enable-mocking.prod.ts in production builds
// (see fileReplacements in angular.json), so MSW is not part of the production bundle.
export async function enableMocking(): Promise<void> {
  const { worker } = await import('./browser');
  await worker.start({ onUnhandledRequest: 'bypass' });
}
