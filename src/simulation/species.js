export const SPECIES = Object.freeze({
  moss: { name: 'Moss', water: [60, 85], light: [25, 55], waterLabel: 'High', lightLabel: 'Soft', color: '#78a643' },
  fern: { name: 'Fern', water: [45, 70], light: [40, 75], waterLabel: 'Medium', lightLabel: 'Medium', color: '#43864c' },
  succulent: { name: 'Succulent', water: [20, 45], light: [60, 85], waterLabel: 'Low', lightLabel: 'Bright', color: '#6aa995' },
  fittonia: { name: 'Fittonia', water: [55, 80], light: [35, 65], waterLabel: 'High', lightLabel: 'Soft', color: '#557d47' },
});

export const SLOTS = Object.freeze([
  { name: 'Front Left', x: -1, z: 0.6 },
  { name: 'Front Right', x: 1, z: 0.6 },
  { name: 'Back Center', x: 0, z: -0.9 },
]);
export const INITIAL_LAMP = Object.freeze({ x: 1.7, z: -1.8 });
