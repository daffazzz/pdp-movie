"use client";

import { useEffect, useRef, useState } from "react";

type NativeAdProps = {
  containerId?: string;
  scriptSrc?: string;
  label?: string;
  showLabel?: boolean;
  className?: string;
  responsive?: boolean;
  mobileMaxWidth?: number;
  tabletMaxWidth?: number;
  desktopMaxWidth?: number;
  mobileBreakpoint?: number; // default 640px
  tabletBreakpoint?: number; // default 1024px
  mobileMaxHeight?: number;
  tabletMaxHeight?: number;
  desktopMaxHeight?: number;
};

// Sequence counter to help generate unique container IDs when multiple instances exist
let nativeAdSeq = 0;

const DEFAULT_CONTAINER_ID = "container-884c33cc22287de189f09428e5c83d71";
const DEFAULT_SCRIPT_SRC =
  "//pl26588459.effectivegatecpm.com/884c33cc22287de189f09428e5c83d71/invoke.js";

const NativeAd = ({
  containerId = DEFAULT_CONTAINER_ID,
  scriptSrc = DEFAULT_SCRIPT_SRC,
  label = "Advertisement",
  showLabel = true,
  className = "rounded bg-gray-800/40 p-2 w-full",
  responsive = true,
  mobileMaxWidth = 320,
  tabletMaxWidth = 468,
  desktopMaxWidth = 728,
  mobileBreakpoint = 640,
  tabletBreakpoint = 1024,
  mobileMaxHeight = 180,
  tabletMaxHeight = 200,
  desktopMaxHeight = 240,
}: NativeAdProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const uniqueIdRef = useRef<string | null>(null);
  const [effMaxWidth, setEffMaxWidth] = useState<number | undefined>(undefined);
  const [effMaxHeight, setEffMaxHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (responsive && typeof window !== "undefined") {
      const vw = window.innerWidth;
      if (vw < mobileBreakpoint) {
        setEffMaxWidth(mobileMaxWidth);
        setEffMaxHeight(mobileMaxHeight);
      } else if (vw < tabletBreakpoint) {
        setEffMaxWidth(tabletMaxWidth);
        setEffMaxHeight(tabletMaxHeight);
      } else {
        setEffMaxWidth(desktopMaxWidth);
        setEffMaxHeight(desktopMaxHeight);
      }
    }

    const container = containerRef.current;
    if (!container || initializedRef.current) return;

    try {
      // Resolve a unique container ID to avoid duplicate IDs if multiple ads are rendered
      let resolvedId = containerId;
      if (document.getElementById(resolvedId)) {
        nativeAdSeq += 1;
        resolvedId = `${containerId}-${nativeAdSeq}`;
      }
      uniqueIdRef.current = resolvedId;

      // Ensure the required container is present within our wrapper
      let target = document.getElementById(resolvedId);
      if (!target) {
        const div = document.createElement("div");
        div.id = resolvedId;
        container.appendChild(div);
        target = div;
      }

      // Append the external script to initialize the native ad
      const script = document.createElement("script");
      script.async = true;
      script.setAttribute("data-cfasync", "false");
      script.src = scriptSrc;
      target.appendChild(script);

      initializedRef.current = true;
    } catch (e) {
      // Silent fail if ad script fails
    }
  }, [containerId, scriptSrc]);

  return (
    <div className="my-6">
      {showLabel && (
        <div className="text-xs text-gray-400 mb-2">{label}</div>
      )}
      <div
        ref={containerRef}
        className={className}
        style={{
          maxWidth: effMaxWidth,
          maxHeight: effMaxHeight,
          marginLeft: "auto",
          marginRight: "auto",
          overflow: "hidden",
        }}
      />
    </div>
  );
};

export default NativeAd;
