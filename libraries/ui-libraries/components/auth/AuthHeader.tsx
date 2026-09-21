import React from 'react';

const AuthHeader: React.FC = () => {
  return (
    <div className="mb-8">
      {/* Logo */}
      <div className="flex items-center mb-6">
        <div className="flex items-center gap-2">
          <img 
            src="/AlikoLogo.svg" 
            alt="AlikoHub" 
            className="h-8 w-auto"
          />
        </div>
      </div>
    </div>
  );
};

export default AuthHeader;