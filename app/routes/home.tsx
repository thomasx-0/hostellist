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

  useEffect(() => {
    // Initialize Facebook SDK
    if (typeof window !== "undefined") {
      window.fbAsyncInit = function() {
        window.FB.init({
          appId: import.meta.env.VITE_FACEBOOK_APP_ID,
          cookie: true,
          xfbml: true,
          version: 'v18.0'
        });

        // Check if user is already logged in
        window.FB.getLoginStatus(function(response: any) {
          if (response.status === 'connected') {
            getUserInfo();
          }
        });
      };

      // Load Facebook SDK
      const script = document.createElement('script');
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      document.head.appendChild(script);
    }
  }, []);

  const getUserInfo = () => {
    window.FB.api('/me', { fields: 'name,email,picture' }, function(response: any) {
      setUser({
        id: response.id,
        name: response.name,
        email: response.email,
        picture: response.picture?.data?.url,
      });
    });
  };

  const signInWithFacebook = () => {
    window.FB.login(function(response: any) {
      if (response.authResponse) {
        getUserInfo();
      } else {
        console.log('User cancelled login or did not fully authorize.');
      }
    }, { scope: 'email' });
  };

  const signOut = () => {
    window.FB.logout(function(response: any) {
      setUser(null);
      setHostels([]);
      setMonthlyIncome("");
    });
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
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">HostelList</h1>
          <p className="text-gray-600 mb-6">
            Find affordable hostels in Mexico, Colombia, Brazil, Vietnam, and Thailand
          </p>
          <button
            onClick={signInWithFacebook}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Continue with Facebook
          </button>
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
              {user.picture && (
                <img 
                  src={user.picture} 
                  alt={user.name}
                  className="w-8 h-8 rounded-full"
                />
              )}
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
    FB: any;
    fbAsyncInit: () => void;
  }
}
