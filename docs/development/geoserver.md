# Geoserver

GeoPortia includes a connection to a Geoserver.

## Setup

The following steps are required to set up the Geoserver and verifying that it can be connected to the PostGIS database.

### Starting up the geoserver

Spin up the Docker image:

```bash
docker compose -f 'docker-compose.yml' up -d --build
```

Open your web browser at http://localhost:18080/geoserver. Log in with the username _admin_ and the password _geoserver_.

### Add a new workspace

Go to Data → Workspaces → Add new workspace.

Write in _postgres_ for both name and uri. Click _Save_.

### Add the PostgreSQL as a datastore

Go to Data → Stores → Add new store. Select _PostGIS_.

Under _Workspace_, choose _postgres_.

Under _Name of data source_, write in _postgres_.

Under _Host_, write _postgis_.

Under _Port_, write _5432_.

Under _Database_, write _postgres_.

Under _Schema_, write _postgres_.

Under _User_, write _postgres_.

Under _Password_, write _postgres_.

Click _Apply_ and check that there are no error messages.

Click _Save_.

### Add one of the layers from the database

Go to Data → Layer → Add new layer.

Under _Add layer from_, choose _postgres:postgres_. This should result in a table of all layers in the database.

To the right of the row marked _byggnader_, click _Publish_.

Under Bounding boxes → Lat/long bounding box, click _Compute from native bounds_.

Click _Apply_ and check that there are no error messages.

Click _Save_.

Go to Data → Layer Preview. Find the row for _byggnader_ in the table and click on _Open Layers_. Verify that a scrollable map appears and contains objects.