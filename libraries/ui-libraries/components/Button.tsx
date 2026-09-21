import React from "react";

type Variant = "primary" | "secondary" | "danger";

type ButtonProps = {
  label: string;
  onClick?: () => void;
  className?: string;
  ariaLabel?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  variant?: Variant;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  loading?: boolean;
};

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-gradient-to-r from-[#E6D600] to-[#F2F296] text-black hover:bg-[#f6a731]",
  secondary:
    "bg-gray-300 text-black hover:bg-gray-400",
  danger:
    "bg-red-600 text-white hover:bg-red-700",
};

const Button: React.FC<ButtonProps> = ({
  label,
  onClick,
  className = "",
  ariaLabel,
  type = "button",
  disabled = false,
  variant = "primary",
  icon,
  iconPosition = "left",
  loading = false,
}) => {
  const baseClass =
    "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-4xl text-sm font-semibold transition-colors duration-200";
  const variantClass = variantStyles[variant];
  const combinedClass = `${baseClass} ${variantClass} ${className}`;

  return (
    <button
      type={type}
      onClick={onClick}
      className={combinedClass}
      aria-label={ariaLabel ?? label}
      disabled={disabled || loading}
    >
      {loading ? (
        <span className="animate-spin h-5 w-5 border-2 border-t-transparent border-black rounded-full" />
      ) : (
        <>
          {icon && iconPosition === "left" && <span>{icon}</span>}
          <span>{label}</span>
          {icon && iconPosition === "right" && <span>{icon}</span>}
        </>
      )}
    </button>
  );
};

export default Button;