"use client";

import AdBox from "./AdBox";

type Props = {
  compact?: boolean;
};

const AdCard = ({ compact = false }: Props) => {
  if (compact) {
    return (
      <div className="h-40 md:h-52 w-full rounded bg-gray-800/40 flex items-center justify-center overflow-hidden">
        <div className="flex flex-col items-center justify-center gap-1">
          <span className="text-[10px] text-gray-400">Advertisement</span>
          <div className="origin-top-left scale-[0.37] md:scale-[0.49]">
            <AdBox />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="aspect-[2/3] rounded bg-gray-800/40 flex items-center justify-center overflow-hidden">
      <div className="flex flex-col items-center justify-center gap-2">
        <span className="text-xs text-gray-400">Advertisement</span>
        <AdBox />
      </div>
    </div>
  );
};

export default AdCard;
