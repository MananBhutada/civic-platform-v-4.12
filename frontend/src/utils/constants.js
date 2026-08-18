export const CATEGORIES = [
  { value: 'pothole', label: 'Pothole', icon: '\u{1F573}\uFE0F' },
  { value: 'garbage', label: 'Garbage', icon: '\u{1F5D1}\uFE0F' },
  { value: 'streetlight', label: 'Streetlight', icon: '\u{1F4A1}' },
  { value: 'water_leakage', label: 'Water Leakage', icon: '\u{1F6B0}' },
  { value: 'drainage', label: 'Drainage', icon: '\u{1F327}\uFE0F' },
  { value: 'illegal_dumping', label: 'Illegal Dumping', icon: '\u{1F6AE}' },
];

export const categoryLabel = (v) => CATEGORIES.find((c) => c.value === v)?.label || v || 'Uncategorised';

export const OFFICER_RANKS = [
  { value: 'officer', label: 'Officer' },
  { value: 'senior_officer', label: 'Senior Officer' },
  { value: 'department_head', label: 'Department Head' },
  { value: 'commissioner', label: 'Commissioner' },
];
