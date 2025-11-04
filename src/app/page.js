"use client"
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, getSession } from 'next-auth/react';
import { FcGoogle } from "react-icons/fc";
import { FaFacebook, FaEye, FaEyeSlash } from "react-icons/fa";
import Link from 'next/link';

const LoginPage = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsVisible(true);
    
    // Check if user is already logged in
    const checkSession = async () => {
      const session = await getSession();
      if (session) {
        router.push('/dashboard');
      }
    };
    checkSession();
  }, [router]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      console.log('Attempting login with email:', formData.email);
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      console.log('SignIn result:', result);

      if (result?.error) {
        console.error('Login error:', result.error);
        // Check for specific error messages from NextAuth
        if (result.error.includes('social login') || result.error.includes('set a password')) {
          setError('This account was created with social login. Please set a password first or login with your social account. You can set a password by going to Sign Up with the same email.');
        } else if (result.error === 'CredentialsSignin') {
          // Check if user exists but has no password
          try {
            const checkResponse = await fetch('/api/auth/check-user', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: formData.email }),
            });
            
            if (checkResponse.ok) {
              const checkData = await checkResponse.json();
              if (checkData.exists && !checkData.hasPassword) {
                setError('This account was created with social login. Please set a password first or login with your social account. You can set a password by going to Sign Up with the same email.');
              } else {
                setError('Invalid email or password. Please check your credentials or sign up if you don\'t have an account.');
              }
            } else {
              setError('Invalid email or password. Please check your credentials or sign up if you don\'t have an account.');
            }
          } catch (checkErr) {
            console.error('Error checking user:', checkErr);
            setError('Invalid email or password. Please check your credentials or sign up if you don\'t have an account.');
          }
        } else {
          setError(result.error || 'Invalid email or password. Please check your credentials or sign up if you don\'t have an account.');
        }
      } else if (result?.ok) {
        // Login successful - refresh to update session
        console.log('Login successful, redirecting...');
        router.refresh();
        router.push('/dashboard');
      } else {
        setError('Login failed. Please try again.');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider) => {
    try {
      setIsLoading(true);
      await signIn(provider, { 
        callbackUrl: '/dashboard',
        redirect: true 
      });
    } catch (error) {
      setError(`Failed to sign in with ${provider}`);
      console.error('Social login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (type) => {
    const demoAccounts = {
      admin: { email: 'admin@demo.com', password: 'demo123' },
      user: { email: 'user@demo.com', password: 'demo123' }
    };

    const demoAccount = demoAccounts[type];
    setFormData(demoAccount);
    
    // Auto-submit after setting demo credentials
    setTimeout(async () => {
      setIsLoading(true);
      setError('');
      
      try {
        const result = await signIn('credentials', {
          email: demoAccount.email,
          password: demoAccount.password,
          redirect: false,
        });

        if (result?.error) {
          setError('Demo account not found. Please check if the user exists in database.');
        } else {
          router.refresh();
          router.push('/dashboard');
        }
      } catch (err) {
        setError('Demo login failed');
      } finally {
        setIsLoading(false);
      }
    }, 500);
  };

  const features = [
    {
      icon: '📈',
      title: 'Track Performance',
      description: 'Monitor opens, clicks, and conversions in real-time'
    },
    {
      icon: '🚀',
      title: 'Send Instantly',
      description: 'Deliver emails to thousands of recipients in seconds'
    },
    {
      icon: '🎯',
      title: 'Smart Analytics',
      description: 'Get insights to improve your email campaigns'
    },
    {
      icon: '🔒',
      title: 'Secure & Reliable',
      description: '99.9% uptime with enterprise-grade security'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
      <div className="absolute top-0 right-0 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-0 left-1/2 w-72 h-72 bg-green-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      
      <div className="max-w-7xl mx-auto w-full relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Features */}
          <div className={`transition-all duration-1000 transform ${
            isVisible ? 'translate-x-0 opacity-100' : '-translate-x-10 opacity-0'
          }`}>
            <div className="text-center lg:text-left">
              <Link href="/">
                <div className="flex items-center space-x-3 cursor-pointer group mb-8 justify-center lg:justify-start">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <span className="text-white font-bold text-lg">BE</span>
                  </div>
                  <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                    BulkEmail
                  </span>
                </div>
              </Link>

              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Welcome <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">Back</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Login to your account and continue growing your business with powerful email marketing tools.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                {features.map((feature, index) => (
                  <div 
                    key={index}
                    className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-500 transform hover:-translate-y-2 border border-gray-100"
                  >
                    <div className="text-3xl mb-4">{feature.icon}</div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                ))}
              </div>

              {/* Quick Stats */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold mb-1">1M+</div>
                    <div className="text-blue-100 text-sm">Emails Sent Today</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold mb-1">99.9%</div>
                    <div className="text-blue-100 text-sm">Delivery Rate</div>
                  </div>
                </div>
              </div>

              {/* Demo Accounts */}
              <div className="mt-8 bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">
                  Quick Demo Access
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleDemoLogin('admin')}
                    disabled={isLoading}
                    className="bg-blue-50 hover:bg-blue-100 text-blue-700 py-2 px-3 rounded-lg font-medium text-sm transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Admin Demo
                  </button>
                  <button
                    onClick={() => handleDemoLogin('user')}
                    disabled={isLoading}
                    className="bg-purple-50 hover:bg-purple-100 text-purple-700 py-2 px-3 rounded-lg font-medium text-sm transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    User Demo
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Login Form */}
          <div className={`transition-all duration-1000 delay-300 transform ${
            isVisible ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0'
          }`}>
            <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-10 border border-gray-100">
              <div className="text-center mb-8">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  Login
                </h2>
                <p className="text-gray-600">
                  Access your email marketing dashboard
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 animate-shake">
                  <div className="flex items-center">
                    <div className="text-red-500 text-xl mr-3">⚠️</div>
                    <div className="text-red-800 font-medium">{error}</div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                    placeholder="your.email@company.com"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      name="password"
                      required
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 pr-12"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-300"
                    >
                      {showPassword ? <FaEye /> : <FaEyeSlash />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-600">Remember me</span>
                  </label>
                  
                  <Link href="/forgot-password">
                    <span className="text-sm text-blue-600 hover:text-blue-700 font-medium cursor-pointer transition-colors duration-300">
                      Forgot password?
                    </span>
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 ${
                    isLoading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-2xl text-white'
                  }`}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 border-t-2 border-white rounded-full animate-spin mr-3"></div>
                      Signing In...
                    </div>
                  ) : (
                    'Sign In'
                  )}
                </button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Or continue with</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => handleSocialLogin('google')}
                    disabled={isLoading}
                    className="w-full py-3 px-4 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span><FcGoogle /></span>
                    <span>Google</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSocialLogin('facebook')}
                    disabled={isLoading}
                    className="w-full py-3 px-4 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span><FaFacebook /></span>
                    <span>Facebook</span>
                  </button>
                </div>

                <div className="text-center">
                  <p className="text-gray-600">
                    Don't have an account?{' '}
                    <Link href="/register">
                      <span className="text-blue-600 hover:text-blue-700 font-semibold cursor-pointer transition-colors duration-300">
                        Sign up free
                      </span>
                    </Link>
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
};

export default LoginPage;