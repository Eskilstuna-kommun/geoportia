export function tableFilterOptions() {
  return [
    { key: 'Name', label: 'Name', binary: false },
    { key: 'System', label: 'System', binary: false },
    { key: 'Owner', label: 'Owner', binary: false },
    { key: 'Type', label: 'Type', binary: false },
    { key: 'Lifecycle', label: 'Lifecycle', binary: false },
    { key: 'Description', label: 'Description', binary: false },
    { key: 'Tags', label: 'Tags', binary: false },
    { key: 'evenName', label: 'Even', binary: true },
    { key: 'longName', label: 'Long', binary: true },
  ];
}


export function tableViewOptions() {
  return [
    { key: 'byggnader', label: 'byggnader', binary: false },
    { key: 'vagar', label: 'vagar', binary: false },
  ]
}

export function columnViewOptions() {
  return [
    { key: 'osm_id', label: 'osm_id', binary: false },
    { key: 'geom', label: 'geom', binary: false },
    { key: 'building', label: 'building', binary: false },
    { key: 'name', label: 'name', binary: false },
    { key: 'amenity', label: 'amenity', binary: false },
  ]
}    