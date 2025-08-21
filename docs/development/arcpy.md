# Arcpy

The production version of Geoportia will use an arcpy script to handle data in an ArcGIS SDE database. Since running arcpy requires a dedicated environment that is complicated to manage, the development version instead uses a dummy script that simulates the behaviour of the real one. The dummy script is started through the following command:

```bash
Start-Process python ".\plugins\catalog-backend-module-arcgis-sde-data\src\arcpy\test.py" -NoNewWindow
```