import axios from 'axios';

interface FeatureClassPostResponse {
  featureClasses: string[];
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

interface FieldsPostResponse {
  columns: Field[];
  message: string;
  success: boolean;
}

export class ArcGISSDEClient {
  private endpoint: string;
  private gdbPath: string;

  constructor(endpoint: string, gdbPath: string) {
    this.endpoint = endpoint;
    this.gdbPath = gdbPath;
  }

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
        throw new Error('Request was not successful: ' + response.data.message);
      }
    } catch (error) {
      console.error('Error sending POST request:', error);
      throw error;
    }
  };

  fetchFields = async (
    featureClass: string,
  ): Promise<Field[]> => {
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
        throw new Error('Request was not successful: ' + response.data.message);
      }
    } catch (error) {
      console.error('Error sending POST request:', error);
      throw error;
    }
  };
}