"use client";
import { sdk } from "@farcaster/frame-sdk";
// Use any types for Farcaster SDK compatibility
type FrameContext = any;
type AddFrameResult = any;
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

interface MiniAppContextType {
  isMiniAppReady: boolean;
  context: FrameContext | null;
  setMiniAppReady: () => void;
  addMiniApp: () => Promise<AddFrameResult | null>;
}

const MiniAppContext = createContext<MiniAppContextType | undefined>(undefined);

interface MiniAppProviderProps {
  addMiniAppOnLoad?: boolean;
  children: ReactNode;
}

export function MiniAppProvider({ children, addMiniAppOnLoad }: MiniAppProviderProps): JSX.Element {
  const [context, setContext] = useState<FrameContext | null>(null);
  // Start as ready in development or if not in a Farcaster environment
  const [isMiniAppReady, setIsMiniAppReady] = useState(
    typeof window !== 'undefined' && (
      process.env.NODE_ENV === 'development' ||
      !window.location.href.includes('farcaster')
    )
  );

  const setMiniAppReady = useCallback(async () => {
    try {
      // Check if SDK is available
      if (typeof sdk !== 'undefined' && sdk.context) {
        const context = await sdk.context;
        if (context) {
          setContext(context);
        }
        // Check if ready method exists
        if (sdk.actions?.ready) {
          await sdk.actions.ready();
        }
      }
    } catch (err) {
      console.error("SDK initialization error:", err);
    } finally {
      setIsMiniAppReady(true);
    }
  }, []);

  useEffect(() => {
    // Always try to initialize, but don't block if already ready
    setMiniAppReady().then(() => {
      console.log("MiniApp loaded");
    });
  }, [setMiniAppReady]);

  const handleAddMiniApp = useCallback(async () => {
    try {
      // Check if addFrame method exists
      if (sdk.actions?.addFrame) {
        const result = await sdk.actions.addFrame();
        if (result) {
          return result;
        }
      }
      return null;
    } catch (error) {
      console.error("[error] adding frame", error);
      return null;
    }
  }, []);

  useEffect(() => {
    // on load, set the frame as ready
    if (isMiniAppReady && !context?.client?.added && addMiniAppOnLoad) {
      handleAddMiniApp();
    }
  }, [
    isMiniAppReady,
    context?.client?.added,
    handleAddMiniApp,
    addMiniAppOnLoad,
  ]);

  return (
    <MiniAppContext.Provider
      value={{
        isMiniAppReady,
        setMiniAppReady,
        addMiniApp: handleAddMiniApp,
        context,
      }}
    >
      {children}
    </MiniAppContext.Provider>
  );
}

export function useMiniApp(): MiniAppContextType {
  const context = useContext(MiniAppContext);
  if (context === undefined) {
    throw new Error("useMiniApp must be used within a MiniAppProvider");
  }
  return context;
}
