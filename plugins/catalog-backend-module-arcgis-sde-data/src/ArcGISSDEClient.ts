import axios from 'axios';
import {
  ArcGISDomain,
  ArcGISDomainValue,
  ArcGISFeatureClassField,
} from '@internal/backstage-plugin-arcgis-sde-data-common';

interface DataSet {
  name: string;
  featureClasses: string[];
}

interface DataSetPostResponse {
  datasets: DataSet[];
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
  private adminUser: string;
  private adminPassword: string;
  private database: string;

  constructor(
    endpoint: string,
    adminUser: string,
    adminPassword: string,
    database: string,
  ) {
    this.endpoint = endpoint;
    this.adminUser = adminUser;
    this.adminPassword = adminPassword;
    this.database = database;
  }

  // Fetch feature classes from the ArcGIS SDE database
  fetchDataSets = async (): Promise<DataSet[]> => {
    const requestBody = {
      database: this.database,
      adminUser: this.adminUser,
      adminPassword: this.adminPassword,
    };

    try {
      const response = await axios.post<DataSetPostResponse>(
        `${this.endpoint}/datasets`,
        requestBody,
      );
      if (response.data.success) {
        return response.data.datasets;
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
    dataSet: string,
    featureClass: string,
  ): Promise<ArcGISFeatureClassField[]> => {
    const requestBody = {
      dataset: dataSet,
      featureClass: featureClass,
      database: this.database,
      adminUser: this.adminUser,
      adminPassword: this.adminPassword,
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
      database: this.database,
      adminUser: this.adminUser,
      adminPassword: this.adminPassword,
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
      database: this.database,
      adminUser: this.adminUser,
      adminPassword: this.adminPassword,
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
