"use client";

import React, { useRef, useState, useEffect } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import RankedCard from './RankedCard';

interface RankedRowProps {
    title: string;
    items: any[];
    contentType: 'movie' | 'tvshow';
}

const RankedRow: React.FC<RankedRowProps> = ({ title, items, contentType }) => {
    const rowRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    // Only take top 10
    const top10Items = items.slice(0, 10);

    const checkScrollPosition = () => {
        if (rowRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
            setCanScrollLeft(scrollLeft > 5);
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
        }
    };

    useEffect(() => {
        checkScrollPosition();
        window.addEventListener('resize', checkScrollPosition);
        const currentRef = rowRef.current;
        if (currentRef) {
            currentRef.addEventListener('scroll', checkScrollPosition);
        }
        return () => {
            window.removeEventListener('resize', checkScrollPosition);
            if (currentRef) {
                currentRef.removeEventListener('scroll', checkScrollPosition);
            }
        };
    }, [items]);

    const scroll = (direction: 'left' | 'right') => {
        if (rowRef.current) {
            const { clientWidth } = rowRef.current;
            const scrollAmount = clientWidth * 0.8;
            const scrollTo = direction === 'left'
                ? rowRef.current.scrollLeft - scrollAmount
                : rowRef.current.scrollLeft + scrollAmount;

            rowRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
        }
    };

    if (!top10Items || top10Items.length === 0) return null;

    return (
        <div className="py-6 w-full relative z-10">
            <h2 className="text-xl md:text-2xl font-bold px-4 md:px-8 mb-4 text-white flex items-center gap-2">
                {title}
            </h2>

            <div className="group relative">
                {/* Left Arrow */}
                <button
                    className={`hidden md:flex absolute left-2 top-1/2 transform -translate-y-1/2 z-50 h-12 w-12 cursor-pointer bg-black/50 hover:bg-black/80 hover:scale-110 rounded-full items-center justify-center transition-all duration-300 backdrop-blur-sm border border-white/10 ${canScrollLeft ? 'opacity-100 visible' : 'opacity-0 invisible'
                        }`}
                    onClick={() => scroll('left')}
                >
                    <FaChevronLeft className="text-white" size={20} />
                </button>

                {/* Right Arrow */}
                <button
                    className={`hidden md:flex absolute right-2 top-1/2 transform -translate-y-1/2 z-50 h-12 w-12 cursor-pointer bg-black/50 hover:bg-black/80 hover:scale-110 rounded-full items-center justify-center transition-all duration-300 backdrop-blur-sm border border-white/10 ${canScrollRight ? 'opacity-100 visible' : 'opacity-0 invisible'
                        }`}
                    onClick={() => scroll('right')}
                >
                    <FaChevronRight className="text-white" size={20} />
                </button>

                {/* Scrollable Container */}
                <div
                    ref={rowRef}
                    className="flex items-center overflow-x-scroll scrollbar-hide px-4 md:px-8 py-4 space-x-0 no-scrollbar"
                    style={{ scrollBehavior: 'smooth' }}
                >
                    {top10Items.map((item, index) => (
                        <div key={item.id} className="flex-none pl-2 md:pl-4 first:pl-0">
                            <RankedCard
                                {...item}
                                rank={index + 1}
                                type={contentType}
                            />
                        </div>
                    ))}
                    {/* Spacer for right padding */}
                    <div className="flex-none w-8 md:w-16"></div>
                </div>
            </div>
        </div>
    );
};

export default RankedRow;
