# Arcpy

The production version of Geoportia uses an ArcPy-backed proxy to handle data in an ArcGIS SDE database. Since running ArcPy requires a dedicated environment that is complicated to manage, the development version instead uses a dummy proxy that simulates the behaviour of the real one.

The proxy code lives in `plugins/catalog-backend-module-arcgis-sde-data/src/sde-python-proxy/`:

- `test.py` — dummy implementation (suitable for Docker)
- `main.py` — ArcPy-backed implementation (run locally in an ArcGIS Python environment)

## Dummy proxy (development)

The dummy proxy is what the `arcsde-proxy` container runs in `docker-compose.yml`.

If you want to run it manually outside Docker, you can start it with:

```bash
Start-Process python ".\plugins\catalog-backend-module-arcgis-sde-data\src\sde-python-proxy\test.py" -NoNewWindow
```

## Using a real ArcPy environment

For municipality-specific instructions (Eskilstuna), see [Eskilstuna environment](eskilstuna.md).