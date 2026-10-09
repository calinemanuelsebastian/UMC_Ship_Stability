export const dunnageProfiles=['unspecified','boxed','ventilated','drums','rolls','dangerous'] as const;
export type DunnageProfile=typeof dunnageProfiles[number];
