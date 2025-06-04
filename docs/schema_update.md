# The schema_update notification triggers

The following page describes the way that the catalogue is kept notified of changes to the Postgis database.

The demo.sql database specification contains two triggers, ''on_ddl_schema_change'' and ''on_drop_schema_change'', that are called when significant changes are made to the database schema. Both trigger a notification to the channel ''schema_update'' with the message "reload schema."

There are no listeners to the channel at this time. The intent is for one to be added to the postgreSQL plugin to ensure that the database entities are kept up to date.

Note that since demo.sql has been changed, the docker-compose.yml resource must be spun up again for the changes to the database to take effect.



# Testing

To test the notification system, first spin the Postgis container back up:
 
 ```
docker compose -f 'docker-compose.yml' up -d --build
 ```

Then start a psql prompt and enter the command:

```psql
LISTEN schema_update;
```

The prompt should respond with "LISTEN" and nothing further.

Create a table and drop it again, then run the LISTEN command again.

```psql
CREATE TABLE TestTable (id SERIAL PRIMARY KEY);
```
```psql
DROP TABLE TestTable;
```
```psql
LISTEN schema_update;
```

The prompt should print out two logged notifications with the message "reload schema."