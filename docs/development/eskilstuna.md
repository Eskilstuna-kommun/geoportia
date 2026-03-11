# Eskilstuna environment

This page documents the extra steps Eskilstuna needs to run GeoPortia in *their* environment, i.e. when the ArcGIS SDE integration should be backed by a local ArcPy runtime instead of the Docker-based dummy proxy.

## Run GeoPortia with local ArcPy (and Docker for the rest)

1. **Start Docker Desktop**, but **do not run** the `arcsde-proxy` container.

   - If you start all containers with `docker compose up`, stop only that service afterwards:

     ```bash
     docker compose up -d --build
     docker compose stop arcsde-proxy
     ```

   - The reason: `arcsde-proxy` is the *dummy* ArcSDE proxy used for development. In Eskilstuna’s environment you instead run the real proxy locally via ArcPy.

2. **Point your test script at the correct SDE connection file**.

   Update the `sde_file_name` constant in `eskilstunaTest.py` to the `.sde` connection file you want to use.

3. **Open “Python Command Prompt” (ArcGIS Pro)** and run `eskilstunaTest.py`.

   This verifies that the chosen connection file works in the ArcPy environment.

4. **Start the app**:

   - Run `yarn dev` from the repository root.

### Usually also required: start the local ArcPy proxy

GeoPortia expects an ArcPy proxy at `ARCPY_URI` (defaults to `http://127.0.0.1:8045`). In Eskilstuna’s setup, that typically means starting the ArcPy-backed proxy locally:

```bash
pip install -r .\plugins\catalog-backend-module-arcgis-sde-data\src\sde-python-proxy\requirements.txt
python .\plugins\catalog-backend-module-arcgis-sde-data\src\sde-python-proxy\main.py
```

## Notes

- The ArcGIS SDE proxy code in this repo lives in `plugins/catalog-backend-module-arcgis-sde-data/src/sde-python-proxy/`.
  - `test.py` is the dummy implementation (used by the Docker container).
  - `main.py` is the ArcPy-backed implementation (run locally in an ArcGIS Python environment).
- Make sure `ARCPY_URI` in `packages/backend/.env` points at the proxy you are running (defaults to `http://127.0.0.1:8045`).
