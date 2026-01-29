import { createDevApp } from '@backstage/dev-utils';
import { catalogFrontendPlugin, CatalogFrontendPage } from '../src/plugin';

createDevApp()
  .registerPlugin(catalogFrontendPlugin)
  .addPage({
    element: <CatalogFrontendPage />,
    title: 'Root Page',
    path: '/catalog-frontend',
  })
  .render();
