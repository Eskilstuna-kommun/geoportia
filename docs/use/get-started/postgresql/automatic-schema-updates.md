# Automatic schema update

The following page describes the way that the catalogue is kept notified of changes to the Postgis database schema.

The database schema should contains two triggers, _on_ddl_schema_change_ and _on_drop_schema_change_, that are called when significant changes are made to the database schema. Both trigger a notification to the channel _schema_update_ containing a JSON object with a _message_ property information of which trigger generated it.

The notification will be picked up by the listener in the catalog-backend-module-postgresql-data plugin, which then reloads the database.

# The triggers

Add the following to the schema of your connected PostgreSQL database:

```psql
-- watch CREATE and ALTER
CREATE OR REPLACE FUNCTION notify_ddl_watch() RETURNS event_trigger AS $$
DECLARE
  cmd record;
  comment text;
  commentLine text;
BEGIN
  FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    IF cmd.command_tag IN (
      'CREATE TABLE'
    , 'CREATE TABLE AS'
    , 'CREATE FOREIGN TABLE'
    , 'COMMENT'
    , 'CREATE VIEW'
    , 'ALTER VIEW'
    , 'CREATE MATERIALIZED VIEW'
    , 'ALTER MATERIALIZED VIEW'
    )
    -- don't notify in case of CREATE TEMP table or other objects created on pg_temp
    AND cmd.schema_name is distinct from 'pg_temp'
    THEN
      SELECT obj_description(cmd.object_identity::regclass, 'pg_class') INTO comment;

      IF comment IS NULL THEN
        commentLine := '';
      ELSE
        commentLine := '", "comment": "' || replace(replace(comment, '"', '\"'), '\n', '\\n');
      END IF;
      PERFORM pg_notify('schema_update', '{ "update": "ALTER", ' ||
      '"type": "' || cmd.object_type || '", ' ||
      '"schema": "' || cmd.schema_name || '", ' ||
      '"identity": "' || cmd.object_identity || '", ' ||
      '"tag": "' || cmd.command_tag || 
      commentLine ||
      '" }'
      );
    END IF;
  END LOOP;
END; $$ LANGUAGE plpgsql;

-- watch DROP
CREATE OR REPLACE FUNCTION notify_drop_watch() RETURNS event_trigger AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_dropped_objects()
  LOOP
    IF obj.object_type IN (
      'table'
    , 'view'
    )
    AND obj.is_temporary IS false -- no pg_temp objects
    THEN
      PERFORM pg_notify('schema_update', '{ "update": "DROP", ' || 
      '"type": "' || obj.object_type || 
      '", "schema": "' || obj.schema_name ||
      '", "identity": "' || obj.object_identity || 
      '", "name": "' || obj.object_name || 
      '" }'
      ); 
    END IF;
  END LOOP;
END; $$ LANGUAGE plpgsql;

CREATE EVENT TRIGGER on_ddl_schema_change
  ON ddl_command_end
  EXECUTE PROCEDURE notify_ddl_watch();

CREATE EVENT TRIGGER on_drop_schema_change
  ON sql_drop
  EXECUTE PROCEDURE notify_drop_watch();
```
