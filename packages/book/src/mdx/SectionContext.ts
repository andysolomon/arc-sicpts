import { createContext, useContext } from 'react';

/** The id of the section being rendered, e.g. `1.2.1`; names its storage keys. */
export const SectionContext = createContext<string>('page');

export const useSectionId = (): string => useContext(SectionContext);
