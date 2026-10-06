import type { ReactNode } from "react";
import { GLASS_CARD } from "@/components/glassCard";

interface SpeechBubbleProps {
  children: ReactNode;
  className?: string;
}

export function SpeechBubble({ children, className = "" }: SpeechBubbleProps) {
  return (
    <div className={`max-w-[80%] self-start rounded-2xl rounded-tl-sm ${GLASS_CARD} px-4 py-3 text-sm leading-relaxed text-[#f4f1ff]/90 ${className}`}>
      {children}
    </div>
  );
}
