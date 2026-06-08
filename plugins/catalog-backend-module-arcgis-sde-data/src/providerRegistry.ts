import { ArcGISSDEDataProvider } from './ArcGISSDEDataProvider';

class ArcGISSDEProviderRegistry {
  private providers = new Map<string, ArcGISSDEDataProvider>();

  register(databaseName: string, provider: ArcGISSDEDataProvider): void {
    this.providers.set(databaseName, provider);
  }

  async refreshProvider(databaseName: string): Promise<boolean> {
    const provider = this.providers.get(databaseName);
    if (!provider) {
      return false;
    }
    await provider.run();
    return true;
  }
}

export const arcGISSDEProviderRegistry = new ArcGISSDEProviderRegistry();
