declare module 'virtual:exercise-catalog' {
  export const exerciseModules: Record<string, string>;
  export const exerciseSections: Record<string, string>;
}

declare module 'virtual:manuscript-index' {
  export const manuscript: Record<string, { terms: string; exercises: string[] }>;
}
