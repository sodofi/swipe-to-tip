"use client";

import { MiniAppProvider } from "@/contexts/miniapp-context";
import FrameWalletProvider from "@/contexts/frame-wallet-context";
import dynamic from "next/dynamic";
import { DaimoPayProvider, getDefaultConfig } from '@daimo/pay';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { celo } from 'wagmi/chains';
import { farcasterMiniApp as miniAppConnector } from '@farcaster/miniapp-wagmi-connector';

const ErudaProvider = dynamic(
  () => import("../components/Eruda").then((c) => c.ErudaProvider),
  { ssr: false }
);

// Set up wagmi config for Daimo Pay with Farcaster Mini App connector
const config = createConfig(
  getDefaultConfig({
    appName: 'Swipe to Tip',
    appDescription: 'View Celo projects and swipe to fund',
    additionalConnectors: [
      miniAppConnector()
    ],
    transports: {
      [celo.id]: http(),
    }
  })
);

// Create query client for React Query
const queryClient = new QueryClient();

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErudaProvider>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <DaimoPayProvider>
            <FrameWalletProvider>
              <MiniAppProvider addMiniAppOnLoad={false}>{children}</MiniAppProvider>
            </FrameWalletProvider>
          </DaimoPayProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ErudaProvider>
  );
}
