"use client";

import { useEffect } from "react";

type PopunderAdProps = {
    src?: string;
};

const DEFAULT_SRC =
    "//pl26573696.effectivegatecpm.com/b5/9a/63/b59a6376509126810b3054f840a2f9d2.js";

export default function PopunderAd({ src = DEFAULT_SRC }: PopunderAdProps) {
    useEffect(() => {
        try {
            const w = window as any;
            // Use a different flag than socialbar to avoid conflicts
            if (w.__popunderLoaded) return;

            const script = document.createElement("script");
            script.type = "text/javascript";
            script.async = true;
            script.src = src;
            document.body.appendChild(script);

            w.__popunderLoaded = true;
        } catch (_) {
            // Silent fail if script can't be appended
        }
    }, [src]);

    return null;
}
