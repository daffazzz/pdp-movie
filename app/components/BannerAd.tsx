"use client";

import { useEffect, useRef } from "react";

type BannerAdProps = {
  adKey?: string;
  scriptSrc?: string;
  width?: number;
  height?: number;
  format?: string;
  params?: Record<string, unknown>;
  label?: string;
  showLabel?: boolean;
  className?: string;
  responsive?: boolean;
  mobileWidth?: number;
  mobileHeight?: number;
  mobileFormat?: string;
  tabletWidth?: number;
  tabletHeight?: number;
  tabletFormat?: string;
  mobileBreakpoint?: number; // default 640px
  tabletBreakpoint?: number; // default 1024px
  useSandbox?: boolean; // isolate script per instance to avoid atOptions collisions
  sandboxAllow?: string; // iframe sandbox permissions string
};

const DEFAULT_AD_KEY = "842c56077df2cb6c841070d57459dc6f";
const DEFAULT_SCRIPT_SRC =
  "//www.highperformanceformat.com/842c56077df2cb6c841070d57459dc6f/invoke.js";

const BannerAd = ({
  adKey = DEFAULT_AD_KEY,
  scriptSrc = DEFAULT_SCRIPT_SRC,
  width = 320,
  height = 50,
  format = "iframe",
  params = {},
  label = "Iklan",
  showLabel = true,
  className = "",
  responsive = true,
  mobileWidth = 320,
  mobileHeight = 50,
  mobileFormat = "iframe",
  tabletWidth = 468,
  tabletHeight = 60,
  tabletFormat = "iframe",
  mobileBreakpoint = 640,
  tabletBreakpoint = 1024,
  useSandbox = false,
  sandboxAllow = "allow-scripts allow-same-origin allow-popups allow-top-navigation-by-user-activation",
}: BannerAdProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || initializedRef.current) return;

    try {
      const viewport = typeof window !== "undefined" ? window.innerWidth : width;
      let effWidth = width;
      let effHeight = height;
      let effFormat = format;

      if (responsive && typeof viewport === "number") {
        if (viewport < mobileBreakpoint) {
          effWidth = mobileWidth;
          effHeight = mobileHeight;
          effFormat = mobileFormat;
        } else if (viewport < tabletBreakpoint) {
          effWidth = tabletWidth;
          effHeight = tabletHeight;
          effFormat = tabletFormat;
        } else {
          effWidth = width;
          effHeight = height;
          effFormat = format;
        }
      }

      if (useSandbox) {
        // Create an isolated iframe to avoid collisions of global window.atOptions across multiple ads
        const iframe = document.createElement("iframe");
        iframe.setAttribute("title", "ad-sandbox");
        iframe.setAttribute("scrolling", "no");
        iframe.setAttribute("frameBorder", "0");
        iframe.setAttribute("sandbox", sandboxAllow);
        iframe.style.width = `${effWidth}px`;
        iframe.style.height = `${effHeight}px`;
        iframe.style.border = "0";
        container.appendChild(iframe);

        const doc = iframe.contentDocument || (iframe as any).document;
        if (doc) {
          const optionsJson = JSON.stringify({
            key: adKey,
            format: effFormat,
            height: effHeight,
            width: effWidth,
            params,
          });
          doc.open();
          doc.write(`<!DOCTYPE html><html><head><base target="_parent"></base></head><body style="margin:0;padding:0;">
<script type="text/javascript">var atOptions = ${optionsJson};</script>
<script type="text/javascript" src="${scriptSrc}"></script>
</body></html>`);
          doc.close();
        }
      } else {
        // Fallback: inject directly into page using global window.atOptions
        (window as any).atOptions = {
          key: adKey,
          format: effFormat,
          height: effHeight,
          width: effWidth,
          params,
        };

        const script = document.createElement("script");
        script.async = true;
        script.setAttribute("type", "text/javascript");
        script.setAttribute("data-cfasync", "false");
        script.src = scriptSrc;
        container.appendChild(script);
      }

      initializedRef.current = true;
    } catch (e) {
      // Silent fail if ad script fails
    }
  }, [
    adKey,
    scriptSrc,
    width,
    height,
    format,
    params,
    responsive,
    mobileWidth,
    mobileHeight,
    mobileFormat,
    tabletWidth,
    tabletHeight,
    tabletFormat,
    mobileBreakpoint,
    tabletBreakpoint,
    useSandbox,
    sandboxAllow,
  ]);

  return (
    <div className="my-6 flex justify-center">
      {showLabel && (
        <div className="sr-only">{label}</div>
      )}
      <div ref={containerRef} className={className} />
    </div>
  );
};

export default BannerAd;
