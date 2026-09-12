import React, { createContext, useContext } from 'react';

/// Whether the subtree is the tab you are actually looking at.
///
/// Every tab stays mounted so it keeps its scroll position and zoom, which means the
/// three you cannot see are still live React trees. Anything that animates forever -
/// the sway on every PlantSprite - should ask this before starting a loop, or the app
/// pays for four screens' worth of animation while showing one.
const VisibleContext = createContext(true);

export const VisibilityProvider = VisibleContext.Provider;

export function useIsVisible(): boolean {
  return useContext(VisibleContext);
}
