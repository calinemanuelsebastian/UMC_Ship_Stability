export const tabs = [
  { id: 'home', label: 'Home' },
  { id: 'loading', label: 'Loading' },
  { id: 'view3d', label: '3D View' },
  { id: 'trim', label: 'Trim & Drafts' },
  { id: 'hydrostatics', label: 'Hydrostatic Sandbox' },
  { id: 'stability', label: 'Assessment' },
  { id: 'roll', label: 'Roll Simulation' },
  { id: 'validation', label: 'Reference checks' },
  { id: 'theory', label: 'Theory' },
] as const;
export type TabId = typeof tabs[number]['id'];
