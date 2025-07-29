import { useState, useEffect } from "react";
import type { Route } from "./+types/home";

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
  monthlyIncome: number;
}

const COUNTRIES = ["Mexico", "Colombia", "Brazil", "Vietnam", "Thailand"];

const MOCK_HOSTELS: Hostel[] = [
  {
    id: "1",
    name: "Casa Hostel",
    location: "Mexico City",
    country: "Mexico",
    price: 450,
    rating: 8.5,
    image: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=300&h=200&fit=crop",
    hostelworldUrl: "https://www.hostelworld.com/hostel/123456"
  },
  {
    id: "2",
    name: "Dragonfly Hostel",
    location: "Ho Chi Minh City",
    country: "Vietnam",
    price: 320,
    rating: 9.1,
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=300&h=200&fit=crop",
    hostelworldUrl: "https://www.hostelworld.com/hostel/234567"
  },
  {
    id: "3",
    name: "Copacabana Backpackers",
    location: "Rio de Janeiro",
    country: "Brazil",
    price: 380,
    rating: 8.2,
    image: "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=300&h=200&fit=crop",
    hostelworldUrl: "https://www.hostelworld.com/hostel/345678"
  }
];

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [monthlyIncome, setMonthlyIncome] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Initialize Google Sign-In
    if (typeof window !== "undefined" && window.google) {
      window.google.accounts.id.initialize({
        client_id: process.env.GOOGLE_CLIENT_ID || "your-google-client-id",
        callback: handleGoogleResponse,
      });
    }
  }, []);

  const handleGoogleResponse = (response: any) => {
    // Decode JWT token (in production, verify on server)
    const payload = JSON.parse(atob(response.credential.split('.')[1]));
    setUser({
      id: payload.sub,
      name: payload.name,
      email: payload.email,
      monthlyIncome: 0
    });
  };

  const signInWithGoogle = () => {
    if (window.google) {
      window.google.accounts.id.prompt();
    }
  };

  const signOut = () => {
    setUser(null);
    setHostels([]);
    setMonthlyIncome("");
  };

  const fetchHostels = async () => {
    if (!monthlyIncome || !user) return;

    setLoading(true);
    const income = parseFloat(monthlyIncome);
    const maxBudget = income * 0.65; // 65% of monthly income

    // Filter hostels based on budget (30 days * daily rate)
    const affordableHostels = MOCK_HOSTELS.filter(hostel => {
      const monthlyStay = hostel.price * 30;
      return monthlyStay <= maxBudget;
    });

    setHostels(affordableHostels);
    setLoading(false);
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
            onClick={signInWithGoogle}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Sign in with Google
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
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Enter Your Monthly Income
          </h2>
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
              disabled={!monthlyIncome || loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              {loading ? "Loading..." : "Find Hostels"}
            </button>
          </div>
          {monthlyIncome && (
            <p className="text-sm text-gray-600 mt-2">
              Budget for 30-day stay: ${(parseFloat(monthlyIncome) * 0.65).toFixed(2)}
            </p>
          )}
        </div>

        {/* Hostels Grid */}
        {hostels.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hostels.map((hostel) => (
              <div key={hostel.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <img
                  src={hostel.image}
                  alt={hostel.name}
                  className="w-full h-48 object-cover"
                />
                <div className="p-4">
                  <h3 className="font-semibold text-gray-800 mb-1">{hostel.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {hostel.location}, {hostel.country}
                  </p>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-lg font-bold text-green-600">
                      ${hostel.price}/night
                    </span>
                    <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      ⭐ {hostel.rating}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">
                    30-day total: ${hostel.price * 30}
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
        )}

        {hostels.length === 0 && monthlyIncome && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-600">
              No hostels found within your budget. Try increasing your monthly income or check back later.
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
    google: any;
  }
}
