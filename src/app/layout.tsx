import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f59e0b" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1a2e" },
  ],
};

export const metadata: Metadata = {
  title: {
    default: "BeerSocial - Discover & Review Beers",
    template: "%s | BeerSocial",
  },
  description: "A social app for beer lovers. Discover new beers, write reviews, follow friends, and share your favorites. Like Vivino but for beers!",
  keywords: ["beer", "review", "social", "craft beer", "brewery", "rating", "friends", "discover"],
  authors: [{ name: "BeerSocial Team" }],
  
  // PWA
  manifest: "/manifest.json",
  
  // Icons
  icons: {
    icon: [
      { url: "/icons/icon-72x72.png", sizes: "72x72", type: "image/png" },
      { url: "/icons/icon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/icons/icon-128x128.png", sizes: "128x128", type: "image/png" },
      { url: "/icons/icon-144x144.png", sizes: "144x144", type: "image/png" },
      { url: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-384x384.png", sizes: "384x384", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/icons/icon-192x192.png",
  },
  
  // Apple PWA
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "BeerSocial",
  },
  
  // Open Graph
  openGraph: {
    type: "website",
    siteName: "BeerSocial",
    title: "BeerSocial - Discover & Review Beers",
    description: "A social app for beer lovers. Discover, review and share your favorite beers.",
    images: [
      {
        url: "/icons/icon-512x512.png",
        width: 512,
        height: 512,
        alt: "BeerSocial Logo",
      },
    ],
  },
  
  // Twitter
  twitter: {
    card: "summary_large_image",
    title: "BeerSocial - Discover & Review Beers",
    description: "A social app for beer lovers",
    images: ["/icons/icon-512x512.png"],
  },
  
  // App info
  applicationName: "BeerSocial",
  formatDetection: {
    telephone: false,
  },
  
  // Other
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt" suppressHydrationWarning>
      <head>
        {/* PWA Meta Tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="BeerSocial" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        
        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('SW registered: ', registration);
                    },
                    function(registrationError) {
                      console.log('SW registration failed: ', registrationError);
                    }
                  );
                });
              }
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
