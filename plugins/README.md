# The Plugins Folder

This is where your own plugins and their associated modules live, each in a
separate folder of its own.

If you want to create a new plugin here, go to your project root directory, run
the command `yarn new`, and follow the on-screen instructions.

You can also check out existing plugins on [the plugin marketplace](https://backstage.io/plugins)!

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

Check the table called _vagar_ in the user interface and see that it has acquired a relation to the view _TestView_.

Delete the view again.

```psql
DROP VIEW TestView;
```

Navigate away from the table _vagar_ and back again to see that it has lost the relation.