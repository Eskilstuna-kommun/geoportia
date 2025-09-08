import axios from 'axios';
import {
  ArcGISDomain,
  ArcGISDomainValue,
  ArcGISFeatureClassField,
} from '@internal/backstage-plugin-arcgis-sde-data-common';

interface FeatureClassPostResponse {
  featureClasses: string[];
  message: string;
  success: boolean;
}

interface DomainsPostResponse {
  domains: ArcGISDomain[];
  message: string;
  success: boolean;
}

interface FieldsPostResponse {
  columns: ArcGISFeatureClassField[];
  message: string;
  success: boolean;
}

interface DomainValuesPostResponse {
  domain_parents: ArcGISDomain[];
  domain_values: ArcGISDomainValue[];
  message: string;
  success: boolean;
}

export class ArcGISSDEClient {
  private endpoint: string;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
  }

  // Fetch feature classes from the ArcGIS SDE database
  fetchFeatureClasses = async (): Promise<string[]> => {
    const requestBody = {
      database: 'somedatabase',
      adminUser: 'someadmin',
      adminPassword: 'somepassword',
    };

    try {
      const response = await axios.post<FeatureClassPostResponse>(
        `${this.endpoint}/featureclasses`,
        requestBody,
      );
      if (response.data.success) {
        return response.data.featureClasses;
      } else {
        throw new Error(
          'Request for ArcGIS feature classes was not successful: ' +
            response.data.message,
        );
      }
    } catch (error) {
      console.error('Error fetching ArcGIS feature classes:', error);
      throw error;
    }
  };

  // Fetch fields for a specific feature class from the ArcGIS SDE database
  fetchFields = async (
    featureClass: string,
  ): Promise<ArcGISFeatureClassField[]> => {
    const requestBody = {
      dataset: 'root',
      featureClass: featureClass,
      database: 'somedatabase',
      adminUser: 'someadmin',
      adminPassword: 'somepassword',
    };

    try {
      const response = await axios.post<FieldsPostResponse>(
        `${this.endpoint}/sdedatabase`,
        requestBody,
      );
      if (response.data.success) {
        return response.data.columns;
      } else {
        throw new Error(
          'Request for ArcGIS fields was not successful: ' +
            response.data.message,
        );
      }
    } catch (error) {
      console.error('Error fetching ArcGIS fields:', error);
      throw error;
    }
  };

  // Fetch domains from the ArcGIS SDE database
  fetchDomains = async (): Promise<ArcGISDomain[]> => {
    const requestBody = {
      database: 'somedatabase',
      adminUser: 'someadmin',
      adminPassword: 'somepassword',
    };

    try {
      const response = await axios.post<DomainsPostResponse>(
        `${this.endpoint}/domains`,
        requestBody,
      );
      if (response.data.success) {
        return response.data.domains;
      } else {
        throw new Error(
          'Request for ArcGIS domains was not successful: ' +
            response.data.message,
        );
      }
    } catch (error) {
      console.error('Error fetching ArcGIS domains:', error);
      throw error;
    }
  };

  // Fetch domain values for a specific domain from the ArcGIS SDE database
  fetchDomainValues = async (domain: string): Promise<ArcGISDomainValue[]> => {
    const requestBody = {
      domain: domain,
      database: 'somedatabase',
      adminUser: 'someadmin',
      adminPassword: 'somepassword',
    };

    try {
      const response = await axios.post<DomainValuesPostResponse>(
        `${this.endpoint}/domain`,
        requestBody,
      );
      if (response.data.success) {
        return response.data.domain_values;
      } else {
        throw new Error(
          'Request for ArcGIS domain values was not successful: ' +
            response.data.message,
        );
      }
    } catch (error) {
      console.error('Error fetching ArcGIS domain values:', error);
      throw error;
    }
  };
}
