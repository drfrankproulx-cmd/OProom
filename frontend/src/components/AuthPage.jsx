import React, { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Checkbox } from './ui/checkbox';
import { toast } from 'sonner';
import { setToken, getWebAuthnEmail, getWebAuthnRegistered, setWebAuthnEmail, setWebAuthnRegistered } from '../utils/auth';
import { Activity, Calendar, Stethoscope, Fingerprint, Eye, KeyRound, Loader2 } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Utility functions for WebAuthn
const isWebAuthnAvailable = () => {
  return window.PublicKeyCredential !== undefined && 
         window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable;
};

const checkPlatformAuthenticator = async () => {
  if (!isWebAuthnAvailable()) return false;
  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
};

// Base64URL helpers
const base64URLToBuffer = (base64URL) => {
  const padding = '='.repeat((4 - base64URL.length % 4) % 4);
  const base64 = base64URL.replace(/-/g, '+').replace(/_/g, '/') + padding;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

const bufferToBase64URL = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

export const AuthPage = ({ onLogin }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [hasBiometricSupport, setHasBiometricSupport] = useState(false);
  const [savedEmail, setSavedEmail] = useState('');
  const [hasSavedBiometric, setHasSavedBiometric] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);

  // Check for platform authenticator support and saved credentials on mount
  useEffect(() => {
    const checkSupport = async () => {
      const supported = await checkPlatformAuthenticator();
      setHasBiometricSupport(supported);
      
      // Check for saved email with biometric
      const email = getWebAuthnEmail();
      const hasWebauthn = getWebAuthnRegistered();
      
      if (email && hasWebauthn) {
        setSavedEmail(email);
        setHasSavedBiometric(true);
      }
    };
    checkSupport();
  }, []);

  // Standard login handler
  const handleSubmit = async (e, isRegister) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.target);
    const data = {
      email: formData.get('email'),
      password: formData.get('password'),
    };

    if (isRegister) {
      data.full_name = formData.get('full_name');
      data.role = formData.get('role') || 'resident';
    }

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || 'Authentication failed');
      }

      // Store based on remember me preference
      if (rememberMe) {
        setToken(result.access_token);
        localStorage.setItem('user', JSON.stringify(result.user));
        setWebAuthnEmail(data.email);
      } else {
        sessionStorage.setItem('token', result.access_token);
        sessionStorage.setItem('user', JSON.stringify(result.user));
      }

      toast.success(isRegister ? 'Account created successfully!' : 'Welcome back!');
      
      // After successful login, prompt for biometric enrollment if supported
      if (!isRegister && hasBiometricSupport && !getWebAuthnRegistered()) {
        // Small delay before prompting
        setTimeout(() => {
          promptBiometricEnrollment(result.access_token, data.email);
        }, 1000);
      }
      
      onLogin(result.access_token, result.user);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Prompt user to enable biometric authentication
  const promptBiometricEnrollment = async (token, email) => {
    const shouldEnable = window.confirm(
      'Enable Face ID / Touch ID for faster sign-in?\n\nYou can sign in with just your face or fingerprint next time.'
    );
    
    if (shouldEnable) {
      await enrollBiometric(token, email);
    } else {
      // Don't ask again this session
      sessionStorage.setItem('webauthn_prompt_dismissed', 'true');
    }
  };

  // Enroll biometric credential
  const enrollBiometric = async (token, email) => {
    try {
      setBiometricLoading(true);
      
      // Get registration options from server
      const optionsRes = await fetch(`${API_URL}/api/auth/webauthn/register-options`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!optionsRes.ok) {
        throw new Error('Failed to get registration options');
      }

      const { options } = await optionsRes.json();
      const parsedOptions = JSON.parse(options);
      
      // Convert base64url strings to ArrayBuffers
      parsedOptions.challenge = base64URLToBuffer(parsedOptions.challenge);
      parsedOptions.user.id = base64URLToBuffer(parsedOptions.user.id);
      
      if (parsedOptions.excludeCredentials) {
        parsedOptions.excludeCredentials = parsedOptions.excludeCredentials.map(cred => ({
          ...cred,
          id: base64URLToBuffer(cred.id),
        }));
      }

      // Create credential (this triggers Face ID / Touch ID)
      const credential = await navigator.credentials.create({
        publicKey: parsedOptions,
      });

      // Prepare credential for server
      const credentialJSON = {
        id: credential.id,
        rawId: bufferToBase64URL(credential.rawId),
        type: credential.type,
        response: {
          clientDataJSON: bufferToBase64URL(credential.response.clientDataJSON),
          attestationObject: bufferToBase64URL(credential.response.attestationObject),
          transports: credential.response.getTransports ? credential.response.getTransports() : [],
        },
      };

      // Send to server
      const registerRes = await fetch(`${API_URL}/api/auth/webauthn/register`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ credential: JSON.stringify(credentialJSON) }),
      });

      if (!registerRes.ok) {
        const error = await registerRes.json();
        throw new Error(error.detail || 'Registration failed');
      }

      // Mark as registered
      setWebAuthnRegistered(true);
      setWebAuthnEmail(email);
      
      toast.success('Biometric authentication enabled!');
    } catch (error) {
      if (error.name !== 'NotAllowedError') {
        toast.error('Could not enable biometric authentication');
      }
    } finally {
      setBiometricLoading(false);
    }
  };

  // Sign in with biometrics
  const handleBiometricLogin = useCallback(async () => {
    if (!savedEmail) {
      toast.error('No saved credentials found');
      setShowPasswordForm(true);
      return;
    }

    try {
      setBiometricLoading(true);

      // Get authentication options
      const optionsRes = await fetch(`${API_URL}/api/auth/webauthn/login-options?email=${encodeURIComponent(savedEmail)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!optionsRes.ok) {
        const error = await optionsRes.json();
        throw new Error(error.detail || 'Failed to get authentication options');
      }

      const { options } = await optionsRes.json();
      const parsedOptions = JSON.parse(options);

      // Convert base64url strings to ArrayBuffers
      parsedOptions.challenge = base64URLToBuffer(parsedOptions.challenge);
      
      if (parsedOptions.allowCredentials) {
        parsedOptions.allowCredentials = parsedOptions.allowCredentials.map(cred => ({
          ...cred,
          id: base64URLToBuffer(cred.id),
        }));
      }

      // Get credential (this triggers Face ID / Touch ID)
      const credential = await navigator.credentials.get({
        publicKey: parsedOptions,
      });

      // Prepare credential for server
      const credentialJSON = {
        id: credential.id,
        rawId: bufferToBase64URL(credential.rawId),
        type: credential.type,
        response: {
          clientDataJSON: bufferToBase64URL(credential.response.clientDataJSON),
          authenticatorData: bufferToBase64URL(credential.response.authenticatorData),
          signature: bufferToBase64URL(credential.response.signature),
          userHandle: credential.response.userHandle 
            ? bufferToBase64URL(credential.response.userHandle) 
            : null,
        },
      };

      // Verify with server
      const loginRes = await fetch(`${API_URL}/api/auth/webauthn/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          credential: JSON.stringify(credentialJSON),
          email: savedEmail,
        }),
      });

      if (!loginRes.ok) {
        const error = await loginRes.json();
        throw new Error(error.detail || 'Authentication failed');
      }

      const result = await loginRes.json();

      // Store token
      setToken(result.access_token);
      localStorage.setItem('user', JSON.stringify(result.user));

      toast.success('Welcome back!');
      onLogin(result.access_token, result.user);
    } catch (error) {
      
      if (error.name === 'NotAllowedError') {
        // User cancelled or biometric failed
        toast.error('Authentication cancelled');
      } else {
        toast.error(error.message || 'Biometric authentication failed');
      }
      
      // Show password form as fallback
      setShowPasswordForm(true);
    } finally {
      setBiometricLoading(false);
    }
  }, [savedEmail, onLogin]);

  // Render biometric login view
  if (hasSavedBiometric && !showPasswordForm) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary-light to-primary-light p-4">
        <Card className="w-full max-w-md shadow-elegant border-border/50 backdrop-blur-sm bg-card/95">
          <CardHeader className="space-y-1 text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="p-3 bg-primary rounded-xl shadow-glow">
                <Stethoscope className="h-6 w-6 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
            <CardDescription className="text-base">
              {savedEmail}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Biometric Login Button */}
            <Button
              onClick={handleBiometricLogin}
              disabled={biometricLoading}
              className="w-full h-14 text-lg font-medium bg-primary hover:bg-primary/90 transition-all"
              data-testid="biometric-login-btn"
            >
              {biometricLoading ? (
                <>
                  <Loader2 className="h-6 w-6 mr-3 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Fingerprint className="h-6 w-6 mr-3" />
                  Sign in with Face ID
                </>
              )}
            </Button>

            {/* Fallback to password */}
            <div className="text-center pt-2">
              <button
                onClick={() => setShowPasswordForm(true)}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
                data-testid="use-password-link"
              >
                <KeyRound className="h-4 w-4 inline mr-1" />
                Use password instead
              </button>
            </div>

            {/* Different account */}
            <div className="text-center border-t pt-4 mt-4">
              <button
                onClick={() => {
                  setWebAuthnEmail('');
                  setWebAuthnRegistered(false);
                  setSavedEmail('');
                  setHasSavedBiometric(false);
                  setShowPasswordForm(true);
                }}
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                Sign in with a different account
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Standard login/register form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary-light to-primary-light p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Left side - Branding */}
        <div className="hidden lg:flex flex-col space-y-6 text-card-foreground">
          <div className="space-y-2">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-3 bg-primary rounded-xl shadow-glow">
                <Stethoscope className="h-8 w-8 text-primary-foreground" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                OR Scheduler
              </h1>
            </div>
            <h2 className="text-3xl font-semibold leading-tight text-foreground">
              Modern Surgical Scheduling Platform
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Streamline your operating room management with intelligent scheduling,
              patient tracking, and team collaboration tools.
            </p>
          </div>

          <div className="space-y-4 pt-8">
            <div className="flex items-start space-x-4">
              <div className="p-2 bg-card rounded-lg shadow-md">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Smart Calendar Management</h3>
                <p className="text-sm text-muted-foreground">
                  Weekly and monthly views with drag-and-drop scheduling
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="p-2 bg-card rounded-lg shadow-md">
                <Activity className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Real-time Task Tracking</h3>
                <p className="text-sm text-muted-foreground">
                  Monitor patient preparation and team assignments
                </p>
              </div>
            </div>
            {hasBiometricSupport && (
              <div className="flex items-start space-x-4">
                <div className="p-2 bg-card rounded-lg shadow-md">
                  <Fingerprint className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Biometric Sign-In</h3>
                  <p className="text-sm text-muted-foreground">
                    Quick access with Face ID or Touch ID
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right side - Auth Forms */}
        <Card className="shadow-elegant border-border/50 backdrop-blur-sm bg-card/95">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              {showPasswordForm && hasSavedBiometric ? 'Sign In' : 'Welcome'}
            </CardTitle>
            <CardDescription className="text-center">
              {showPasswordForm && hasSavedBiometric 
                ? 'Enter your password to continue'
                : 'Sign in to your account or create a new one'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Back to biometric option */}
            {showPasswordForm && hasSavedBiometric && hasBiometricSupport && (
              <div className="mb-4 pb-4 border-b">
                <Button
                  onClick={() => setShowPasswordForm(false)}
                  variant="outline"
                  className="w-full h-12"
                >
                  <Fingerprint className="h-5 w-5 mr-2" />
                  Use Face ID instead
                </Button>
              </div>
            )}

            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      name="email"
                      type="email"
                      placeholder="resident@hospital.com"
                      defaultValue={savedEmail}
                      required
                      className="transition-smooth h-11"
                      data-testid="login-email-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      name="password"
                      type="password"
                      required
                      className="transition-smooth h-11"
                      data-testid="login-password-input"
                    />
                  </div>
                  
                  {/* Remember Me Checkbox */}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember-me"
                      checked={rememberMe}
                      onCheckedChange={setRememberMe}
                      data-testid="remember-me-checkbox"
                    />
                    <Label 
                      htmlFor="remember-me" 
                      className="text-sm font-normal text-muted-foreground cursor-pointer"
                    >
                      Remember me on this device
                    </Label>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 transition-smooth hover:shadow-glow"
                    disabled={isLoading}
                    data-testid="login-submit-btn"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={(e) => handleSubmit(e, true)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-name">Full Name</Label>
                    <Input
                      id="register-name"
                      name="full_name"
                      placeholder="Dr. Jane Smith"
                      required
                      className="transition-smooth h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input
                      id="register-email"
                      name="email"
                      type="email"
                      placeholder="resident@hospital.com"
                      required
                      className="transition-smooth h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <Input
                      id="register-password"
                      name="password"
                      type="password"
                      required
                      className="transition-smooth h-11"
                    />
                  </div>
                  
                  {/* Remember Me for registration too */}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember-me-register"
                      checked={rememberMe}
                      onCheckedChange={setRememberMe}
                    />
                    <Label 
                      htmlFor="remember-me-register" 
                      className="text-sm font-normal text-muted-foreground cursor-pointer"
                    >
                      Remember me on this device
                    </Label>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 transition-smooth hover:shadow-glow"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthPage;
