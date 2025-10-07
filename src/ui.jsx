import React from "react";

export function Button({ variant="default", size="md", className="", ...props }) {
  const base = "inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm";
  const variants = {
    default: "bg-black text-white border-transparent",
    outline: "bg-transparent text-black border-gray-300",
    secondary: "bg-gray-100 text-black border-gray-200",
    ghost: "bg-transparent text-black border-transparent",
    destructive: "bg-red-600 text-white border-red-600",
  };
  const sizes = { sm:"text-sm px-2.5 py-1.5", md:"text-sm px-3 py-2", icon:"p-2" };
  return <button className={`${base} ${variants[variant]||""} ${sizes[size]||""} ${className}`} {...props} />;
}

export function Card({ className="", ...props }) {
  return <div className={`rounded-2xl border bg-white ${className}`} {...props} />;
}
export function CardHeader({ className="", ...props }) {
  return <div className={`px-4 pt-4 ${className}`} {...props} />;
}
export function CardContent({ className="", ...props }) {
  return <div className={`px-4 pb-4 ${className}`} {...props} />;
}
export function CardTitle({ className="", ...props }) {
  return <h3 className={`text-base font-medium ${className}`} {...props} />;
}

export const Input = React.forwardRef(({ className="", ...props }, ref) => (
  <input ref={ref} className={`w-full rounded-md border px-3 py-2 text-sm ${className}`} {...props} />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef(({ className="", ...props }, ref) => (
  <textarea ref={ref} className={`w-full rounded-md border px-3 py-2 text-sm ${className}`} {...props} />
));
Textarea.displayName = "Textarea";

export function Badge({ variant="default", className="", ...props }) {
  const variants = {
    default: "bg-black text-white",
    secondary: "bg-gray-100 text-black border border-gray-200",
    destructive: "bg-red-600 text-white",
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${variants[variant]||""} ${className}`} {...props} />;
}
