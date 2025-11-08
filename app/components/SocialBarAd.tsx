"use client";

import { useEffect } from "react";

type SocialBarAdProps = {
  src?: string;
};

const DEFAULT_SRC =
  "//pl28011404.effectivegatecpm.com/69/35/35/693535787da0bf7d4192d33b47b0e0b2.js";

export default function SocialBarAd({ src = DEFAULT_SRC }: SocialBarAdProps) {
  useEffect(() => {
    try {
      const w = window as any;
      if (w.__socialbarLoaded) return;

      const script = document.createElement("script");
      script.type = "text/javascript";
      script.async = true;
      script.src = src;
      document.body.appendChild(script);

      w.__socialbarLoaded = true;
    } catch (_) {
      // Silent fail if script can't be appended
    }
  }, [src]);

  return null;
}

