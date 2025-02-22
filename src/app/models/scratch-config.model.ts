export interface ScratchConfig {
  scratchType: SCRATCH_TYPE;
  containerWidth: number;
  containerHeight: number;
  imageForwardSrc: string;
  imageBackgroundSrc: string;
  htmlBackground: string;
  clearZoneRadius: number;
  nPoints: number;
  pointSize: number;
  percentToFinish: number;
  callback?: () => void;
  brushSrc: string;
  cursor: {
    cur: string;
    png: string;
    poosition: number[];
  };
  enabledPercentUpdate: boolean;
}
export enum SCRATCH_TYPE {
  BRUSH,
  SPRAY,
  CIRCLE,
}
