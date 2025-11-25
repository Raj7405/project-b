import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Web3Provider } from "@/contexts/Web3Context";
import { Toaster } from "react-hot-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import dynamic from "next/dynamic"; 
const NavigationProgressBar = dynamic(() => import("@/components/NavigationProgressBar"), { ssr: false });

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Crypto MLM Platform - Decentralized Business Matrix on BSC",
    template: "%s | Crypto MLM Platform"
  },
  description: "Join the future of multi-level marketing with our decentralized business matrix platform built on BEP-20 blockchain. Earn direct income, auto pool rewards, and level income through smart contracts.",
  keywords: [
    "crypto MLM",
    "blockchain MLM",
    "decentralized business",
    "BEP-20",
    "BSC platform",
    "smart contract MLM",
    "direct income",
    "auto pool",
    "level income",
    "cryptocurrency",
    "DeFi",
    "business matrix"
  ],
  authors: [{ name: "Crypto MLM Team" }],
  creator: "Crypto MLM Platform",
  publisher: "Crypto MLM Platform",
  
  // Open Graph (Facebook, LinkedIn)
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://yourwebsite.com", // Update with your actual domain
    siteName: "Crypto MLM Platform",
    title: "Crypto MLM Platform - Decentralized Business Matrix",
    description: "Decentralized multi-level marketing platform on BEP-20. Earn through direct income, auto pool, and 10-level income system.",
    images: [
      {
        url: "/images/og-image.png", // Create this image (1200x630px recommended)
        width: 1200,
        height: 630,
        alt: "Crypto MLM Platform",
      }
    ],
  },

  // Twitter Card
  twitter: {
    card: "summary_large_image",
    site: "@yourhandle", // Update with your Twitter handle
    creator: "@yourhandle",
    title: "Crypto MLM Platform - Decentralized Business Matrix",
    description: "Join the decentralized MLM revolution on BSC blockchain",
    images: ["/images/twitter-card.png"], // Create this image (1200x600px)
  },

  // Additional metadata
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // Verification (add when you have these)
  // verification: {
  //   google: "your-google-verification-code",
  //   yandex: "your-yandex-verification-code",
  // },

  // App icons and manifest
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Structured Data (JSON-LD) for SEO
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "Crypto MLM Platform",
    "description": "Decentralized multi-level marketing platform built on BEP-20 blockchain with smart contracts",
    "url": "https://yourwebsite.com", // Update with your actual domain
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web Browser",
    "offers": {
      "@type": "Offer",
      "category": "Cryptocurrency Platform"
    },
    "featureList": [
      "Direct Income System",
      "Auto Pool Entry",
      "10 Level Income",
      "Smart Contract Based",
      "BEP-20 Token Support"
    ]
  }

  return (
    <html lang="en">
      <head>
        {/* Structured Data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        {/* Additional meta tags */}
        <meta name="theme-color" content="#1e1e2e" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className={inter.className}>
        <NavigationProgressBar />
        <Web3Provider>
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="grow">
              {children}
            </main>
            <Footer />
          </div>
          <Toaster position="top-right" />
        </Web3Provider>
      </body>
    </html>
  );
}
