import React from "react";
import { motion } from "framer-motion";

// Haptik-Helper für Android/iOS
const vibrate = () => {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(10); // Kurzes, knackiges Feedback
  }
};

export function Button({ variant = "default", size = "md", className = "", onClick, ...props }) {
  const base = "inline-flex items-center justify-center rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none";
  
  const variants = {
    default: "bg-[#6F00FF] text-white shadow-[0_0_20px_-5px_rgba(111,0,255,0.5)] hover:bg-[#7F1AFF] border border-transparent",
    outline: "bg-transparent text-white border border-gray-700 hover:bg-white/5",
    ghost: "bg-transparent text-gray-300 hover:text-white hover:bg-white/5",
    destructive: "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20",
  };
  
  const sizes = { 
    sm: "text-xs px-3 py-2", 
    md: "text-sm px-5 py-3.5", // S22 Optimization: Taller for thumbs
    icon: "p-3" 
  };

  const handleClick = (e) => {
    vibrate();
    if (onClick) onClick(e);
  };

  return (
    <button 
      className={`${base} ${variants[variant] || ""} ${sizes[size] || ""} ${className}`} 
      onClick={handleClick}
      {...props} 
    />
  );
}

export function Card({ className = "", ...props }) {
  // Premium Card Style: Dunkelgrau, subtiler Border, weicher Schatten
  return (
    <div 
      className={`rounded-2xl bg-[#121212] border border-white/5 shadow-xl overflow-hidden ${className}`} 
      {...props} 
    />
  );
}

export function CardHeader({ className = "", ...props }) {
  return <div className={`px-5 pt-5 pb-2 ${className}`} {...props} />;
}

export function CardContent({ className = "", ...props }) {
  return <div className={`px-5 pb-5 ${className}`} {...props} />;
}

export function CardTitle({ className = "", ...props }) {
  return <h3 className={`text-lg font-semibold text-white tracking-tight ${className}`} {...props} />;
}

export const Input = React.forwardRef(({ className = "", ...props }, ref) => (
  <input
    ref={ref}
    className={`
      w-full bg-[#1A1A1A] text-white rounded-xl border border-white/10 px-4 py-3.5 text-base 
      placeholder:text-gray-600 focus:outline-none focus:border-[#6F00FF] focus:ring-1 focus:ring-[#6F00FF] 
      transition-all duration-200 input-focus-ring ${className}
    `}
    {...props}
  />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef(({ className = "", ...props }, ref) => (
  <textarea
    ref={ref}
    className={`
      w-full bg-[#1A1A1A] text-white rounded-xl border border-white/10 px-4 py-3 text-base 
      placeholder:text-gray-600 focus:outline-none focus:border-[#6F00FF] focus:ring-1 focus:ring-[#6F00FF] 
      transition-all duration-200 min-h-[100px] resize-y ${className}
    `}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export function Badge({ variant = "default", className = "", ...props }) {
  const variants = {
    default: "bg-[#6F00FF]/20 text-[#D0B3FF] border border-[#6F00FF]/30",
    secondary: "bg-gray-800 text-gray-300 border border-gray-700",
    destructive: "bg-red-900/30 text-red-400 border border-red-900/50",
    success: "bg-green-900/30 text-green-400 border border-green-900/50",
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${variants[variant] || ""} ${className}`} {...props} />;
}
