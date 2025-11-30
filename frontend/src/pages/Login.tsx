/**
 * Login.tsx
 * 
 * Purpose: Animated login/signup page with sliding card design
 * Features: Email/password login, Google/GitHub OAuth, smooth transitions
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FcGoogle } from 'react-icons/fc';
import { FaGithub } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    title: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  }>({ title: '', message: '', type: 'info' });

  const navigate = useNavigate();
  const { signIn, signUp, signInWithGoogle, signInWithGithub } = useAuth();

  const handleGoogleLogin = async () => {
    setModalConfig({
      title: 'Coming Soon',
      message: 'Google Sign-In will be available soon.\n\nWe\'re working on integrating OAuth providers to make your login experience even better.\n\nFor now, please use email and password to sign up or sign in.',
      type: 'info'
    });
    setShowModal(true);
  };

  const handleGithubLogin = async () => {
    setModalConfig({
      title: 'Coming Soon',
      message: 'GitHub Sign-In will be available soon.\n\nWe\'re working on integrating OAuth providers to make your login experience even better.\n\nFor now, please use email and password to sign up or sign in.',
      type: 'info'
    });
    setShowModal(true);
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setValidationErrors({});
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    // Client-side validation
    const errors: { [key: string]: string } = {};
    if (!email) errors.email = 'Email is required';
    if (!password) errors.password = 'Password is required';

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setLoading(false);
      return;
    }

    const { error } = await signIn(email, password);

    if (error) {
      // Check if it's email verification error
      if (error.message.includes('Email not confirmed') || error.message.includes('email') && error.message.includes('confirm')) {
        setModalConfig({
          title: 'Email Not Verified',
          message: 'Please verify your email address before signing in.\n\nCheck your inbox for the verification link we sent you.\n\nTip: If you don\'t see it, please check your spam/junk folder.',
          type: 'warning'
        });
        setShowModal(true);
      } else {
        setModalConfig({
          title: 'Sign In Failed',
          message: error.message,
          type: 'error'
        });
        setShowModal(true);
      }
      setLoading(false);
    } else {
      navigate('/');
    }
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setValidationErrors({});
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const fullName = formData.get('fullName') as string;
    const username = formData.get('username') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const role = formData.get('role') as string;

    // Client-side validation
    const errors: { [key: string]: string } = {};
    if (!fullName) errors.fullName = 'Full name is required';
    if (!username) errors.username = 'Username is required';
    else if (username.length < 3) errors.username = 'Username must be at least 3 characters';
    else if (username.length > 50) errors.username = 'Username must not exceed 50 characters';
    else if (!/^[a-zA-Z0-9_]+$/.test(username)) errors.username = 'Username can only contain letters, numbers, and underscores';
    if (!email) errors.email = 'Email is required';
    if (!password) errors.password = 'Password is required';
    else if (password.length < 6) errors.password = 'Password must be at least 6 characters';
    if (!role) errors.role = 'Role is required';

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setLoading(false);
      return;
    }

    const { error } = await signUp(email, password, fullName, role, username);

    if (error) {
      setModalConfig({
        title: 'Registration Failed',
        message: error.message,
        type: 'error'
      });
      setShowModal(true);
      setLoading(false);
    } else {
      setModalConfig({
        title: 'Account Created Successfully',
        message: 'We\'ve sent a verification email to your inbox.\n\nPlease check your email and click the verification link to activate your account.\n\nTip: If you don\'t see it in your inbox, please check your spam/junk folder.',
        type: 'success'
      });
      setShowModal(true);
      setLoading(false);
      // Clear form
      (e.target as HTMLFormElement).reset();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-purple-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Modal for notifications */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
      />

      {/* Animated background circles */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-orange-200/30 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      <div className="w-full max-w-4xl">
        {/* Removed success/error banners - now using Modal */}

        {/* Main Card Container */}
        <div className="relative bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl overflow-hidden" style={{ height: '550px' }}>
          <div className="relative h-full flex">

            {/* Sign In Form - RIGHT side by default */}
            <div
              className={`absolute right-0 w-full md:w-1/2 h-full p-8 md:p-12 bg-white flex items-center transition-all duration-700 ease-in-out ${isSignUp
                ? 'opacity-0 pointer-events-none z-0'
                : 'opacity-100 pointer-events-auto z-20'
                }`}
            >
              <div className="w-full max-w-sm mx-auto">
                <div className="mb-6 text-center">
                  <h3 className="text-3xl font-bold text-gray-900 mb-1">Login</h3>
                </div>

                <form onSubmit={handleSignIn} className="space-y-5">
                  <div className={`relative ${validationErrors.email ? 'mb-8' : ''}`}>
                    <input
                      type="email"
                      id="signin-email"
                      name="email"
                      className={`w-full px-4 py-3 pr-10 bg-gray-100 border-0 rounded-lg focus:ring-2 ${validationErrors.email ? 'ring-2 ring-red-400' : 'focus:ring-purple-500'} focus:bg-white hover:bg-gray-200 transition-all outline-none text-gray-800 placeholder-gray-500`}
                      placeholder="Username"
                      disabled={loading}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                      </svg>
                    </span>
                    {validationErrors.email && (
                      <div className="absolute left-0 top-full mt-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {validationErrors.email}
                      </div>
                    )}
                  </div>

                  <div className={`relative ${validationErrors.password ? 'mb-8' : ''}`}>
                    <input
                      type="password"
                      id="signin-password"
                      name="password"
                      className={`w-full px-4 py-3 pr-10 bg-gray-100 border-0 rounded-lg focus:ring-2 ${validationErrors.password ? 'ring-2 ring-red-400' : 'focus:ring-purple-500'} focus:bg-white hover:bg-gray-200 transition-all outline-none text-gray-800 placeholder-gray-500`}
                      placeholder="Password"
                      disabled={loading}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                    {validationErrors.password && (
                      <div className="absolute left-0 top-full mt-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {validationErrors.password}
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <a href="#" className="text-xs text-gray-600 hover:text-gray-800">
                      Forgot Password?
                    </a>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-orange-500 via-red-500 to-purple-600 hover:from-orange-600 hover:via-red-600 hover:to-purple-700 text-white py-3 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 mt-4"
                  >
                    {loading ? 'Signing in...' : 'Login'}
                  </button>

                  {/* Error Message - below login button */}
                  {error && (
                    <div className="text-red-600 text-sm text-center mt-2">
                      {error}
                    </div>
                  )}
                </form>

                {/* Divider */}
                <div className="relative my-5">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-3 bg-white text-gray-500">or login with social platforms</span>
                  </div>
                </div>

                {/* Social Login Buttons */}
                <div className="flex justify-center gap-3">
                  <button
                    onClick={handleGoogleLogin}
                    className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-purple-300 hover:shadow-md transition-all transform hover:scale-110"
                  >
                    <FcGoogle size={20} />
                  </button>
                  <button
                    onClick={handleGithubLogin}
                    className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-purple-300 hover:shadow-md transition-all transform hover:scale-110"
                  >
                    <FaGithub size={20} className="text-gray-800" />
                  </button>
                </div>
              </div>
            </div>

            {/* Sign Up Form - LEFT side */}
            <div
              className={`absolute left-0 w-full md:w-1/2 h-full p-8 md:p-12 bg-white flex items-center transition-all duration-700 ease-in-out ${!isSignUp
                ? 'opacity-0 pointer-events-none z-0'
                : 'opacity-100 pointer-events-auto z-20'
                }`}
            >
              <div className="w-full max-w-sm mx-auto">
                <div className="mb-6 text-center">
                  <h3 className="text-3xl font-bold text-gray-900 mb-1">Register</h3>
                </div>

                <form onSubmit={handleSignUp} className="space-y-5">
                  <div className={`relative ${validationErrors.fullName ? 'mb-8' : ''}`}>
                    <input
                      type="text"
                      name="fullName"
                      className={`w-full px-4 py-3 bg-gray-100 border-0 rounded-lg focus:ring-2 ${validationErrors.fullName ? 'ring-2 ring-red-400' : 'focus:ring-purple-500'} focus:bg-white hover:bg-gray-200 transition-all outline-none text-gray-800 placeholder-gray-500`}
                      placeholder="Full Name"
                      disabled={loading}
                    />
                    {validationErrors.fullName && (
                      <div className="absolute left-0 top-full mt-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {validationErrors.fullName}
                      </div>
                    )}
                  </div>

                  <div className={`relative ${validationErrors.username ? 'mb-8' : ''}`}>
                    <input
                      type="text"
                      name="username"
                      className={`w-full px-4 py-3 bg-gray-100 border-0 rounded-lg focus:ring-2 ${validationErrors.username ? 'ring-2 ring-red-400' : 'focus:ring-purple-500'} focus:bg-white hover:bg-gray-200 transition-all outline-none text-gray-800 placeholder-gray-500`}
                      placeholder="Username (letters, numbers, underscore only)"
                      disabled={loading}
                    />
                    {validationErrors.username && (
                      <div className="absolute left-0 top-full mt-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {validationErrors.username}
                      </div>
                    )}
                  </div>

                  <div className={`relative ${validationErrors.email ? 'mb-8' : ''}`}>
                    <input
                      type="email"
                      name="email"
                      className={`w-full px-4 py-3 bg-gray-100 border-0 rounded-lg focus:ring-2 ${validationErrors.email ? 'ring-2 ring-red-400' : 'focus:ring-purple-500'} focus:bg-white hover:bg-gray-200 transition-all outline-none text-gray-800 placeholder-gray-500`}
                      placeholder="Email Address"
                      disabled={loading}
                    />
                    {validationErrors.email && (
                      <div className="absolute left-0 top-full mt-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {validationErrors.email}
                      </div>
                    )}
                  </div>

                  <div className={`relative ${validationErrors.password ? 'mb-8' : ''}`}>
                    <input
                      type="password"
                      name="password"
                      className={`w-full px-4 py-3 bg-gray-100 border-0 rounded-lg focus:ring-2 ${validationErrors.password ? 'ring-2 ring-red-400' : 'focus:ring-purple-500'} focus:bg-white hover:bg-gray-200 transition-all outline-none text-gray-800 placeholder-gray-500`}
                      placeholder="Password"
                      minLength={6}
                      disabled={loading}
                    />
                    {validationErrors.password && (
                      <div className="absolute left-0 top-full mt-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {validationErrors.password}
                      </div>
                    )}
                  </div>

                  <div className={`relative ${validationErrors.role ? 'mb-8' : ''}`}>
                    <select
                      name="role"
                      className={`w-full px-4 py-3 bg-gray-100 border-0 rounded-lg focus:ring-2 ${validationErrors.role ? 'ring-2 ring-red-400' : 'focus:ring-purple-500'} focus:bg-white hover:bg-gray-200 transition-all outline-none text-gray-800 appearance-none cursor-pointer`}
                      disabled={loading}
                      defaultValue=""
                    >
                      <option value="" disabled className="text-gray-500">Select your role</option>
                      <option value="engineering_manager">Engineering Manager</option>
                      <option value="product_manager">Product Manager</option>
                      <option value="team_lead">Team Lead</option>
                      <option value="senior_developer">Senior Developer</option>
                      <option value="developer">Developer</option>
                      <option value="junior_developer">Junior Developer</option>
                      <option value="qa_engineer">QA Engineer</option>
                      <option value="devops_engineer">DevOps Engineer</option>
                      <option value="designer">Designer</option>
                      <option value="hr_manager">HR Manager</option>
                      <option value="intern">Intern</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                    {validationErrors.role && (
                      <div className="absolute left-0 top-full mt-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {validationErrors.role}
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-orange-500 via-red-500 to-purple-600 hover:from-orange-600 hover:via-red-600 hover:to-purple-700 text-white py-3 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 mt-4"
                  >
                    {loading ? 'Creating Account...' : 'Register'}
                  </button>
                </form>

                {/* Social Login Buttons */}
                <div className="flex justify-center gap-3 mt-5">
                  <button
                    onClick={handleGoogleLogin}
                    aria-label="Sign up with Google"
                    className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-purple-300 hover:shadow-md transition-all transform hover:scale-110"
                  >
                    <FcGoogle size={20} />
                  </button>
                  <button
                    onClick={handleGithubLogin}
                    aria-label="Sign up with GitHub"
                    className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-purple-300 hover:shadow-md transition-all transform hover:scale-110"
                  >
                    <FaGithub size={20} className="text-gray-800" />
                  </button>
                </div>
              </div>
            </div>

            {/* Curved Wave Panel - Slides between left and right */}
            <div
              className={`absolute top-0 bottom-0 w-full md:w-1/2 transition-all duration-700 ease-in-out z-10 ${isSignUp
                ? 'md:right-0 md:left-auto'
                : 'md:left-0 md:right-auto'
                }`}
            >
              {/* Curved SVG Shape */}
              <div className="relative h-full bg-gradient-to-br from-orange-500 via-red-500 via-purple-600 to-blue-600 flex items-center justify-center overflow-hidden shadow-inner">
                {/* Decorative background circles */}
                <div className="absolute top-20 left-10 w-32 h-32 bg-purple-400/20 rounded-full blur-2xl"></div>
                <div className="absolute bottom-32 right-16 w-40 h-40 bg-blue-400/20 rounded-full blur-3xl"></div>
                <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-orange-400/30 rounded-full blur-xl"></div>

                {/* Curve on the right edge when on left side, curve on left edge when on right side */}
                <svg
                  className={`absolute top-0 bottom-0 h-full w-32 ${isSignUp ? '-left-1' : '-right-1'}`}
                  viewBox="0 0 100 550"
                  preserveAspectRatio="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d={isSignUp ? "M100,0 Q50,275 100,550 L0,550 L0,0 Z" : "M0,0 Q50,275 0,550 L100,550 L100,0 Z"}
                    fill="currentColor"
                    className="text-purple-600"
                  />
                </svg>

                {/* Content */}
                <div className="relative z-10 text-center text-white px-8">
                  <h2 className="text-3xl md:text-4xl font-bold mb-3">
                    {isSignUp ? 'Hello, Welcome!' : 'Hello, Welcome!'}
                  </h2>
                  <p className="text-white/90 mb-6 text-sm">
                    {isSignUp ? "Already have an account?" : "Don't have an account?"}
                  </p>
                  <button
                    onClick={() => setIsSignUp(!isSignUp)}
                    type="button"
                    className="px-8 py-2.5 border-2 border-white text-white rounded-full font-medium hover:bg-white hover:text-purple-600 transition-all transform hover:scale-105 hover:shadow-lg"
                  >
                    {isSignUp ? 'Login' : 'Register'}
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Custom Animation Styles */}
      <style>{`
        .h-\\[550px\\] {
          height: 550px;
        }
      `}</style>
    </div>
  );
}
