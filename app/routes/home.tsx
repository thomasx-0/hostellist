import { useState, useEffect } from "react";
import type { Route } from "./+types/home";
import { searchHostels } from "~/services/hostelApi";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "HostelList - Find Affordable Hostels" },
    { name: "description", content: "Find hostels that fit your budget in Mexico, Colombia, Brazil, Vietnam, and Thailand" },
  ];
}

interface Hostel {
  id: string;
  name: string;
  location: string;
  country: string;
  price: number;
  rating: number;
  image: string;
  hostelworldUrl: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  picture?: string;
}

const COUNTRIES = ["Mexico", "Colombia", "Brazil", "Vietnam", "Thailand"];

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [monthlyIncome, setMonthlyIncome] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [selectedCountries, setSelectedCountries] = useState<string[]>(COUNTRIES);
  
  // Magic Link auth states
  const [email, setEmail] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);

  useEffect(() => {
    // Check if user is already logged in (from localStorage)
    const savedUser = localStorage.getItem('hostellist_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }

    // Check for magic link token in URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const userEmail = urlParams.get('email');
    
    if (token && userEmail) {
      // Verify token and log in user
      verifyMagicLink(token, userEmail);
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Load EmailJS
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
    script.onload = () => {
      if (window.emailjs) {
        window.emailjs.init(import.meta.env.VITE_EMAILJS_PUBLIC_KEY);
      }
    };
    document.head.appendChild(script);
  }, []);

  const generateToken = () => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  };

  const sendMagicLink = async () => {
    if (!email) return;
    
    setEmailLoading(true);
    const token = generateToken();
    const magicLink = `${window.location.origin}${window.location.pathname}?token=${token}&email=${encodeURIComponent(email)}`;
    
    // Store token temporarily (in production, use a backend)
    localStorage.setItem(`magic_token_${token}`, JSON.stringify({
      email,
      expires: Date.now() + 15 * 60 * 1000 // 15 minutes
    }));

    try {
      if (window.emailjs) {
        await window.emailjs.send(
          import.meta.env.VITE_EMAILJS_SERVICE_ID,
          import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
          {
            to_email: email,
            magic_link: magicLink,
            user_name: email.split('@')[0], // Use email prefix as name
          }
        );
        setMagicLinkSent(true);
      } else {
        // Fallback: Simple alert with magic link (for development)
        alert(`Development Mode - Your magic link:\n${magicLink}`);
        setMagicLinkSent(true);
      }
    } catch (error) {
      console.error('Error sending email:', error);
      // Fallback for development
      alert(`Development Mode - Your magic link:\n${magicLink}`);
      setMagicLinkSent(true);
    } finally {
      setEmailLoading(false);
    }
  };

  const verifyMagicLink = (token: string, userEmail: string) => {
    const tokenData = localStorage.getItem(`magic_token_${token}`);
    
    if (tokenData) {
      const { email: storedEmail, expires } = JSON.parse(tokenData);
      
      if (storedEmail === userEmail && Date.now() < expires) {
        // Valid token
        const newUser: User = {
          id: `user_${Date.now()}`,
          name: userEmail.split('@')[0],
          email: userEmail,
        };
        
        setUser(newUser);
        localStorage.setItem('hostellist_user', JSON.stringify(newUser));
        localStorage.removeItem(`magic_token_${token}`); // Clean up token
      } else {
        alert('Invalid or expired magic link');
      }
    } else {
      alert('Invalid magic link');
    }
  };

  const signOut = () => {
    setUser(null);
    setHostels([]);
    setMonthlyIncome("");
    setEmail("");
    setMagicLinkSent(false);
    localStorage.removeItem('hostellist_user');
  };

  const fetchHostels = async () => {
    if (!monthlyIncome || !user) return;

    setLoading(true);
    const income = parseFloat(monthlyIncome);
    const maxBudget = income * 0.65; // 65% of monthly income
    const maxDailyRate = Math.floor(maxBudget / 30); // Daily rate for 30-day stay

    try {
      const allHostels: Hostel[] = [];
      
      // Search hostels for each selected country
      for (const country of selectedCountries) {
        const countryHostels = await searchHostels({
          country,
          maxPrice: maxDailyRate,
        });
        allHostels.push(...countryHostels);
      }

      // Filter and sort results
      const affordableHostels = allHostels
        .filter(hostel => {
          const monthlyStay = hostel.price * 30;
          return monthlyStay <= maxBudget;
        })
        .sort((a, b) => b.rating - a.rating) // Sort by rating
        .slice(0, 50); // Limit to 50 results

      setHostels(affordableHostels);
    } catch (error) {
      console.error('Error fetching hostels:', error);
      setHostels([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleCountry = (country: string) => {
    setSelectedCountries(prev => 
      prev.includes(country) 
        ? prev.filter(c => c !== country)
        : [...prev, country]
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-4">HostelList</h1>
            <p className="text-gray-600 mb-6">
              Find affordable hostels in Mexico, Colombia, Brazil, Vietnam, and Thailand
            </p>
          </div>

          {!magicLinkSent ? (
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={emailLoading}
                />
              </div>
              <button
                onClick={sendMagicLink}
                disabled={!email || emailLoading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center justify-center gap-2"
              >
                {emailLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Send Magic Link
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="text-green-600 mb-4">
                <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800">Check your email!</h3>
              <p className="text-gray-600">
                We've sent a magic link to <strong>{email}</strong>. Click the link to sign in.
              </p>
              <button
                onClick={() => {
                  setMagicLinkSent(false);
                  setEmail("");
                }}
                className="text-blue-600 hover:text-blue-700 text-sm"
              >
                Use a different email
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold text-gray-800">HostelList</h1>
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm text-gray-600">Welcome, {user.name}</span>
              <button
                onClick={signOut}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Income Input */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Enter Your Monthly Income
          </h2>
          <div className="space-y-4">
            <div className="flex gap-4">
              <input
                type="number"
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(e.target.value)}
                placeholder="Monthly income in USD"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={fetchHostels}
                disabled={!monthlyIncome || loading || selectedCountries.length === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
              >
                {loading ? "Searching..." : "Find Hostels"}
              </button>
            </div>
            {monthlyIncome && (
              <p className="text-sm text-gray-600">
                Budget for 30-day stay: ${(parseFloat(monthlyIncome) * 0.65).toFixed(2)} 
                (Daily budget: ${((parseFloat(monthlyIncome) * 0.65) / 30).toFixed(2)})
              </p>
            )}
          </div>
        </div>

        {/* Country Selection */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Select Countries</h3>
          <div className="flex flex-wrap gap-3">
            {COUNTRIES.map((country) => (
              <button
                key={country}
                onClick={() => toggleCountry(country)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  selectedCountries.includes(country)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {country}
              </button>
            ))}
          </div>
        </div>

        {/* Hostels Grid */}
        {hostels.length > 0 && (
          <div>
            <h3 className="text-xl font-semibold text-gray-800 mb-6">
              Found {hostels.length} affordable hostels
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {hostels.map((hostel) => (
                <div key={hostel.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <img
                    src={hostel.image}
                    alt={hostel.name}
                    className="w-full h-48 object-cover"
                    onError={(e) => {
                      e.currentTarget.src = "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=300&h=200&fit=crop";
                    }}
                  />
                  <div className="p-4">
                    <h4 className="font-semibold text-gray-800 mb-1">{hostel.name}</h4>
                    <p className="text-sm text-gray-600 mb-2">
                      {hostel.location}, {hostel.country}
                    </p>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-lg font-bold text-green-600">
                        ${hostel.price}/night
                      </span>
                      <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        ⭐ {hostel.rating.toFixed(1)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">
                      30-day total: ${(hostel.price * 30).toLocaleString()}
                    </p>
                    <a
                      href={hostel.hostelworldUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 transition-colors text-center block"
                    >
                      Book on HostelWorld
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {hostels.length === 0 && monthlyIncome && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-600">
              No hostels found within your budget. Try increasing your monthly income or selecting different countries.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    emailjs: any;
  }
}
