export type ReviewItem = {
  id: string;
  title: string;
  summary: string;
  uuid: string;
  dataType: string;
  owner: string;
  adminRoutine: string;
  maintenanceFrequency: string;
  history: string[];
  protectionClass: string;
  openData: boolean;
};

export const mockReviewItems: ReviewItem[] = [
  {
    id: '1',
    title: 'Betongsugga',
    summary: 'Betongsugga tillhörande Eskilstunas trafikhinder.',
    uuid: 'fae0322d-4fec-4fbc-941f-73feeab6cdcd',
    dataType: 'Punkt',
    owner: 'Stadsbyggnadsförvaltningen',
    adminRoutine:
      'Informationsägare får stöd av kontaktperson på projekt- och GIS-avdelningen som står för teknisk kvalitetssäkring.',
    maintenanceFrequency: 'Vid behov - data uppdateras vid behov',
    history: [
      'Källa: *Inte känt *– när information saknas',
      'Kvalitet: *Inte känt *– när information saknas',
      'Datainsamlingsmetod: Fotogrammetrisk. Digital (Digital kamera, DMC)',
      'Bearbetningssteg: *Inte känt *– när information saknas',
    ],
    protectionClass: 'Inget skyddsbehov',
    openData: true,
  },
  {
    id: '2',
    title: 'a0_15_upptagninhsomra',
    summary: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit...',
    uuid: 'fae0322d-4fec-4fbc-941f-73feeab6cdce',
    dataType: 'Polygon',
    owner: 'Stadsbyggnadsförvaltningen',
    adminRoutine: 'Lorem ipsum dolor sit amet.',
    maintenanceFrequency: 'Årligen',
    history: ['Källa: Lorem ipsum'],
    protectionClass: 'Inget skyddsbehov',
    openData: true,
  },
  {
    id: '3',
    title: 'a0_15_upptagninhsomra',
    summary: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit...',
    uuid: 'fae0322d-4fec-4fbc-941f-73feeab6cdcf',
    dataType: 'Polygon',
    owner: 'Stadsbyggnadsförvaltningen',
    adminRoutine: 'Lorem ipsum dolor sit amet.',
    maintenanceFrequency: 'Årligen',
    history: ['Källa: Lorem ipsum'],
    protectionClass: 'Inget skyddsbehov',
    openData: true,
  },
];
