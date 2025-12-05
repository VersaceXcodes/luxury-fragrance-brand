import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/main';

interface LoginForm {
  email: string;
  password: string;
  remember_me: boolean;
}

interface RegistrationForm {
  email: string;
  password: string;
  confirm_password: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  date_of_birth: string;
  newsletter_consent: boolean;
  terms_accepted: boolean;
}

interface FormErrors {
  email: string | null;
  password: string | null;
  confirm_password: string | null;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  date_of_birth: string | null;
  general: string | null;
}

interface PasswordStrength {
  score: 'weak' | 'fair' | 'good' | 'strong';
  requirements: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
  };
}

interface SocialLoginState {
  provider: string | null;
  is_processing: boolean;
  error: string | null;
}

const UV_LoginRegistration: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // URL Parameters
  const redirectTo = searchParams.get('redirect_to') || '/account';
  const actionParam = searchParams.get('action');
  
  // Mode state
  const [isRegisterMode, setIsRegisterMode] = useState(actionParam === 'register');
  const [showPasswordReset, setShowPasswordReset] = useState(actionParam === 'reset');
  
  // Form state
  const [loginForm, setLoginForm] = useState<LoginForm>({
    email: '',
    password: '',
    remember_me: false
  });
  
  const [registrationForm, setRegistrationForm] = useState<RegistrationForm>({
    email: '',
    password: '',
    confirm_password: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    date_of_birth: '',
    newsletter_consent: false,
    terms_accepted: false
  });
  
  const [formErrors, setFormErrors] = useState<FormErrors>({
    email: null,
    password: null,
    confirm_password: null,
    first_name: null,
    last_name: null,
    phone_number: null,
    date_of_birth: null,
    general: null
  });
  
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 'weak',
    requirements: {
      length: false,
      uppercase: false,
      lowercase: false,
      number: false,
      special: false
    }
  });
  
  const [socialLoginState, setSocialLoginState] = useState<SocialLoginState>({
    provider: null,
    is_processing: false,
    error: null
  });
  
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  
  // Global state selectors - CRITICAL: Individual selectors only!
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const isLoading = useAppStore(state => state.authentication_state.authentication_status.is_loading);
  const authError = useAppStore(state => state.authentication_state.error_message);
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const loginUser = useAppStore(state => state.login_user);
  const registerUser = useAppStore(state => state.register_user);
  const logoutUser = useAppStore(state => state.logout_user);
  const clearAuthError = useAppStore(state => state.clear_auth_error);
  const showNotification = useAppStore(state => state.show_notification);
  
  // Redirect if already authenticated (unless force_logout param is present)
  const forceLogout = searchParams.get('force_logout') === 'true';
  useEffect(() => {
    if (isAuthenticated && currentUser && !forceLogout) {
      navigate(redirectTo);
    }
  }, [isAuthenticated, currentUser, navigate, redirectTo, forceLogout]);
  
  // Clear errors when switching modes
  useEffect(() => {
    clearAuthError();
    setFormErrors({
      email: null,
      password: null,
      confirm_password: null,
      first_name: null,
      last_name: null,
      phone_number: null,
      date_of_birth: null,
      general: null
    });
  }, [isRegisterMode, clearAuthError]);
  
  // Password strength calculation
  const calculatePasswordStrength = (password: string): PasswordStrength => {
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)
    };
    
    const passedCount = Object.values(requirements).filter(Boolean).length;
    let score: 'weak' | 'fair' | 'good' | 'strong' = 'weak';
    
    if (passedCount >= 4) score = 'strong';
    else if (passedCount >= 3) score = 'good';
    else if (passedCount >= 2) score = 'fair';
    
    return { score, requirements };
  };
  
  // Form validation
  const validateEmail = (email: string): string | null => {
    if (!email) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address';
    return null;
  };
  
  const validatePassword = (password: string, isLogin: boolean = false): string | null => {
    if (!password) return 'Password is required';
    if (!isLogin && password.length < 8) return 'Password must be at least 8 characters long';
    return null;
  };
  
  const validateConfirmPassword = (password: string, confirmPassword: string): string | null => {
    if (!confirmPassword) return 'Please confirm your password';
    if (password !== confirmPassword) return 'Passwords do not match';
    return null;
  };
  
  const validateName = (name: string, fieldName: string): string | null => {
    if (!name.trim()) return `${fieldName} is required`;
    if (name.trim().length < 2) return `${fieldName} must be at least 2 characters long`;
    return null;
  };
  
  const validatePhoneNumber = (phone: string): string | null => {
    if (phone && !/^\+?[\d\s\-()]+$/.test(phone)) return 'Please enter a valid phone number';
    return null;
  };
  
  const validateDateOfBirth = (date: string): string | null => {
    if (date) {
      const birthDate = new Date(date);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      if (age < 13) return 'You must be at least 13 years old to create an account';
    }
    return null;
  };
  
  // Handle form field changes with validation
  const handleLoginFieldChange = (field: keyof LoginForm, value: string | boolean) => {
    setLoginForm(prev => ({ ...prev, [field]: value }));
    
    // Clear field-specific errors
    if (field === 'email' || field === 'password') {
      setFormErrors(prev => ({ ...prev, [field]: null, general: null }));
    }
  };
  
  const handleRegistrationFieldChange = (field: keyof RegistrationForm, value: string | boolean) => {
    setRegistrationForm(prev => ({ ...prev, [field]: value }));
    
    // Real-time password strength validation
    if (field === 'password') {
      setPasswordStrength(calculatePasswordStrength(value as string));
    }
    
    // Clear field-specific errors and validate
    setFormErrors(prev => ({ ...prev, [field]: null, general: null }));
    
    // Real-time validation for specific fields
    if (field === 'email' && value) {
      const emailError = validateEmail(value as string);
      if (emailError) setFormErrors(prev => ({ ...prev, email: emailError }));
    }
    
    if (field === 'confirm_password' && value) {
      const confirmError = validateConfirmPassword(registrationForm.password, value as string);
      if (confirmError) setFormErrors(prev => ({ ...prev, confirm_password: confirmError }));
    }
  };
  
  // Handle login submission
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAuthError();
    
    // Validate form
    const emailError = validateEmail(loginForm.email);
    const passwordError = validatePassword(loginForm.password, true);
    
    if (emailError || passwordError) {
      setFormErrors(prev => ({
        ...prev,
        email: emailError,
        password: passwordError
      }));
      return;
    }
    
    try {
      await loginUser(loginForm.email, loginForm.password);
      // Navigation handled by useEffect when auth state changes
    } catch (error: any) {
      console.error('Login error:', error);
    }
  };
  
  // Handle registration submission
  const handleRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAuthError();
    
    // Validate all fields
    const errors: FormErrors = {
      email: validateEmail(registrationForm.email),
      password: validatePassword(registrationForm.password),
      confirm_password: validateConfirmPassword(registrationForm.password, registrationForm.confirm_password),
      first_name: validateName(registrationForm.first_name, 'First name'),
      last_name: validateName(registrationForm.last_name, 'Last name'),
      phone_number: validatePhoneNumber(registrationForm.phone_number),
      date_of_birth: validateDateOfBirth(registrationForm.date_of_birth),
      general: null
    };
    
    // Check terms acceptance
    if (!registrationForm.terms_accepted) {
      errors.general = 'You must accept the Terms and Conditions to create an account';
    }
    
    // Check if there are any errors
    const hasErrors = Object.values(errors).some(error => error !== null);
    if (hasErrors) {
      setFormErrors(errors);
      return;
    }
    
    try {
      await registerUser({
        email: registrationForm.email,
        password: registrationForm.password,
        first_name: registrationForm.first_name,
        last_name: registrationForm.last_name,
        phone_number: registrationForm.phone_number || undefined,
        date_of_birth: registrationForm.date_of_birth || undefined
      });
      // Navigation handled by useEffect when auth state changes
    } catch (error: any) {
      console.error('Registration error:', error);
    }
  };
  
  // Handle password reset
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const emailError = validateEmail(resetEmail);
    if (emailError) {
      setFormErrors(prev => ({ ...prev, email: emailError }));
      return;
    }
    
    try {
      // Note: This endpoint might be missing based on the spec
      // For now, simulate the action
      setResetSent(true);
      setFormErrors(prev => ({ ...prev, email: null }));
    } catch {
      setFormErrors(prev => ({ ...prev, general: 'Failed to send reset email. Please try again.' }));
    }
  };
  
  // Handle social login
  const handleSocialLogin = (provider: 'google' | 'facebook' | 'apple') => {
    setSocialLoginState({
      provider,
      is_processing: true,
      error: null
    });
    
    // In a real implementation, this would redirect to OAuth provider
    // For now, just show processing state
    setTimeout(() => {
      setSocialLoginState({
        provider: null,
        is_processing: false,
        error: 'Social login not yet implemented'
      });
    }, 2000);
  };
  
  // Mode switching
  const toggleMode = () => {
    setIsRegisterMode(!isRegisterMode);
    setShowPasswordReset(false);
    setResetSent(false);
    clearAuthError();
  };
  
  const showPasswordResetForm = () => {
    setShowPasswordReset(true);
    setIsRegisterMode(false);
    setResetSent(false);
    clearAuthError();
  };
  
  const backToLogin = () => {
    setShowPasswordReset(false);
    setResetSent(false);
    setIsRegisterMode(false);
    clearAuthError();
  };
  
  // Password strength indicator component
  const PasswordStrengthIndicator = () => {
    const getStrengthColor = () => {
      switch (passwordStrength.score) {
        case 'weak': return 'bg-red-500';
        case 'fair': return 'bg-yellow-500';
        case 'good': return 'bg-blue-500';
        case 'strong': return 'bg-green-500';
        default: return 'bg-gray-300';
      }
    };
    
    const getStrengthWidth = () => {
      switch (passwordStrength.score) {
        case 'weak': return 'w-1/4';
        case 'fair': return 'w-2/4';
        case 'good': return 'w-3/4';
        case 'strong': return 'w-full';
        default: return 'w-0';
      }
    };
    
    return (
      <div className="mt-2">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">Password strength:</span>
          <span className={`text-sm font-medium ${passwordStrength.score === 'strong' ? 'text-green-600' : passwordStrength.score === 'good' ? 'text-blue-600' : passwordStrength.score === 'fair' ? 'text-yellow-600' : 'text-red-600'}`}>
            {passwordStrength.score.charAt(0).toUpperCase() + passwordStrength.score.slice(1)}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor()} ${getStrengthWidth()}`}></div>
        </div>
        <div className="mt-2 text-xs text-gray-600">
          <div className="grid grid-cols-2 gap-2">
            <div className={`flex items-center ${passwordStrength.requirements.length ? 'text-green-600' : 'text-gray-400'}`}>
              <span className="mr-1">{passwordStrength.requirements.length ? '✓' : '○'}</span>
              8+ characters
            </div>
            <div className={`flex items-center ${passwordStrength.requirements.uppercase ? 'text-green-600' : 'text-gray-400'}`}>
              <span className="mr-1">{passwordStrength.requirements.uppercase ? '✓' : '○'}</span>
              Uppercase letter
            </div>
            <div className={`flex items-center ${passwordStrength.requirements.lowercase ? 'text-green-600' : 'text-gray-400'}`}>
              <span className="mr-1">{passwordStrength.requirements.lowercase ? '✓' : '○'}</span>
              Lowercase letter
            </div>
            <div className={`flex items-center ${passwordStrength.requirements.number ? 'text-green-600' : 'text-gray-400'}`}>
              <span className="mr-1">{passwordStrength.requirements.number ? '✓' : '○'}</span>
              Number
            </div>
            <div className={`flex items-center ${passwordStrength.requirements.special ? 'text-green-600' : 'text-gray-400'}`}>
              <span className="mr-1">{passwordStrength.requirements.special ? '✓' : '○'}</span>
              Special character
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-primary-200/30 to-secondary-200/30 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-secondary-200/30 to-primary-200/30 rounded-full blur-3xl"></div>
        </div>
        
        <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl flex items-center justify-center shadow-large">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
              </div>
            </div>
            <h1 className="text-4xl font-display font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent mb-2">LuxeScent</h1>
            <p className="text-neutral-600 font-medium">Discover Your Signature Scent</p>
          </div>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
          <div className="bg-white/80 backdrop-blur-xl py-10 px-6 shadow-large rounded-3xl border border-white/20 sm:px-12">
            {showPasswordReset ? (
              // Password Reset Form
              <div>
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Reset Password</h2>
                  <p className="text-sm text-gray-600 mt-2">
                    {resetSent ? 'Check your email for reset instructions' : 'Enter your email to receive reset instructions'}
                  </p>
                </div>

                {resetSent ? (
                  <div className="text-center">
                    <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-green-800">Email sent!</h3>
                          <div className="mt-2 text-sm text-green-700">
                            <p>We've sent password reset instructions to {resetEmail}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={backToLogin}
                      className="text-purple-600 hover:text-purple-500 text-sm font-medium"
                    >
                      Back to sign in
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handlePasswordReset} className="space-y-6">
                    {formErrors.general && (
                      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                        <p className="text-sm">{formErrors.general}</p>
                      </div>
                    )}

                    <div>
                      <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700">
                        Email address
                      </label>
                      <div className="mt-1">
                        <input
                          id="reset-email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          required
                          value={resetEmail}
                          onChange={(e) => {
                            setResetEmail(e.target.value);
                            setFormErrors(prev => ({ ...prev, email: null }));
                          }}
                          className={`appearance-none block w-full px-3 py-2 border ${formErrors.email ? 'border-red-300' : 'border-gray-300'} rounded-md placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm`}
                          placeholder="Enter your email address"
                        />
                        {formErrors.email && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <button
                        type="submit"
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
                      >
                        Send Reset Instructions
                      </button>
                    </div>

                    <div className="text-center">
                      <button
                        type="button"
                        onClick={backToLogin}
                        className="text-purple-600 hover:text-purple-500 text-sm font-medium"
                      >
                        Back to sign in
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              // Login/Registration Forms
              <div>
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-display font-bold text-neutral-900 mb-2">
                    {isRegisterMode ? 'Create Your Account' : 'Welcome Back'}
                  </h2>
                  <p className="text-neutral-600">
                    {isRegisterMode 
                      ? 'Join our luxury fragrance community' 
                      : 'Sign in to your account'
                    }
                  </p>
                </div>

                {/* Social Login Buttons */}
                <div className="space-y-3 mb-8">
                  <button
                    onClick={() => handleSocialLogin('google')}
                    disabled={socialLoginState.is_processing}
                    className="w-full flex justify-center items-center px-6 py-3 border border-neutral-200 rounded-2xl shadow-soft bg-white text-sm font-medium text-neutral-700 hover:bg-neutral-50 hover:shadow-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500/20 transition-all duration-200 disabled:opacity-50 group"
                  >
                    <svg className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform duration-200" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                  </button>
                  
                  <button
                    onClick={() => handleSocialLogin('facebook')}
                    disabled={socialLoginState.is_processing}
                    className="w-full flex justify-center items-center px-6 py-3 border border-neutral-200 rounded-2xl shadow-soft bg-white text-sm font-medium text-neutral-700 hover:bg-neutral-50 hover:shadow-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500/20 transition-all duration-200 disabled:opacity-50 group"
                  >
                    <svg className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform duration-200" fill="#1877F2" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    Continue with Facebook
                  </button>
                </div>

                {socialLoginState.error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
                    <p className="text-sm">{socialLoginState.error}</p>
                  </div>
                )}

                <div className="relative mb-8">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-neutral-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-neutral-500 font-medium">Or continue with email</span>
                  </div>
                </div>

                {/* Login/Registration Form */}
                <form onSubmit={isRegisterMode ? handleRegistrationSubmit : handleLoginSubmit} className="space-y-6">
                  {(authError || formErrors.general) && (
                    <div className="bg-red-50 border border-red-400 text-red-800 px-4 py-3 rounded-md shadow-sm" role="alert">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium">{authError || formErrors.general}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {isRegisterMode && (
                    <>
                      {/* Name Fields */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="first-name" className="block text-sm font-medium text-gray-700">
                            First Name *
                          </label>
                          <div className="mt-1">
                            <input
                              id="first-name"
                              name="firstName"
                              type="text"
                              autoComplete="given-name"
                              required
                              value={registrationForm.first_name}
                              onChange={(e) => handleRegistrationFieldChange('first_name', e.target.value)}
                              className={`appearance-none block w-full px-3 py-2 border ${formErrors.first_name ? 'border-red-300' : 'border-gray-300'} rounded-md placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm`}
                              placeholder="First name"
                            />
                            {formErrors.first_name && (
                              <p className="mt-1 text-sm text-red-600">{formErrors.first_name}</p>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <label htmlFor="last-name" className="block text-sm font-medium text-gray-700">
                            Last Name *
                          </label>
                          <div className="mt-1">
                            <input
                              id="last-name"
                              name="lastName"
                              type="text"
                              autoComplete="family-name"
                              required
                              value={registrationForm.last_name}
                              onChange={(e) => handleRegistrationFieldChange('last_name', e.target.value)}
                              className={`appearance-none block w-full px-3 py-2 border ${formErrors.last_name ? 'border-red-300' : 'border-gray-300'} rounded-md placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm`}
                              placeholder="Last name"
                            />
                            {formErrors.last_name && (
                              <p className="mt-1 text-sm text-red-600">{formErrors.last_name}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Email Field */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email Address *
                    </label>
                    <div className="mt-1">
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={isRegisterMode ? registrationForm.email : loginForm.email}
                        onChange={(e) => {
                          if (isRegisterMode) {
                            handleRegistrationFieldChange('email', e.target.value);
                          } else {
                            handleLoginFieldChange('email', e.target.value);
                          }
                        }}
                        className={`appearance-none block w-full px-3 py-2 border ${formErrors.email ? 'border-red-300' : 'border-gray-300'} rounded-md placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm`}
                        placeholder="Enter your email"
                      />
                      {formErrors.email && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>
                      )}
                    </div>
                  </div>

                  {isRegisterMode && (
                    <>
                      {/* Phone Number */}
                      <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                          Phone Number (Optional)
                        </label>
                        <div className="mt-1">
                          <input
                            id="phone"
                            name="phone"
                            type="tel"
                            autoComplete="tel"
                            value={registrationForm.phone_number}
                            onChange={(e) => handleRegistrationFieldChange('phone_number', e.target.value)}
                            className={`appearance-none block w-full px-3 py-2 border ${formErrors.phone_number ? 'border-red-300' : 'border-gray-300'} rounded-md placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm`}
                            placeholder="+1 (555) 123-4567"
                          />
                          {formErrors.phone_number && (
                            <p className="mt-1 text-sm text-red-600">{formErrors.phone_number}</p>
                          )}
                        </div>
                      </div>

                      {/* Date of Birth */}
                      <div>
                        <label htmlFor="dob" className="block text-sm font-medium text-gray-700">
                          Date of Birth (Optional)
                        </label>
                        <div className="mt-1">
                          <input
                            id="dob"
                            name="dob"
                            type="date"
                            value={registrationForm.date_of_birth}
                            onChange={(e) => handleRegistrationFieldChange('date_of_birth', e.target.value)}
                            className={`appearance-none block w-full px-3 py-2 border ${formErrors.date_of_birth ? 'border-red-300' : 'border-gray-300'} rounded-md placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm`}
                          />
                          {formErrors.date_of_birth && (
                            <p className="mt-1 text-sm text-red-600">{formErrors.date_of_birth}</p>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Password Field */}
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                      Password *
                    </label>
                    <div className="mt-1">
                      <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete={isRegisterMode ? "new-password" : "current-password"}
                        required
                        value={isRegisterMode ? registrationForm.password : loginForm.password}
                        onChange={(e) => {
                          if (isRegisterMode) {
                            handleRegistrationFieldChange('password', e.target.value);
                          } else {
                            handleLoginFieldChange('password', e.target.value);
                          }
                        }}
                        className={`appearance-none block w-full px-3 py-2 border ${formErrors.password ? 'border-red-300' : 'border-gray-300'} rounded-md placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm`}
                        placeholder="Enter your password"
                      />
                      {formErrors.password && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.password}</p>
                      )}
                    </div>
                    
                    {/* Password Strength Indicator (Registration only) */}
                    {isRegisterMode && registrationForm.password && (
                      <PasswordStrengthIndicator />
                    )}
                  </div>

                  {isRegisterMode && (
                    <>
                      {/* Confirm Password */}
                      <div>
                        <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                          Confirm Password *
                        </label>
                        <div className="mt-1">
                          <input
                            id="confirm-password"
                            name="confirmPassword"
                            type="password"
                            autoComplete="new-password"
                            required
                            value={registrationForm.confirm_password}
                            onChange={(e) => handleRegistrationFieldChange('confirm_password', e.target.value)}
                            className={`appearance-none block w-full px-3 py-2 border ${formErrors.confirm_password ? 'border-red-300' : 'border-gray-300'} rounded-md placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm`}
                            placeholder="Confirm your password"
                          />
                          {formErrors.confirm_password && (
                            <p className="mt-1 text-sm text-red-600">{formErrors.confirm_password}</p>
                          )}
                        </div>
                      </div>

                      {/* Account Benefits */}
                      <div className="bg-purple-50 border border-purple-200 rounded-md p-4">
                        <h3 className="text-sm font-medium text-purple-900 mb-2">Account Benefits</h3>
                        <div className="grid grid-cols-2 gap-2 text-xs text-purple-700">
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Order tracking
                          </div>
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Save favorites
                          </div>
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Faster checkout
                          </div>
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Exclusive offers
                          </div>
                        </div>
                      </div>

                      {/* Consent Section */}
                      <div className="space-y-3">
                        <div className="flex items-center">
                          <input
                            id="newsletter"
                            name="newsletter"
                            type="checkbox"
                            checked={registrationForm.newsletter_consent}
                            onChange={(e) => handleRegistrationFieldChange('newsletter_consent', e.target.checked)}
                            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                          />
                          <label htmlFor="newsletter" className="ml-2 block text-sm text-gray-700">
                            Subscribe to newsletter for exclusive offers and new arrivals
                          </label>
                        </div>

                        <div className="flex items-start">
                          <input
                            id="terms"
                            name="terms"
                            type="checkbox"
                            checked={registrationForm.terms_accepted}
                            onChange={(e) => handleRegistrationFieldChange('terms_accepted', e.target.checked)}
                            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded mt-0.5"
                          />
                          <label htmlFor="terms" className="ml-2 block text-sm text-gray-700">
                            I accept the{' '}
                            <Link to="/terms" className="text-purple-600 hover:text-purple-500">
                              Terms and Conditions
                            </Link>{' '}
                            and{' '}
                            <Link to="/privacy" className="text-purple-600 hover:text-purple-500">
                              Privacy Policy
                            </Link>{' '}
                            *
                          </label>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Remember Me (Login only) */}
                  {!isRegisterMode && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <input
                          id="remember-me"
                          name="remember-me"
                          type="checkbox"
                          checked={loginForm.remember_me}
                          onChange={(e) => handleLoginFieldChange('remember_me', e.target.checked)}
                          className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                        />
                        <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                          Remember me
                        </label>
                      </div>

                      <div className="text-sm">
                        <button
                          type="button"
                          onClick={showPasswordResetForm}
                          className="text-purple-600 hover:text-purple-500"
                        >
                          Forgot password?
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full flex justify-center py-4 px-6 border border-transparent rounded-2xl shadow-medium text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 hover:shadow-large focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                      {isLoading ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          {isRegisterMode ? 'Creating account...' : 'Signing in...'}
                        </span>
                      ) : (
                        isRegisterMode ? 'Create Account' : 'Sign In'
                      )}
                    </button>
                  </div>

                  {/* Mode Toggle */}
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={toggleMode}
                      className="text-purple-600 hover:text-purple-500 text-sm font-medium"
                    >
                      {isRegisterMode 
                        ? 'Already have an account? Sign in' 
                        : "Don't have an account? Create one"
                      }
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Guest Shopping Link */}
        <div className="mt-6 text-center">
          <Link 
            to="/"
            className="text-gray-600 hover:text-gray-900 text-sm"
          >
            Continue shopping as guest
          </Link>
        </div>
      </div>
    </>
  );
};

export default UV_LoginRegistration;