# Swipe to Give - Farcaster MiniApp

A Tinder-style project discovery and tipping app for the Celo ecosystem. Swipe through Celo projects, save your favorites, and tip them directly using your connected Farcaster wallet.

## Features

- 🎯 **Project Discovery**: Browse Celo ecosystem projects sorted by activity
- 🃏 **Tinder-style Interface**: Swipe right to save, left to pass
- 💰 **Direct Tipping**: Send USDC, cUSD, or CELO directly to project owners
- 📱 **Mobile Optimized**: Smooth touch gestures and responsive design
- ⚡ **Farcaster Integration**: Seamless wallet connection and payments

A modern Celo blockchain application built with Next.js, TypeScript, and Turborepo.

## Getting Started

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Start the development server:
   ```bash
   pnpm dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## How to Use

1. **Discover Projects**: Swipe through Celo ecosystem projects sorted by transaction activity
2. **Save Favorites**: Swipe right or tap "Save" to add projects to your saved list
3. **Skip Projects**: Swipe left or tap "Pass" to skip projects you're not interested in
4. **Tip Projects**: View your saved projects and tip them directly with USDC, cUSD, or CELO
5. **Batch Tipping**: Tip all your saved projects at once with custom amounts

## Data Source

Projects are fetched from the [Karma API](https://gapapi.karmahq.xyz/v2/communities/celo/projects) and include:
- Project details (name, description, logo)
- Completion percentage and milestones
- Number of supporters and endorsements
- Recent grant information
- Owner addresses for tipping

## Project Structure

This is a monorepo managed by Turborepo with the following structure:

- `apps/web` - Next.js application with embedded UI components and utilities
- `apps/hardhat` - Smart contract development environment

## Available Scripts

- `pnpm dev` - Start development servers
- `pnpm build` - Build all packages and apps
- `pnpm lint` - Lint all packages and apps
- `pnpm type-check` - Run TypeScript type checking

### Smart Contract Scripts

- `pnpm contracts:compile` - Compile smart contracts
- `pnpm contracts:test` - Run smart contract tests
- `pnpm contracts:deploy` - Deploy contracts to local network
- `pnpm contracts:deploy:alfajores` - Deploy to Celo Alfajores testnet
- `pnpm contracts:deploy:celo` - Deploy to Celo mainnet

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Smart Contracts**: Hardhat with Viem
- **Monorepo**: Turborepo
- **Package Manager**: PNPM

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Celo Documentation](https://docs.celo.org/)
- [Turborepo Documentation](https://turbo.build/repo/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
# swipe-to-tip
