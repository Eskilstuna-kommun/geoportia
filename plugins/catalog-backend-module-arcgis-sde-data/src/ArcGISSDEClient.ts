import axios from 'axios';

interface FeatureClassPostResponse {
  featureClasses: string[];
  message: string;
  success: boolean;
}

interface DomainsPostResponse {
  domains: Domain[];
  message: string;
  success: boolean;
}

interface FieldsPostResponse {
  columns: Field[];
  message: string;
  success: boolean;
}

interface DomainValuesPostresponse {
  domain_parents: Domain[];
  domain_values: DomainValue[];
  message: string;
  success: boolean;
}

interface Field {
    aliasName: string;
    domain: string;
    fieldPrecision: number;
    fieldScale: number;
    isNullable: boolean;
    length: number;
    name: string;
    type: string;
}

interface Domain {
    domainType: string;
    fieldType: string;
    name: string;
}

interface DomainValue {
  code: number;
  description: string;
}

export class ArcGISSDEClient {
  private endpoint: string;
  private gdbPath: string;

  constructor(endpoint: string, gdbPath: string) {
    this.endpoint = endpoint;
    this.gdbPath = gdbPath;
  }

  // Fetch feature classes from the ArcGIS SDE database
  fetchFeatureClasses = async (): Promise<string[]> => {
    const requestBody = {
      gdbPath: this.gdbPath,
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
  fetchFields = async (featureClass: string): Promise<Field[]> => {
    const requestBody = {
      featureClass: featureClass,
      dataset: 'root',
      gdbPath: this.gdbPath,
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
  fetchDomains = async (): Promise<Domain[]> => {
    const requestBody = {
      gdbPath: this.gdbPath,
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
  fetchDomainValues = async (domain: string): Promise<DomainValue[]> => {
    const requestBody = {
      gdbPath: this.gdbPath,
      domain: domain,
    };

    try {
      const response = await axios.post<DomainValuesPostresponse>(
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