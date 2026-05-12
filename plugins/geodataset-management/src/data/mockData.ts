export type DatasetEntry = {
  id: string;
  signaturstatus: 'error' | 'warning' | 'success';
  titel: string;
  skyddsklass: 'green' | 'yellow' | 'red';
  sammanfattning: string;
  oppenData: boolean;
};

export const sampleDatasetEntries: DatasetEntry[] = Array.from({ length: 15 }, (_, i) => ({
  id: String(i + 1),
  signaturstatus: ['error', 'warning', 'success'][i % 3] as 'error' | 'warning' | 'success',
  titel: 'a0_15_upptagninhsomraden 2017',
  skyddsklass: ['green', 'yellow', 'red'][i % 3] as 'green' | 'yellow' | 'red',
  sammanfattning: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod l',
  oppenData: i % 2 === 0,
}));
