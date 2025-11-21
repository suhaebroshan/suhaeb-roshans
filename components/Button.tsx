import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'happy';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  fullWidth = false,
  className = '',
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center rounded-2xl font-bold transition-all duration-200 focus:outline-none focus:ring-4 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95";
  
  const variants = {
    primary: "bg-violet-500 hover:bg-violet-600 text-white focus:ring-violet-200 shadow-[0_4px_0_0_rgba(139,92,246,1)] hover:shadow-[0_2px_0_0_rgba(139,92,246,1)] hover:translate-y-[2px]",
    secondary: "bg-teal-400 hover:bg-teal-500 text-white focus:ring-teal-200 shadow-[0_4px_0_0_rgba(45,212,191,1)] hover:shadow-[0_2px_0_0_rgba(45,212,191,1)] hover:translate-y-[2px]",
    happy: "bg-yellow-400 hover:bg-yellow-500 text-slate-900 focus:ring-yellow-200 shadow-[0_4px_0_0_rgba(250,204,21,1)] hover:shadow-[0_2px_0_0_rgba(250,204,21,1)] hover:translate-y-[2px]",
    outline: "border-2 border-slate-200 bg-white text-slate-600 hover:border-violet-400 hover:text-violet-500 focus:ring-slate-100 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300",
    ghost: "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700",
    danger: "bg-red-100 hover:bg-red-200 text-red-600 focus:ring-red-100"
  };

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg"
  };

  const width = fullWidth ? "w-full" : "";

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${width} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;