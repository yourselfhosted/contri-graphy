import { SpeedInsights } from "@vercel/speed-insights/next";
import React, { Suspense } from "react";
import "@/styles/global.css";

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />
        <link rel="icon" href="/graphy.png" type="image/png" />
      </head>
      <body>
        <div className="relative w-full flex flex-col">
          <main className="shrink-0 grow basis-auto mx-auto pt-6 pb-16 px-6 w-full max-w-6xl flex flex-col justify-start items-center">
            {children}
          </main>
        </div>
        <Suspense>
          <SpeedInsights />
        </Suspense>
      </body>
    </html>
  );
};

export const metadata = {
  title: "GitHub Contributors Graphy",
  description: "An open source GitHub contribution graph generator.",
  openGraph: {
    title: "GitHub Contributors Graphy",
    description: "An open source GitHub contribution graph generator.",
    type: "website",
    url: "https://contri-graphy.yourselfhosted.com",
  },
  metadataBase: new URL("https://contri-graphy.yourselfhosted.com"),
};

export default RootLayout;
