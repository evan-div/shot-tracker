// Simple configuration arrays — edit these to change affiliates, shot types,
// or photographers without touching any component logic.

export interface Affiliate {
  id: string;
  name: string;
}

export interface ShotType {
  id: string;
  name: string;
}

export interface Photographer {
  id: string;
  name: string;
}

export const AFFILIATES: Affiliate[] = [
  { id: 'amy-porterfield', name: 'Amy Porterfield' },
  { id: 'jenna-kutcher', name: 'Jenna Kutcher' },
  { id: 'jessica-zweig', name: 'Jessica Zweig' },
  { id: 'kate-northrup', name: 'Kate Northrup' },
  { id: 'julie-solomon', name: 'Julie Solomon' },
  { id: 'adley-kinsman', name: 'Adley Kinsman' },
  { id: 'barbara-schreihans', name: 'Barbara Schreihans' },
  { id: 'stephanie-wigner', name: 'Dr. Stephanie Wigner' },
  { id: 'stacy-tuschl', name: 'Stacy Tuschl' },
  { id: 'ashley-brock', name: 'Ashley Brock' },
  { id: 'anna-nassery', name: 'Anna Nassery' },
];

export const SHOT_TYPES: ShotType[] = [
  { id: 'reveal-reaction', name: 'Reveal Reaction' },
  { id: 'screen-over-shoulder', name: 'Screen Over-Shoulder' },
  { id: 'two-shot-building', name: 'Two-Shot Building' },
  { id: 'callan-to-camera', name: 'Callan To-Camera' },
  { id: 'testimonial', name: 'Testimonial' },
  { id: 'hero-photo', name: 'Hero Photo' },
];

export const PHOTOGRAPHERS: Photographer[] = [
  { id: 'evan', name: 'Evan' },
  { id: 'serrano', name: 'Serrano' },
  { id: 'fran', name: 'Fran' },
];
