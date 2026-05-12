# geodataset-management

This plugin provides the GeoDataset Management page for Backstage.

## Features

- Tabbed interface for managing geodatasets
- Data owner (Dataägare) management
- Contact person (Kontaktperson) management
- Proposals (Förslag) handling
- Management agreements (Förvaltningsöverenskommelse)

## Installation

Add the plugin to your app's `package.json`:

```bash
yarn add @internal/backstage-plugin-geodataset-management
```

Then add the page to your `App.tsx`:

```tsx
import { GeoDatasetManagementPage } from '@internal/backstage-plugin-geodataset-management';

// In your routes:
<Route path="/listView" element={<GeoDatasetManagementPage />} />
```
