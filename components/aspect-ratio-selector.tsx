'use client'

import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

// AspectRatio 옵션 타입 정의
export interface AspectRatioOption {
  value: string;
  label: string;
}

// 비율 선택 팝오버 컴포넌트 props 타입 정의
export interface AspectRatioSelectorProps {
  value: string;
  onChange: (value: string) => void;
  options: AspectRatioOption[];
}

// 비율 선택 팝오버 컴포넌트
export const AspectRatioSelector = ({ value, onChange, options }: AspectRatioSelectorProps) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 px-3 font-normal flex items-center gap-2"
        >
          <div className="flex items-center gap-2">
            <input 
              type="checkbox"
              checked={true}
              readOnly
              className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
            />
            <span className="font-medium">{value}</span>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" sideOffset={5} align="start">
        <div className="grid grid-cols-3 gap-2">
          {options.map((option: AspectRatioOption) => (
            <div
              key={option.value}
              className="w-full"
            >
              <button
                type="button"
                className={`w-full aspect-ratio-btn p-2 text-sm rounded-md border transition-colors ${
                  option.value === value 
                    ? 'bg-purple-100 border-purple-300 dark:bg-purple-900/30 dark:border-purple-800' 
                    : 'bg-white hover:bg-zinc-50 border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 dark:hover:bg-zinc-900'
                }`}
                onClick={() => onChange(option.value)}
              >
                {option.label}
              </button>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}; 