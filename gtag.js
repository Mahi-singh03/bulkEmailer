import Script from "next/script";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Google Tag Manager / gtag.js */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-R8VK51R7H2"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-R8VK51R7H2');
          `}
        </Script>
      </head>
      <body>{children}</body>
    </html>
  );
}
