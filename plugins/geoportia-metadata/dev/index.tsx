import React from 'react';
import { createDevApp } from '@backstage/dev-utils';
import { geoportiaMetadataPlugin, GeoportiaMetadataPage } from '../src/plugin';

createDevApp()
  .registerPlugin(geoportiaMetadataPlugin)
  .addPage({
    element: <GeoportiaMetadataPage />,
    title: 'Root Page',
    path: '/geoportia-metadata',
  })
  .render();
