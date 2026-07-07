export const colors = {
  paper: '#F7F5F0',
  ink: '#1D2A38',
  inkMuted: '#6B7683',
  highlight: '#F4D35E',
  sage: '#6B8F71',
  rust: '#C1666B',
  cardBorder: '#D8D3C8',
  cardBg: '#FFFFFF',
  dot: '#D9D3C4',
} as const;

export const fontFamily = {
  serif: 'Fraunces_700Bold',
  serifRegular: 'Fraunces_400Regular',
  body: 'Inter_400Regular',
  bodySemiBold: 'Inter_600SemiBold',
  mono: 'IBMPlexMono_400Regular',
  monoMedium: 'IBMPlexMono_500Medium',
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  lg: 18,
  xl: 22,
  '2xl': 28,
  '3xl': 36,
} as const;

export const radius = {
  card: 12,
  button: 8,
  tag: 4,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
} as const;

// Card rotations for the "paper stack" feel — index → degrees
const ROTATIONS = [-0.5, 0.3, -0.2, 0.4, -0.4, 0.2, 0.5, -0.3, 0, 0.1] as const;
export const cardRotation = (index: number): number =>
  ROTATIONS[index % ROTATIONS.length];

// Course color palette — assigned automatically to new courses, editable per course.
export const courseColors = [
  { name: 'indigo', hex: '#5B6ABF' },
  { name: 'salvia', hex: '#6B8F71' },
  { name: 'ockra', hex: '#C08552' },
  { name: 'plommon', hex: '#8E5B7A' },
  { name: 'petrol', hex: '#4A7A8C' },
  { name: 'rost', hex: '#C1666B' },
] as const;

// First palette color not already used by an existing course; once all are
// taken, cycles through the palette by course count.
export function nextCourseColor(usedHexes: (string | null | undefined)[]): string {
  const used = new Set(usedHexes.filter(Boolean));
  const free = courseColors.find(c => !used.has(c.hex));
  if (free) return free.hex;
  return courseColors[usedHexes.length % courseColors.length].hex;
}
