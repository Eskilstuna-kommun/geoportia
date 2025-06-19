# @internal/backstage-plugin-catalog-backend-module-postgresql-data

The postgresql-data backend module for the catalog plugin.

_This plugin was created through the Backstage CLI_

# Testing of database notification

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
CREATE TABLE TestTable (id SERIAL PRIMARY KEY, testfield INT);
```

Check that the new table appears in the user interface on the Tables page. This may require navigating away from and back to the Tables page.

Rename the table.

```psql
ALTER TABLE TestTable RENAME TO TestTable2;
```

Check that the table now exists under the new name.

Add a description to the table.

```psql
COMMENT ON TABLE TestTable2 IS 'This is my table.';
```

Check that the table now has the correct description.

Drop the table again.

```psql
DROP TABLE TestTable2;
```

Check that the new table has disappeared from the user interface. This may require navigating away from and back to the Tables page.

Create a view.

```psql
CREATE VIEW TestView AS SELECT highway FROM vagar;
```

Check the table called _vagar_ in the user interface and see that it has acquired a relation to the view _TestView_.

Delete the view again.

```psql
DROP VIEW TestView;
```

Navigate away from the table _vagar_ and back again to see that it has lost the relation.
