/** All masses are tonnes; positions are metres in the selected model coordinates. */
export type LoadingWeight = {
  id: string;
  name: string;
  massTonnes: number;
  /** Transverse FSM in t·m, including liquid density. Omitted means assumed zero. */
  freeSurfaceMomentTransverse?: number;
  lcg: number;
  vcg: number;
  tcg: number;
};
export type LoadingResult = {
  displacementTonnes: number;
  freeSurfaceMomentTransverse: number;
  freeSurfaceCorrectionTransverse: number;
  virtualVcgTransverse: number;
  longitudinalMoment: number;
  verticalMoment: number;
  transverseMoment: number;
  lcg: number;
  vcg: number;
  tcg: number;
};
