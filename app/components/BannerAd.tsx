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
};

const DEFAULT_AD_KEY = "75a85e1871f07f5771fe8f7b34596be4";
const DEFAULT_SCRIPT_SRC =
  "//www.highperformanceformat.com/75a85e1871f07f5771fe8f7b34596be4/invoke.js";

const BannerAd = ({
  adKey = DEFAULT_AD_KEY,
  scriptSrc = DEFAULT_SCRIPT_SRC,
  width = 728,
  height = 90,
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
