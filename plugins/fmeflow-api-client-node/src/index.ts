import { FMELogEntry } from '@internal/fmeflow-common/src/extractDatabaseRelations';
import fetch from 'node-fetch';

export interface FMELogData {
  items: FMELogEntry[];
}

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

export interface CompletedWorkspaceJob {
  id: number;
  workspace: string;
}

export interface FMEFlowFeatureType {
  name: string;
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

  private _fetchHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `fmetoken token=${this.token}`;
    }
    return headers;
  }

  async fetchRepositoryItems(): Promise<FMEFlowItem[]> {
    const url = `${this.baseUrl}/repositories/${this.repository}/items?type=WORKSPACE`;

    const res = await fetch(url, {
      headers: this._fetchHeaders(),
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

  async fetchCompletedJobs(): Promise<CompletedWorkspaceJob[]> {
    const url = `${this.baseUrl}/transformations/jobs/completed?completedState=success&limit=100&offset=0&repository=${this.repository}`;

    const res = await fetch(url, {
      headers: this._fetchHeaders(),
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

  async fetchLogsForJob(id: number): Promise<FMELogData> {
    const url = `${this.baseUrl}/transformations/jobs/id/${id}/log`;

    const res = await fetch(url, {
      headers: this._fetchHeaders(),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(
        `FME Flow API call failed [${res.status} ${res.statusText}] — ${errorBody}`,
      );
    }

    const json = await res.json();
    return json;
  }
}
