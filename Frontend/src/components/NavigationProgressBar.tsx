"use client"

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const NavigationProgressBar = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialMount, setIsInitialMount] = useState(true);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Listen for link clicks to show progress immediately
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');
      
      // Check if it's a Next.js Link (has href and is not external)
      if (link && link.href && link.href.startsWith(window.location.origin)) {
        const href = link.getAttribute('href');
        // Only show if navigating to a different route
        if (href && href !== pathname && !href.startsWith('#')) {
          setIsLoading(true);
        }
      }
    };

    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, [pathname]);

  useEffect(() => {
    // Skip showing progress bar on initial mount
    if (isInitialMount) {
      setIsInitialMount(false);
      return;
    }

    // Show loading indicator when route changes
    setIsLoading(true);
    
    // Hide loading after navigation completes
    // App Router navigation is fast, so we use a short delay
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 200);

    return () => {
      clearTimeout(timer);
    };
  }, [pathname, searchParams, isInitialMount]);

  return isLoading ? (
    <>
      <progress className="pure-material-progress-linear bg-pending bg-red-primary" />
      <style jsx>{`
        .pure-material-progress-linear {
          position: fixed;
          // color: ;
          // background-color: #cad2ff;
          display: block;
          top: 0;
          z-index: 999999;
          -webkit-appearance: none;
          -moz-appearance: none;
          width: 100%;
          appearance: none;
          border: none;
          height: 0.25em;
          font-size: 16px;
        }

        .pure-material-progress-linear::-webkit-progress-bar {
          background-color: transparent;
        }

        /* Determinate */
        .pure-material-progress-linear::-webkit-progress-value {
          background-color: currentColor;
          transition: all 0.2s;
        }

        .pure-material-progress-linear::-moz-progress-bar {
          background-color: currentColor;
          transition: all 0.2s;
        }

        .pure-material-progress-linear::-ms-fill {
          border: none;
          background-color: currentColor;
          transition: all 0.2s;
        }

        /* Indeterminate */
        .pure-material-progress-linear:indeterminate {
          background-size: 200% 100%;
          background-image: linear-gradient(
            to right,
            transparent 50%,
            currentColor 50%,
            currentColor 60%,
            transparent 60%,
            transparent 71.5%,
            currentColor 71.5%,
            currentColor 84%,
            transparent 84%
          );
          animation: pure-material-progress-linear 2s infinite linear;
        }

        .pure-material-progress-linear:indeterminate::-moz-progress-bar {
          background-color: transparent;
        }

        .pure-material-progress-linear:indeterminate::-ms-fill {
          animation-name: none;
        }

        @keyframes pure-material-progress-linear {
          0% {
            background-size: 200% 100%;
            background-position: left -31.25% top 0%;
          }
          50% {
            background-size: 800% 100%;
            background-position: left -49% top 0%;
          }
          100% {
            background-size: 400% 100%;
            background-position: left -102% top 0%;
          }
        }
      `}</style>
    </>
  ) : null;
};

export default NavigationProgressBar;