export interface SubmissionBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

export function normalizeSubmissionBounds(bounds: SubmissionBounds): SubmissionBounds {
  const wrapLongitude = (lng: number) => ((lng + 180) % 360 + 360) % 360 - 180;
  // MapLibre có thể trả kinh độ ngoài ±180 khi pan qua các bản sao của thế giới.
  const fullWorld = bounds.east - bounds.west >= 360;
  return {
    west: fullWorld ? -180 : wrapLongitude(bounds.west),
    east: fullWorld ? 180 : wrapLongitude(bounds.east),
    south: Math.max(-90, Math.min(90, bounds.south)),
    north: Math.max(-90, Math.min(90, bounds.north)),
  };
}
