import React from 'react';

interface AuthButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
}

const AuthButton: React.FC<AuthButtonProps> = ({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  disabled = false,
  loading = false,
  fullWidth = true
}) => {
  const baseClasses = `
    py-3 px-6 rounded-lg font-medium transition-all duration-200 
    flex items-center justify-center gap-2
    ${fullWidth ? 'w-full' : ''}
    ${disabled || loading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
  `;

  const variantClasses = {
    primary: `
      bg-yellow-400 hover:bg-yellow-500 text-black
      focus:ring-2 focus:ring-yellow-300 focus:outline-none
    `,
    secondary: `
      bg-white border border-gray-300 hover:bg-gray-50 text-gray-700
      focus:ring-2 focus:ring-blue-300 focus:outline-none
    `
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variantClasses[variant]}`}
    >
      {loading && (
        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
};

export default AuthButton;