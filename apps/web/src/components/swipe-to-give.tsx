"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { 
  Heart, 
  X, 
  ArrowLeft, 
  DollarSign, 
  Users, 
  Target, 
  Star, 
  Trophy,
  Loader2,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Toast, ToastTitle, ToastDescription } from '@/components/ui/toast';
import { sdk } from '@farcaster/frame-sdk';
import { DaimoPayButton, useDaimoPayUI } from '@daimo/pay';
import { celoUSDC } from '@daimo/pay-common';
import { getAddress } from 'viem';

// Types
interface Project {
  uid: string; // API returns 'uid' not 'id'
  details: {
    title: string;
    description: string;
    logoUrl?: string;
  };
  percentCompleted: number;
  numTransactions: number;
  numMilestones: number;
  endorsements: any[];
  grantNames: string[];
  members: Array<{
    role: string;
    address: string;
  }>;
}

interface ToastMessage {
  id: string;
  title: string;
  description: string;
  variant: 'default' | 'destructive' | 'success';
}

const SWIPE_THRESHOLD = 100;
const CARD_ROTATION_DEGREES = 15;

// Using USDC on Celo via Daimo Pay

const TIP_AMOUNTS = [1, 5, 10, 25];

// Helper function to format amount to 2 decimal places
const formatAmount = (amount: string | number): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return isNaN(num) || num <= 0 ? '25.00' : num.toFixed(2);
};

