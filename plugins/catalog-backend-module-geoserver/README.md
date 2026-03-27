# @internal/backstage-plugin-catalog-backend-module-geoserver

The geoserver backend module for the catalog plugin.

## Configuration

Add the provider config under `catalog.providers.geoserver` in your `app-config.yaml`:

- `uri` (string) - GeoServer REST API base URL
- `username` (string)
- `password` (string)
- `ignoreWorkspaces` (string[]) - optional list of workspace names to exclude from import (case-insensitive)

_This plugin was created through the Backstage CLI_
