"use client";

import { useEffect, useRef } from "react";

const AdBox = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      (window as any).atOptions = {
        key: "46e65eae5ada7118327b9acba5cc9007",
        format: "iframe",
        height: 250,
        width: 300,
        params: {},
      };

      const script = document.createElement("script");
      script.type = "text/javascript";
      script.src =
        "//www.highperformanceformat.com/46e65eae5ada7118327b9acba5cc9007/invoke.js";
      script.async = true;

      // Append into the container so the ad renders in-place
      containerRef.current?.appendChild(script);
    } catch (e) {
      // Fail silently if ad script fails to load
    }
  }, []);

  return (
    <div className="flex justify-center my-6">
      <div ref={containerRef} className="w-[300px] h-[250px]" />
    </div>
  );
};

export default AdBox;

