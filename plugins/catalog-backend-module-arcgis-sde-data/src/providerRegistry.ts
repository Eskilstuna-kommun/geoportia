import { ArcGISSDEDataProvider } from './ArcGISSDEDataProvider';

class ArcGISSDEProviderRegistry {
  private providers = new Map<string, ArcGISSDEDataProvider>();

  register(databaseName: string, provider: ArcGISSDEDataProvider): void {
    this.providers.set(databaseName, provider);
  }

  get(databaseName: string): ArcGISSDEDataProvider | undefined {
    return this.providers.get(databaseName);
  }

  getAll(): Map<string, ArcGISSDEDataProvider> {
    return new Map(this.providers);
  }

  async refreshProvider(databaseName: string): Promise<boolean> {
    const provider = this.providers.get(databaseName);
    if (!provider) {
      return false;
    }
    await provider.run();
    return true;
  }

  async refreshAll(): Promise<void> {
    const refreshPromises = Array.from(this.providers.values()).map(provider =>
      provider.run(),
    );
    await Promise.all(refreshPromises);
  }
}

export const arcGISSDEProviderRegistry = new ArcGISSDEProviderRegistry();
