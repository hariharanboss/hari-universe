export type BodyType = 'star' | 'planet' | 'moon';

export interface CelestialBody {
  id: string;
  displayName: string;
  type: BodyType;
}

function body(id: string, displayName: string, type: BodyType): CelestialBody {
  return { id, displayName, type };
}

export const BODIES = {
  SUN:     body('sun',     'Sun',     'star'),
  MERCURY: body('mercury', 'Mercury', 'planet'),
  VENUS:   body('venus',   'Venus',   'planet'),
  EARTH:   body('earth',   'Earth',   'planet'),
  MOON:    body('moon',    'Moon',    'moon'),
  MARS:    body('mars',    'Mars',    'planet'),
  JUPITER: body('jupiter', 'Jupiter', 'planet'),
  SATURN:  body('saturn',  'Saturn',  'planet'),
  URANUS:  body('uranus',  'Uranus',  'planet'),
  NEPTUNE: body('neptune', 'Neptune', 'planet'),
};
