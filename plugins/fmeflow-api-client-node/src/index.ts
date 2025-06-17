import fetch from 'node-fetch';

export interface FMEFlowClientOptions {
  baseUrl: string;
  repository: string;
  token?: string;
}

export interface FMEFlowItem {
  name: string;
  title?: string;
  description?: string;
  lastPublishDate?: string;
  type?: string;
}

export interface FMEFlowFeatureType {
  name: string;
}

export interface FMEFlowDataset {
  format: string;
  name: string;
  location: string;
  source: boolean;
  featuretypes: FMEFlowFeatureType[];
}

export class FMEFlowClient {
  private readonly baseUrl: string;
  private readonly repository: string;
  private readonly token?: string;

  constructor(options: FMEFlowClientOptions) {
    this.baseUrl = options.baseUrl;
    this.repository = options.repository;
    this.token = options.token;
  }

  async fetchRepositoryItems(): Promise<FMEFlowItem[]> {
    const url = `${this.baseUrl}/repositories/${this.repository}/items?type=WORKSPACE`;

    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        ...(this.token && { Authorization: `fmetoken token=${this.token}` }),
      },
    });

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(
        `FME Flow API call failed [${res.status} ${res.statusText}] — ${errorBody}`,
      );
    }

    const json = await res.json();
    return json.items ?? [];
  }
}
