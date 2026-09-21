import React from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
  heroImage?: string;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ 
  children, 
  heroImage = 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80'
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-yellow-50 to-blue-100 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <svg className="w-full h-full" viewBox="0 0 1440 800" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Organic blob shapes inspired by the design */}
          <circle cx="100" cy="100" r="80" fill="#bfdbfe" opacity="0.4"/>
          <circle cx="300" cy="150" r="60" fill="#fef3c7" opacity="0.5"/>
          <circle cx="500" cy="80" r="90" fill="#dbeafe" opacity="0.3"/>
          <circle cx="700" cy="120" r="70" fill="#fde68a" opacity="0.4"/>
          <circle cx="900" cy="160" r="85" fill="#bfdbfe" opacity="0.3"/>
          <circle cx="1100" cy="100" r="75" fill="#fef3c7" opacity="0.5"/>
          <circle cx="1300" cy="140" r="65" fill="#dbeafe" opacity="0.4"/>
          
          <circle cx="150" cy="300" r="95" fill="#fde68a" opacity="0.3"/>
          <circle cx="350" cy="350" r="55" fill="#bfdbfe" opacity="0.5"/>
          <circle cx="550" cy="280" r="100" fill="#fef3c7" opacity="0.3"/>
          <circle cx="750" cy="320" r="80" fill="#dbeafe" opacity="0.4"/>
          <circle cx="950" cy="360" r="70" fill="#fde68a" opacity="0.5"/>
          <circle cx="1150" cy="300" r="90" fill="#bfdbfe" opacity="0.3"/>
          <circle cx="1350" cy="340" r="60" fill="#fef3c7" opacity="0.4"/>
          
          <circle cx="120" cy="500" r="70" fill="#dbeafe" opacity="0.4"/>
          <circle cx="320" cy="550" r="85" fill="#fde68a" opacity="0.3"/>
          <circle cx="520" cy="480" r="75" fill="#bfdbfe" opacity="0.5"/>
          <circle cx="720" cy="520" r="95" fill="#fef3c7" opacity="0.3"/>
          <circle cx="920" cy="560" r="65" fill="#dbeafe" opacity="0.4"/>
          <circle cx="1120" cy="500" r="80" fill="#fde68a" opacity="0.5"/>
          <circle cx="1320" cy="540" r="70" fill="#bfdbfe" opacity="0.3"/>
          
          <circle cx="200" cy="700" r="60" fill="#fef3c7" opacity="0.4"/>
          <circle cx="400" cy="750" r="90" fill="#dbeafe" opacity="0.3"/>
          <circle cx="600" cy="680" r="75" fill="#fde68a" opacity="0.5"/>
          <circle cx="800" cy="720" r="85" fill="#bfdbfe" opacity="0.4"/>
          <circle cx="1000" cy="760" r="55" fill="#fef3c7" opacity="0.3"/>
          <circle cx="1200" cy="700" r="80" fill="#dbeafe" opacity="0.5"/>
        </svg>
      </div>

      <div className="relative z-10 flex min-h-screen pt-10 pb-10">
        {/* Left side - Form */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-md">
            {children}
          </div>
        </div>
        
        {/* Right side - Hero Image */}
        <div className="hidden lg:flex flex-1 items-center justify-center p-8">
          <div className="relative">
            <img
              src={heroImage}
              alt="Student with backpack"
              className="w-full max-w-lg h-auto object-cover rounded-2xl shadow-2xl"
            />
            {/* Overlay gradient for better text readability if needed */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-2xl"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;