export default function SwipeToGive() {
  // State
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [savedProjects, setSavedProjects] = useState<Project[]>([]);
  const [passedProjects, setPassedProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [tipping, setTipping] = useState<{ [key: string]: boolean }>({});
  // Token selection removed - using USDC on Celo via Daimo Pay
  const [customAmounts, setCustomAmounts] = useState<{ [key: string]: string }>({});
  const [hasLoadedProjects, setHasLoadedProjects] = useState(false);
  const [currentTippingProject, setCurrentTippingProject] = useState<Project | null>(null);

  // Daimo Pay UI instance
  const { resetPayment } = useDaimoPayUI();

  // Motion values for swipe animation
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-CARD_ROTATION_DEGREES, 0, CARD_ROTATION_DEGREES]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

  // Overlay opacity transforms - must be declared at component level, not inside conditionals
  const saveOverlayOpacity = useTransform(x, [0, 100], [0, 1]);
  const passOverlayOpacity = useTransform(x, [-100, 0], [1, 0]);

  // Fetch projects from API - only once on mount
  useEffect(() => {
    // Only fetch if we haven't loaded projects yet
    if (!hasLoadedProjects) {
      fetchProjects();
    }
  }, []); // Empty dependency array ensures this only runs once on mount

  const fetchProjects = async () => {
    setLoading(true);
    setError(null);

    try {
      // Use the specific endpoint with programIds filter to get exactly the projects we want
      const response = await fetch(
        'https://gapapi.karmahq.xyz/v2/communities/celo/projects?page=1&limit=100&programIds=944_42161'
      );

      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }

      const data = await response.json();

      console.log('API Response:', data); // Debug log

      // The API returns data in 'payload' array
      const projectsData = data.payload || [];

      console.log(`Found ${projectsData.length} projects from program 944_42161`); // Debug log

      // Sort by numTransactions in descending order (highest first)
      const sortedProjects = projectsData.sort((a: Project, b: Project) => {
        // Ensure we have valid numbers for comparison
        const aTransactions = a.numTransactions || 0;
        const bTransactions = b.numTransactions || 0;
        return bTransactions - aTransactions;
      });

       console.log('Top 5 projects by transactions:');
       sortedProjects.slice(0, 5).forEach((p: Project, i: number) => {
         console.log(`${i + 1}. ${p.details.title}: ${p.numTransactions} transactions`);
       });

      setProjects(sortedProjects);
      setHasLoadedProjects(true); // Mark that we've successfully loaded projects
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  };

  // Toast management
  const addToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { ...toast, id }]);
    setTimeout(() => removeToast(id), 5000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Swipe handlers
  const handleDragEnd = (event: any, info: PanInfo) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    
    console.log(`Swipe detected - offset: ${offset}, velocity: ${velocity}`);
    
    // More sensitive swipe detection
    if (Math.abs(offset) > SWIPE_THRESHOLD || Math.abs(velocity) > 300) {
      if (offset > 0 || velocity > 300) {
        console.log('Swiping right - saving project');
        handleSave();
      } else {
        console.log('Swiping left - passing project');
        handlePass();
      }
    } else {
      console.log('Swipe not strong enough, resetting position');
      x.set(0);
    }
  };

  const handleSave = () => {
    const currentProject = projects[currentIndex];
    console.log(`Saving project at index ${currentIndex}:`, currentProject?.details?.title, 'uid:', currentProject?.uid);
    console.log('Total projects:', projects.length, 'Current index:', currentIndex);

    if (currentProject && !savedProjects.find(p => p.uid === currentProject.uid)) {
      setSavedProjects(prev => {
        const updated = [...prev, currentProject];
        console.log('Saved projects count:', updated.length);
        console.log('Saved projects:', updated.map(p => p.details.title));
        return updated;
      });
      addToast({
        title: 'Project Saved!',
        description: `${currentProject.details.title} added to your saved projects`,
        variant: 'success'
      });
    } else if (currentProject && savedProjects.find(p => p.uid === currentProject.uid)) {
      console.log('Project already saved:', currentProject.details.title);
    }
    nextCard();
  };

  const handlePass = () => {
    const currentProject = projects[currentIndex];
    if (currentProject) {
      setPassedProjects(prev => [...prev, currentProject]);
    }
    nextCard();
  };

  const nextCard = () => {
    // Reset motion values immediately
    x.set(0);
    
    // Move to next card
    const nextIndex = currentIndex + 1;
    console.log(`Moving from card ${currentIndex} to card ${nextIndex}`);
    setCurrentIndex(nextIndex);
    
    // If we've gone through all cards, show saved projects
    if (nextIndex >= projects.length) {
      console.log('All cards completed, showing saved projects');
      setTimeout(() => setShowSaved(true), 300);
    }
  };

  // Store the show function for the current tipping project
  const [showPaymentModal, setShowPaymentModal] = useState<(() => void) | null>(null);

  // Handle tip button click - updates Daimo Pay with current project amount
  const handleTipClick = (project: Project) => {
    const amount = formatAmount(customAmounts[project.uid] || '25');
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      addToast({
        title: 'Invalid Amount',
        description: 'Please enter a valid tip amount greater than 0',
        variant: 'destructive'
      });
      return;
    }

    // Set current project for tracking
    setCurrentTippingProject(project);

    // Update Daimo Pay with current project's details and amount
    resetPayment({
      toAddress: "0x4858aBb6dfF69904f1c155D40A48CD8846AEA2f6",
      toChain: celoUSDC.chainId,
      toToken: getAddress(celoUSDC.token),
      toUnits: amount, // Properly formatted 2-decimal amount
      refundAddress: "0x4858aBb6dfF69904f1c155D40A48CD8846AEA2f6",
      metadata: {
        projectId: project.uid,
        projectTitle: project.details.title,
        tipType: 'project_tip',
        amount: amount
      }
    });

    // Trigger the payment modal if available
    if (showPaymentModal) {
      showPaymentModal();
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-celo-yellow flex items-center justify-center p-4 md:p-8">
        <div className="text-center">
          <div className="brutalist-card bg-black p-6 md:p-12 mb-4 md:mb-8">
            <Loader2 className="h-12 w-12 md:h-16 md:w-16 animate-spin mx-auto mb-4 md:mb-6 text-celo-yellow" />
            <h2 className="brutalist-headline text-2xl md:text-3xl lg:text-4xl text-celo-yellow mb-3 md:mb-4">
              LOADING
            </h2>
            <p className="brutalist-body text-white uppercase tracking-widest text-sm md:text-base">
              FETCHING CELO PROJECTS
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="min-h-screen bg-celo-purple flex items-center justify-center p-4 md:p-8">
        <div className="text-center max-w-lg md:max-w-2xl">
          <div className="brutalist-card bg-celo-yellow p-6 md:p-12 mb-4 md:mb-8">
            <AlertCircle className="h-16 w-16 md:h-20 md:w-20 lg:h-24 lg:w-24 text-black mx-auto mb-4 md:mb-6 lg:mb-8" />
            <h1 className="brutalist-headline text-3xl md:text-4xl lg:text-6xl text-black mb-4 md:mb-6 leading-none">
              ERROR
            </h1>
            <p className="brutalist-body text-black text-sm md:text-lg lg:text-xl mb-6 md:mb-8 uppercase tracking-wide">
              {error}
            </p>
            <button 
              onClick={fetchProjects}
              className="brutalist-button bg-black text-celo-yellow px-6 py-4 md:px-10 md:py-5 lg:px-12 lg:py-6 hover-invert-yellow text-sm md:text-base"
            >
              <RefreshCw className="inline-block h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6 mr-2 md:mr-3 lg:mr-4" />
              RETRY
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render saved projects view
  if (showSaved) {
    return (
      <div className="min-h-screen bg-celo-tan-light p-3 md:p-6">
        <div className="max-w-4xl mx-auto">
          {/* Mobile-Responsive Header */}
          <div className="mb-6 md:mb-12">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6 md:mb-8">
              <div className="flex-1">
                <h1 className="brutalist-headline text-4xl md:text-6xl lg:text-8xl text-black leading-none mb-3 md:mb-4">
                  SAVED
                </h1>
                <div className="brutalist-card bg-celo-yellow p-4 md:p-6 inline-block">
                  <p className="brutalist-body text-black text-lg md:text-2xl brutalist-heavy uppercase">
                    {savedProjects.length} PROJECTS
                  </p>
                </div>
              </div>
              
              {currentIndex < projects.length && (
                <button
                  onClick={() => setShowSaved(false)}
                  className="brutalist-button bg-celo-green text-white px-4 py-3 md:px-6 md:py-4 hover-invert-green text-sm md:text-base"
                >
                  <ArrowLeft className="inline-block h-4 w-4 md:h-5 md:w-5 mr-2 md:mr-3" />
                  BACK TO SWIPE
                </button>
              )}
            </div>

            {/* Mobile-Responsive Token Selection */}
            {/* <div className="mb-6 md:mb-8">
              <div className="brutalist-card bg-black p-4 md:p-6 mb-6">
                <h2 className="brutalist-body text-celo-yellow text-sm md:text-lg brutalist-heavy uppercase tracking-widest mb-4 md:mb-6">
                  SELECT TOKEN
                </h2>
                <div className="grid grid-cols-3 gap-2 md:gap-4">
                  {TOKENS.map(token => (
                    <button
                      key={token.symbol}
                      onClick={() => setSelectedToken(token.symbol)}
                      className={`brutalist-button px-3 py-3 md:px-6 md:py-4 text-sm md:text-base ${
                        selectedToken === token.symbol 
                          ? 'bg-celo-yellow text-black' 
                          : 'bg-white text-black hover-invert-yellow'
                      }`}
                    >
                      {token.symbol}
                    </button>
                  ))}
                </div>
              </div>
            </div> */}
          </div>

          {/* Empty state */}
          {savedProjects.length === 0 ? (
            <div className="brutalist-card bg-celo-purple p-16 text-center">
              <Heart className="h-24 w-24 text-celo-pink mx-auto mb-8" />
              <h2 className="brutalist-headline text-4xl text-white mb-6">
                NOTHING SAVED
              </h2>
              {currentIndex < projects.length && (
                <p className="brutalist-body text-celo-pink text-xl uppercase tracking-wide">
                  START SWIPING TO DISCOVER PROJECTS
                </p>
              )}
            </div>
          ) : (
            <>
              {/* Mobile-Responsive Saved Projects List */}
              <div className="space-y-4 md:space-y-6 mb-6 md:mb-12">
                {savedProjects.map((project, index) => (
                  <div key={project.uid} className="brutalist-card bg-white p-4 md:p-6">
                    <div className="flex flex-col space-y-4">
                      {/* Project Info */}
                      <div className="flex items-start gap-4 md:gap-6">
                        <div className="brutalist-card bg-celo-tan-dark p-2 md:p-3 flex-shrink-0">
                          {project.details.logoUrl ? (
                            <img 
                              src={project.details.logoUrl} 
                              alt={project.details.title}
                              className="w-12 h-12 md:w-16 md:h-16 object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 md:w-16 md:h-16 bg-black flex items-center justify-center">
                              <span className="brutalist-body text-celo-yellow text-lg md:text-xl brutalist-heavy">
                                {project.details.title.slice(0, 2).toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="brutalist-headline text-xl md:text-2xl lg:text-3xl text-black mb-2 md:mb-3 leading-tight">
                            {project.details.title}
                          </h3>
                          
                          {/* Compact Stats - Always Side by Side */}
                          <div className="flex gap-2 mb-3 text-xs md:text-sm">
                            <div className="brutalist-card bg-celo-blue px-2 py-1">
                              <span className="brutalist-body text-black brutalist-heavy">
                                {project.numTransactions}
                              </span>
                            </div>
                            <div className="brutalist-card bg-celo-lime px-2 py-1">
                              <span className="brutalist-body text-black brutalist-heavy">
                                {project.endorsements.length}
                              </span>
                            </div>
                            <div className="brutalist-card bg-celo-pink px-2 py-1">
                              <span className="brutalist-body text-black brutalist-heavy">
                                {project.numMilestones}
                              </span>
                            </div>
                          </div>
                          
                          <p className="brutalist-body text-black text-sm md:text-base line-clamp-2 md:line-clamp-3">
                            {project.details.description}
                          </p>
                        </div>
                      </div>
                      
                      {/* Mobile Tip Section */}
                      <div className="brutalist-card bg-black p-4 md:p-6">
                        <h4 className="brutalist-body text-celo-yellow brutalist-heavy uppercase text-xs md:text-sm mb-3 md:mb-4 tracking-widest">
                          TIP AMOUNT ($)
                        </h4>
                        
                        <div className="grid grid-cols-4 gap-2 mb-4">
                          {TIP_AMOUNTS.map(amount => (
                            <button
                              key={amount}
                              onClick={() => setCustomAmounts(prev => ({ 
                                ...prev, 
                                [project.uid]: amount.toString() 
                              }))}
                              className={`brutalist-button px-2 py-2 md:px-3 md:py-3 text-xs md:text-sm ${
                                (customAmounts[project.uid] || '25') === amount.toString()
                                  ? 'bg-celo-yellow text-black'
                                  : 'bg-white text-black hover-invert-yellow'
                              }`}
                            >
                              ${amount}
                            </button>
                          ))}
                        </div>
                        
                        <div className="flex gap-2 md:gap-4">
                          <input
                            type="number"
                            placeholder="25"
                            value={customAmounts[project.uid] || ''}
                            onChange={(e) => setCustomAmounts(prev => ({
                              ...prev,
                              [project.uid]: e.target.value
                            }))}
                            className="brutalist-input flex-1 px-3 py-2 md:px-4 md:py-3 text-center text-sm md:text-base"
                          />
                          
                          <button
                            onClick={() => handleTipClick(project)}
                            disabled={tipping[project.uid]}
                            className="brutalist-button bg-celo-yellow text-black px-4 py-2 md:px-6 md:py-3 hover-invert-yellow text-xs md:text-sm"
                          >
                            {tipping[project.uid] ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <DollarSign className="inline-block h-4 w-4 mr-1 md:mr-2" />
                                TIP
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Note: Tip All functionality removed - users tip each project individually with Daimo Pay */}
            </>
          )}
        </div>
      </div>
    );
  }

  // Main swiping interface
  const currentProject = projects[currentIndex];
  const remainingCards = Math.max(0, projects.length - currentIndex);

  console.log('Rendering - Current index:', currentIndex, 'Total projects:', projects.length);
  console.log('Current project should be:', currentProject?.details?.title, 'uid:', currentProject?.uid);

    return (
      <div className="min-h-screen bg-celo-tan-light p-3 md:p-6">
        <div className="max-w-4xl mx-auto">
          {/* Mobile-Responsive Header */}
          <div className="mb-6 md:mb-12">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
              <div className="flex-1">
                <h1 className="brutalist-headline text-4xl md:text-6xl lg:text-8xl text-black leading-none mb-3 md:mb-4">
                  DISCOVER
                </h1>
                <div className="flex flex-wrap gap-2 md:gap-4">
                  <div className="brutalist-card bg-celo-green p-3 md:p-4">
                    <p className="brutalist-body text-white text-sm md:text-lg brutalist-heavy uppercase">
                      CELO PROJECTS
                    </p>
                  </div>
                  <div className="brutalist-card bg-black p-3 md:p-4">
                    <span className="brutalist-body text-celo-yellow brutalist-heavy uppercase tracking-wider text-sm md:text-base">
                      {remainingCards} LEFT
                    </span>
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => setShowSaved(true)}
                className="brutalist-button bg-celo-yellow text-black px-4 py-3 md:px-6 md:py-4 hover-invert-yellow text-sm md:text-base"
              >
                <Heart className="inline-block h-4 w-4 md:h-5 md:w-5 mr-2" />
                SAVED ({savedProjects.length})
              </button>
            </div>
          </div>

          {/* Mobile-Responsive Card Display */}
          <div className="relative h-[500px] md:h-[600px] mb-6 md:mb-12">
            {currentProject && (
              <motion.div
                key={`${currentProject.uid}-${currentIndex}`}
                className="absolute inset-0"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.1}
                onDragEnd={handleDragEnd}
                style={{
                  x,
                  rotate,
                  opacity,
                }}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                <div className="brutalist-card bg-white h-full w-full">
                  <div className="p-4 md:p-6 h-full flex flex-col">
                    {/* Compact Header */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className="brutalist-card bg-celo-tan-dark p-2 md:p-3 flex-shrink-0">
                        {currentProject.details.logoUrl ? (
                          <img 
                            src={currentProject.details.logoUrl} 
                            alt={currentProject.details.title}
                            className="w-10 h-10 md:w-12 md:h-12 object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 md:w-12 md:h-12 bg-black flex items-center justify-center">
                            <span className="brutalist-body text-celo-yellow text-sm md:text-base brutalist-heavy">
                              {currentProject.details.title.slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h2 className="brutalist-headline text-lg md:text-xl lg:text-2xl text-black leading-tight mb-2">
                          {currentProject.details.title}
                        </h2>
                        
                        {/* Compact Stats - Always Side by Side */}
                        <div className="flex gap-2 text-xs md:text-sm">
                          <div className="brutalist-card bg-celo-blue px-2 py-1">
                            <span className="brutalist-body text-black brutalist-heavy">
                              {currentProject.numTransactions}
                            </span>
                          </div>
                          <div className="brutalist-card bg-celo-lime px-2 py-1">
                            <span className="brutalist-body text-black brutalist-heavy">
                              {currentProject.endorsements.length}
                            </span>
                          </div>
                          <div className="brutalist-card bg-celo-pink px-2 py-1">
                            <span className="brutalist-body text-black brutalist-heavy">
                              {currentProject.numMilestones}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Main Focus: Description with Scroll */}
                    <div className="brutalist-card bg-celo-tan-dark p-4 md:p-6 mb-4 flex-1 overflow-hidden">
                      <div className="h-full overflow-y-auto description-scroll">
                        <p className="brutalist-body text-black text-base md:text-lg leading-relaxed pr-2">
                          {currentProject.details.description}
                        </p>
                      </div>
                    </div>

                    {/* Recent Grants - Small Circular Bubbles */}
                    {currentProject.grantNames && currentProject.grantNames.length > 0 && (
                      <div className="mb-4">
                        <h3 className="brutalist-body text-black brutalist-heavy uppercase text-xs mb-2 tracking-widest">
                          RECENT GRANTS
                        </h3>
                        <div className="flex flex-wrap gap-1 md:gap-2">
                          {currentProject.grantNames.slice(0, 4).map((grant, idx) => (
                            <div 
                              key={idx} 
                              className="brutalist-card bg-celo-yellow px-2 md:px-3 py-1 rounded-full inline-block"
                            >
                              <span className="brutalist-body text-black text-[10px] md:text-xs brutalist-heavy uppercase whitespace-nowrap">
                                {grant}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Overflowing Action Buttons */}
                    <div className="relative -mx-4 md:-mx-6 mt-auto">
                      <div className="grid grid-cols-2 gap-3 md:gap-6 px-2 md:px-4">
                        <button
                          onClick={handlePass}
                          className="brutalist-button bg-celo-purple text-white px-4 py-4 md:px-6 md:py-6 hover-invert-purple text-sm md:text-base"
                        >
                          <X className="inline-block h-4 w-4 md:h-5 md:w-5 mr-2 md:mr-3" />
                          PASS
                        </button>
                        
                        <button
                          onClick={handleSave}
                          className="brutalist-button bg-celo-yellow text-black px-4 py-4 md:px-6 md:py-6 hover-invert-yellow text-sm md:text-base"
                        >
                          <Heart className="inline-block h-4 w-4 md:h-5 md:w-5 mr-2 md:mr-3" />
                          SAVE
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile-Responsive Swipe Overlays */}
                <motion.div
                  className="absolute inset-0 bg-celo-yellow/80 flex items-center justify-center pointer-events-none"
                  style={{
                    opacity: saveOverlayOpacity
                  }}
                >
                  <div className="brutalist-card bg-black p-6 md:p-12 rotate-12">
                    <div className="brutalist-headline text-3xl md:text-5xl lg:text-6xl text-celo-yellow">
                      SAVE
                    </div>
                  </div>
                </motion.div>
                
                <motion.div
                  className="absolute inset-0 bg-celo-purple/80 flex items-center justify-center pointer-events-none"
                  style={{
                    opacity: passOverlayOpacity
                  }}
                >
                  <div className="brutalist-card bg-black p-6 md:p-12 -rotate-12">
                    <div className="brutalist-headline text-3xl md:text-5xl lg:text-6xl text-white">
                      PASS
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* No more cards or loading */}
            {projects.length === 0 && !loading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="brutalist-card bg-celo-orange p-12 text-center">
                  <AlertCircle className="h-24 w-24 text-black mx-auto mb-8" />
                  <h2 className="brutalist-headline text-4xl text-black mb-6">
                    NO PROJECTS
                  </h2>
                  <p className="brutalist-body text-black text-lg mb-8 uppercase">
                    Unable to load projects at this time
                  </p>
                  <button 
                    onClick={() => {
                      setHasLoadedProjects(false);
                      fetchProjects();
                    }}
                    className="brutalist-button bg-black text-celo-orange px-12 py-6"
                  >
                    <RefreshCw className="inline-block h-6 w-6 mr-4" />
                    RETRY
                  </button>
                </div>
              </div>
            )}
            {projects.length > 0 && remainingCards === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="brutalist-card bg-celo-green p-16 text-center">
                  <Heart className="h-32 w-32 text-white mx-auto mb-8" />
                  <h2 className="brutalist-headline text-6xl text-white mb-6 leading-none">
                    ALL DONE!
                  </h2>
                  <p className="brutalist-body text-white text-xl mb-8 uppercase tracking-wide">
                    You've viewed all available projects
                  </p>
                  <button 
                    onClick={() => setShowSaved(true)}
                    className="brutalist-button bg-celo-yellow text-black px-12 py-6 hover-invert-yellow"
                  >
                    <Heart className="inline-block h-6 w-6 mr-4" />
                    VIEW SAVED PROJECTS
                  </button>
                </div>
              </div>
            )}
        </div>

      </div>

        {/* Mobile-Responsive Toast Notifications */}
        <div className="fixed top-4 right-4 md:top-8 md:right-8 z-50 space-y-2 md:space-y-4 max-w-xs md:max-w-sm">
          {toasts.map(toast => (
            <div
              key={toast.id}
              className={`brutalist-card p-4 md:p-6 ${
                toast.variant === 'success' 
                  ? 'bg-celo-lime' 
                  : toast.variant === 'destructive' 
                    ? 'bg-celo-pink' 
                    : 'bg-celo-blue'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="brutalist-body text-black brutalist-heavy uppercase text-xs md:text-sm mb-1 md:mb-2">
                    {toast.title}
                  </h4>
                  <p className="brutalist-body text-black text-xs md:text-sm line-clamp-2">
                    {toast.description}
                  </p>
                </div>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="brutalist-button bg-black text-white p-1 md:p-2 ml-2 md:ml-4 flex-shrink-0"
                >
                  <X className="h-3 w-3 md:h-4 md:w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Daimo Pay Custom Button - Hidden but used for programmatic triggering */}
        <DaimoPayButton.Custom
          appId={process.env.NEXT_PUBLIC_DAIMO_APP_ID!}
          intent="Tip"
          toAddress="0x4858aBb6dfF69904f1c155D40A48CD8846AEA2f6"
          toChain={celoUSDC.chainId}
          toToken={getAddress(celoUSDC.token)}
          toUnits="25.00" // Default amount, will be updated by resetPayment
          refundAddress="0x4858aBb6dfF69904f1c155D40A48CD8846AEA2f6"
          metadata={{
            projectId: currentTippingProject?.uid || 'default',
            projectTitle: currentTippingProject?.details.title || 'Default Project',
            tipType: 'project_tip'
          }}
          closeOnSuccess={true}
          onPaymentStarted={(e: any) => {
            console.log('Payment started:', e);
            if (currentTippingProject) {
              setTipping(prev => ({ ...prev, [currentTippingProject.uid]: true }));
              addToast({
                title: 'Payment Started',
                description: `Processing tip to ${currentTippingProject.details.title}`,
                variant: 'default'
              });
            }
          }}
          onPaymentCompleted={(e: any) => {
            console.log('Payment completed:', e);
            if (currentTippingProject) {
              setTipping(prev => ({ ...prev, [currentTippingProject.uid]: false }));
              const amount = formatAmount(customAmounts[currentTippingProject.uid] || '25');
              addToast({
                title: 'Tip Sent Successfully!',
                description: `$${amount} USDC sent to ${currentTippingProject.details.title}`,
                variant: 'success'
              });
            }
          }}
          onPaymentBounced={(e: any) => {
            console.log('Payment bounced:', e);
            if (currentTippingProject) {
              setTipping(prev => ({ ...prev, [currentTippingProject.uid]: false }));
              addToast({
                title: 'Payment Failed',
                description: 'Payment was refunded. Please try again.',
                variant: 'destructive'
              });
            }
          }}
          onOpen={() => {
            console.log('Daimo Pay modal opened');
          }}
          onClose={() => {
            console.log('Daimo Pay modal closed');
            setCurrentTippingProject(null);
          }}
        >
          {({ show, hide }) => {
            // Store the show function so it can be called from tip buttons
            if (showPaymentModal !== show) {
              setShowPaymentModal(() => show);
            }
            // Return hidden element since we're triggering programmatically
            return <div style={{ display: 'none' }} />;
          }}
        </DaimoPayButton.Custom>

    </div>
  );
}
