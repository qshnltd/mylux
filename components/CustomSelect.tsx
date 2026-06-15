"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface CustomSelectProps {
  options: { label: string; value: string }[];
  value: string;
  onChange: (val: string) => void;
  className?: string;
  placeholder?: string;
  name?: string;
  buttonClassName?: string;
}

export function CustomSelect({ options, value, onChange, className, placeholder, name, buttonClassName }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className || ''}`} ref={containerRef}>
      {name && <input type="hidden" name={name} value={value} />}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          setIsOpen(!isOpen);
        }}
        className={buttonClassName || "w-full flex items-center justify-between bg-[#111] border-2 border-[#333] px-3 py-2 text-white font-sans text-sm hover:bg-[#151515] focus:outline-none focus:border-[#555] active:translate-y-px transition-all shadow-[inset_0_2px_0_rgba(255,255,255,0.05),0_2px_4px_rgba(0,0,0,0.4)]"}
      >
        <span className="truncate">{selectedOption ? selectedOption.label : (placeholder || "Select...")}</span>
        <ChevronDown className={`w-4 h-4 ml-2 shrink-0 text-[#A0A0A0] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#1A1A1A] border-2 border-[#333] shadow-[0_4px_20px_rgba(0,0,0,0.8)] z-50 flex flex-col font-sans text-sm max-h-60 overflow-y-auto">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 transition-colors ${value === opt.value ? 'bg-[#333] text-[#3BD03B] font-bold border-l-4 border-[#3BD03B]' : 'text-[#D0D0D0] hover:bg-[#2A2A2A] hover:text-white border-l-4 border-transparent'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
