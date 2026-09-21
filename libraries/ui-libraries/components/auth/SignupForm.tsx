import React, { useState } from 'react';
import AuthInput from './AuthInput';
import AuthButton from './AuthButton';
import SocialLoginButton from './SocialLoginButton';
// import ReCAPTCHA from 'react-google-recaptcha';

interface SignupFormProps {
  onSubmit: (data: SignupFormData) => void;
  onSwitchToLogin: () => void;
  loading?: boolean;
  // recaptchaSiteKey?: string;
}

export interface SignupFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  agreeToTerms: boolean;
  // captchaToken?: string;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  agreeToTerms?: string;
  // captchaToken?: string;
}

const SignupForm: React.FC<SignupFormProps> = ({
  onSubmit,
  onSwitchToLogin,
  loading = false,
  // recaptchaSiteKey
}) => {
  const [formData, setFormData] = useState<SignupFormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    agreeToTerms: false
    // captchaToken: undefined
  });

  const [errors, setErrors] = useState<FormErrors>({});
  // const [captchaLoaded, setCaptchaLoaded] = useState(false);
  // const [captchaError, setCaptchaError] = useState<string | null>(null);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = 'You must agree to the terms and conditions';
    }
    
    // Validate captcha if loaded
    // if (captchaLoaded && !formData.captchaToken) {
    //   newErrors.captchaToken = 'Please complete the security check';
    // }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };
  
  // const handleCaptchaChange = (token: string | null) => {
  //   setFormData(prev => ({
  //     ...prev,
  //     captchaToken: token || undefined
  //   }));
    
  //   if (token) {
  //     setCaptchaError(null);
  //     setCaptchaLoaded(true);
  //   } else {
  //     setCaptchaError('Please complete the security check');
  //   }
  // };

  const handleSocialLogin = (provider: string) => {
    console.log(`Login with ${provider}`);
    // Implement social login logic here
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Create an account</h1>
        <p className="text-gray-600">
          Already have an account?{' '}
          <button
            onClick={onSwitchToLogin}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Login
          </button>
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <AuthInput
              type="text"
              placeholder="First Name"
              value={formData.firstName}
              onChange={(value) => setFormData({ ...formData, firstName: value })}
              required
            />
            {errors.firstName && (
              <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
            )}
          </div>
          <div>
            <AuthInput
              type="text"
              placeholder="Last Name"
              value={formData.lastName}
              onChange={(value) => setFormData({ ...formData, lastName: value })}
              required
            />
            {errors.lastName && (
              <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
            )}
          </div>
        </div>

        {/* Email */}
        <div>
          <AuthInput
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(value) => setFormData({ ...formData, email: value })}
            required
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <AuthInput
            type="password"
            placeholder="Enter your password"
            value={formData.password}
            onChange={(value) => setFormData({ ...formData, password: value })}
            showPasswordToggle
            required
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password}</p>
          )}
        </div>

        {/* Terms and Conditions */}
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="agreeToTerms"
            checked={formData.agreeToTerms}
            onChange={(e) => setFormData({ ...formData, agreeToTerms: e.target.checked })}
            className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="agreeToTerms" className="text-sm text-gray-700">
            I agree to the{' '}
            <a href="#" className="text-blue-600 hover:text-blue-700 underline">
              terms & conditions
            </a>
          </label>
        </div>
        {errors.agreeToTerms && (
          <p className="text-sm text-red-600">{errors.agreeToTerms}</p>
        )}

        {/* reCAPTCHA Widget
        <div className="pt-4">
          {(recaptchaSiteKey && recaptchaSiteKey.length > 0) || (import.meta.env.VITE_RECAPTCHA_SITE_KEY && import.meta.env.VITE_RECAPTCHA_SITE_KEY.length > 0) ? (
            <ReCAPTCHA
              sitekey={recaptchaSiteKey || import.meta.env.VITE_RECAPTCHA_SITE_KEY || ""}
              onChange={handleCaptchaChange}
              onErrored={() => {
                setCaptchaError('reCAPTCHA error occurred. Please refresh the page and try again.');
              }}
            />
          ) : (
            <div className="text-red-600 text-sm">
              reCAPTCHA is not configured. Contact the administrator to set up reCAPTCHA.
            </div>
          )}
          {errors.captchaToken && (
            <p className="mt-1 text-sm text-red-600">{errors.captchaToken}</p>
          )}
          {captchaError && (
            <p className="mt-1 text-sm text-red-600">{captchaError}</p>
          )}
        </div> */}
        
        {/* Submit Button */}
        <div className="pt-4">
          <AuthButton
            type="submit"
            variant="primary"
            loading={loading}
            // disabled={loading || !captchaLoaded || !formData.captchaToken}
          >
            Create account
          </AuthButton>
        </div>
      </form>

      {/* Divider */}
      {/* Divider */}
      <div className="my-6 flex items-center">
        <div className="flex-1 border-t border-gray-300"></div>
        <span className="px-4 text-sm text-gray-500">Or sign up with</span>
        <div className="flex-1 border-t border-gray-300"></div>
      </div>

      {/* Social Login */}
      <div className="space-y-3">
        <SocialLoginButton
          provider="google"
          onClick={() => handleSocialLogin('google')}
        />
      </div>
    </div>
  );
};

export default SignupForm;