# The schema_update notification triggers

The following page describes the way that the catalogue is kept notified of changes to the Postgis database.

The demo.sql database specification contains two triggers, ''on_ddl_schema_change'' and ''on_drop_schema_change'', that are called when significant changes are made to the database schema. Both trigger a notification to the channel ''schema_update'' containing a JSON object with a ''message'' property information of which trigger generated it.

The notification will be picked up by the listener in the catalog-backend-module-postgresql-data plugin, which then reloads the database.

Note that since demo.sql has been changed, the docker-compose.yml resource must be spun up again for the changes to the database to take effect.



# Testing

To test the notification system, first spin the Postgis container back up:
 
```
docker compose -f 'docker-compose.yml' up -d --build
```

Start the application normally:

```
yarn install
```
```
yarn dev
```

Start psql client and create a new table in it.

```psql
CREATE TABLE TestTable (id SERIAL PRIMARY KEY);
```

Reload check that the new table appears in the user interface on the Tables page. This may require navigating away from and back to the Tables page.

Drop the table again.

```psql
DROP TABLE TestTable;
```

Check that the new table has disappeared from the user interface. This may require navigating away from and back to the Tables page.

Create a view.

```psql
CREATE VIEW TestView AS SELECT highway FROM vagar;
```

Check the table called ''vagar'' in the user interface and see that it has acquired a relation to the view TestView.

Delete the view again.

```psql
DROP VIEW TestView;
```

Navigate away from the table vagar and back again to see that it has lost the relation.