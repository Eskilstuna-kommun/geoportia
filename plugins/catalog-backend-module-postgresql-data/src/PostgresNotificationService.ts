import { LoggerService } from '@backstage/backend-plugin-api';
import createSubscriber from 'pg-listen';

// A class that listens on the schema_update channel in PostgreSQL and calls the update function when a notification is received.
export class PostgresNotificationService {
  private subscriber: ReturnType<typeof createSubscriber>;
  private update: () => void;
  private logger: LoggerService;

  constructor(
    connectionString: string,
    updateFunction: () => void,
    logger: LoggerService,
  ) {
    this.subscriber = createSubscriber({ connectionString });
    this.update = updateFunction;
    this.logger = logger;
  }

  async start() {
    this.subscriber.notifications.on('schema_update', _payload => {
      this.logger.info('Received schema update notification from PostgreSQL');
      this.update();
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
