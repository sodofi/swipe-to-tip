"use client";
import { useMiniApp } from "@/contexts/miniapp-context";
import { useAccount, useConnect } from "wagmi";
import { useEffect } from "react";
import SwipeToGive from "@/components/swipe-to-give";

export default function Home() {
  const { isMiniAppReady } = useMiniApp();
  
  // Wallet connection hooks
  const { isConnected, isConnecting } = useAccount();
  const { connect, connectors } = useConnect();
  
  // Auto-connect wallet when miniapp is ready
  useEffect(() => {
    if (isMiniAppReady && !isConnected && !isConnecting && connectors.length > 0) {
      const farcasterConnector = connectors.find(c => c.id === 'farcaster');
      if (farcasterConnector) {
        connect({ connector: farcasterConnector });
      }
    }
  }, [isMiniAppReady, isConnected, isConnecting, connectors, connect]);
  
  if (!isMiniAppReady) {
    return (
      <main className="flex-1">
        <section className="flex items-center justify-center min-h-screen bg-celo-tan-light">
          <div className="brutalist-card bg-black p-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-celo-yellow mx-auto mb-6"></div>
            <p className="brutalist-body text-celo-yellow text-xl brutalist-heavy uppercase tracking-widest">
              INITIALIZING...
            </p>
          </div>
        </section>
      </main>
    );
  }
  
  return (
    <main className="flex-1">
      <SwipeToGive />
    </main>
  );
}
