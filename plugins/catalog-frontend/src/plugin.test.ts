import { catalogFrontendPlugin } from './plugin';

describe('catalog-frontend', () => {
  it('should export plugin', () => {
    expect(catalogFrontendPlugin).toBeDefined();
  });
});
