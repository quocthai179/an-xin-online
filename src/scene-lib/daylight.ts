export interface Daylight {
  evening: boolean;
  sky: string;
  fog: string;
  hemiSky: string;
  hemiGround: string;
  hemi: number;
  sun: string;
  sunIntensity: number;
  bulb: string;
}

export function isEvening(hour: number): boolean {
  return hour >= 17.5 || hour < 5.5;
}

/** `override` comes from `?t=night|day` (handy for screenshots and demos). */
export function daylight(hour: number, override?: string | null): Daylight {
  const evening = override === 'night' ? true : override === 'day' ? false : isEvening(hour);
  return evening
    ? {
        evening,
        sky: '#1c1940',
        fog: '#2a2552',
        hemiSky: '#7f8fe0',
        hemiGround: '#2c2448',
        hemi: 1.1,
        sun: '#8fa6ff',
        sunIntensity: 0.9,
        bulb: '#ffe08a',
      }
    : {
        evening,
        sky: '#bfe0f2',
        fog: '#f3dfbd',
        hemiSky: '#ffffff',
        hemiGround: '#c8ae88',
        hemi: 1.55,
        sun: '#fff1d0',
        sunIntensity: 2.2,
        bulb: '#d8d4c6',
      };
}
