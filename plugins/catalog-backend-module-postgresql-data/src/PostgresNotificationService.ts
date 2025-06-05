import createSubscriber from "pg-listen";

export class PostgresNotificationService {
  private subscriber: ReturnType<typeof createSubscriber>;
  private update: () => void;

  constructor(connectionString: string, updateFunction: () => void) {
    this.subscriber = createSubscriber({ connectionString });
    this.update = updateFunction;
  }

  async start() {
    this.subscriber.notifications.on("schema_update", payload => {
      this.update();
      console.log("Received notification in 'schema_update':", payload);
    });

    this.subscriber.events.on("error", error => {
      console.error("Fatal database connection error:", error);
      process.exit(1);
    });

    await this.subscriber.connect();
    await this.subscriber.listenTo("schema_update");

    process.on("exit", () => {
      this.subscriber.close();
    });
  }
}