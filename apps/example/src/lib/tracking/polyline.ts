/**
 * Encoded-polyline codec (Google polyline algorithm). Valhalla legs use
 * 6 decimal digits of precision ("polyline6").
 *
 * Decoded positions are returned as [lon, lat] pairs, ready for a GeoJSON
 * LineString.
 */

export function decodePolyline(
  encoded: string,
  precision: number = 6
): [number, number][] {
  const factor = 10 ** precision;
  const coordinates: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lon = 0;

  while (index < encoded.length) {
    lat += decodeDelta();
    lon += decodeDelta();
    coordinates.push([lon / factor, lat / factor]);
  }

  return coordinates;

  function decodeDelta(): number {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    return result & 1 ? ~(result >> 1) : result >> 1;
  }
}

export function encodePolyline(
  coordinates: [number, number][],
  precision: number = 6
): string {
  const factor = 10 ** precision;
  let output = '';
  let prevLat = 0;
  let prevLon = 0;

  for (const [lon, lat] of coordinates) {
    const latInt = Math.round(lat * factor);
    const lonInt = Math.round(lon * factor);
    output += encodeDelta(latInt - prevLat) + encodeDelta(lonInt - prevLon);
    prevLat = latInt;
    prevLon = lonInt;
  }

  return output;

  function encodeDelta(delta: number): string {
    let value = delta < 0 ? ~(delta << 1) : delta << 1;
    let chunk = '';
    while (value >= 0x20) {
      chunk += String.fromCharCode((0x20 | (value & 0x1f)) + 63);
      value >>= 5;
    }
    return chunk + String.fromCharCode(value + 63);
  }
}