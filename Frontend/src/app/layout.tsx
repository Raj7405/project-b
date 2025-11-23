import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Web3Provider } from "@/contexts/Web3Context";
import { Toaster } from "react-hot-toast";
import Navbar from "@/components/Navbar";
import dynamic from "next/dynamic"; 
const NavigationProgressBar = dynamic(() => import("@/components/NavigationProgressBar"), { ssr: false });

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Crypto MLM Platform",
  description: "Decentralized MLM platform on BEP-20",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
      <NavigationProgressBar />
        <Web3Provider>
          <Navbar />
          {children}
          <Toaster position="top-right" />
        </Web3Provider>
      </body>
    </html>
  );
}
