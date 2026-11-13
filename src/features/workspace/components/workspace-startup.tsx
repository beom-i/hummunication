"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { EntrySplash } from "./entry-splash";

const StartupContext = createContext({ entering: true, onReady: () => {} });

export function WorkspaceStartup({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [entering, setEntering] = useState(true);
  const onReady = useCallback(() => setReady(true), []);
  const onComplete = useCallback(() => setEntering(false), []);

  return <StartupContext.Provider value={{ entering, onReady }}>
    <div className="contents" inert={entering}>{children}</div>
    {entering && <EntrySplash ready={ready} onComplete={onComplete} />}
  </StartupContext.Provider>;
}

export const useWorkspaceStartup = () => useContext(StartupContext);
