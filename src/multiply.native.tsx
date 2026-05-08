import { NitroModules } from 'react-native-nitro-modules';
import type { NitroBackgroundGeolocation } from './NitroBackgroundGeolocation.nitro';

const NitroBackgroundGeolocationHybridObject =
  NitroModules.createHybridObject<NitroBackgroundGeolocation>('NitroBackgroundGeolocation');

export function multiply(a: number, b: number): number {
  return NitroBackgroundGeolocationHybridObject.multiply(a, b);
}
