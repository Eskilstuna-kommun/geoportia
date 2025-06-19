import { LoggerService } from '@backstage/backend-plugin-api';
import createSubscriber from 'pg-listen';

// A class that listens on the schema_update channel in PostgreSQL and calls the update function when a notification is received.
export class PostgresNotificationService {
  private subscriber: ReturnType<typeof createSubscriber>;
  private update: (
    updateType: string,
    entityType: string,
    entityName: string,
    schemaName: string,
    comment?: string,
  ) => void;
  private logger: LoggerService;

  constructor(
    connectionString: string,
    updateFunction: (
      updateType: string,
      entityType: string,
      entityName: string,
      schemaName: string,
      comment?: string,
    ) => void,
    logger: LoggerService,
  ) {
    this.subscriber = createSubscriber({ connectionString });
    this.update = updateFunction;
    this.logger = logger;
  }

  async start() {
    this.subscriber.notifications.on('schema_update', payload => {
      this.logger.debug(
        `Received schema_update notification: ${JSON.stringify(payload)}`);
      try {
        const { update, type, schema, identity, comment } = payload;
        this.update(update, type, identity, schema, comment);
      } catch (error) {
        this.logger.error(
          'Error processing schema_update notification: ' +
            JSON.stringify(error),
        );
      }
    });

    this.subscriber.events.on('error', error => {
      this.logger.error('Fatal database connection error:', error);
      process.exit(1);
    });

    await this.subscriber.connect();
    await this.subscriber.listenTo('schema_update');

    process.on('exit', () => {
      this.subscriber.close();
    });
  }
}
