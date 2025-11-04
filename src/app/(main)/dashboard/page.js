"use client";
import { getSession, signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [credits, setCredits] = useState({ freeCredits: 0, usedCredits: 0 });
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const session = await getSession();
        if (!session) {
          router.push('/');
          return;
        }

        // Fetch user profile (includes credits)
        const profileRes = await fetch('/api/user/profile');
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setUser(profileData);
          // Set credits from profile data to avoid duplicate API call
          setCredits({
            freeCredits: profileData.freeCredits || 0,
            usedCredits: profileData.usedCredits || 0,
          });
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">Welcome back, {user?.name}!</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-600">Free Credits</p>
                <p className="text-lg font-semibold text-green-600">{credits.freeCredits}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Used Credits</p>
                <p className="text-lg font-semibold text-gray-600">{credits.usedCredits}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* User Info Card */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">User Information</h3>
              <div className="mt-4 space-y-2">
                <div>
                  <label className="text-sm font-medium text-gray-500">Name</label>
                  <p className="text-sm text-gray-900">{user?.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-sm text-gray-900">{user?.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Age</label>
                  <p className="text-sm text-gray-900">{user?.age}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Credits Card */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Email Credits</h3>
              <div className="mt-4 space-y-4">
                <div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-500">Free Credits</span>
                    <span className="text-2xl font-bold text-green-600">{credits.freeCredits}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Emails you can send for free</p>
                </div>
                <div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-500">Used Credits</span>
                    <span className="text-2xl font-bold text-gray-600">{credits.usedCredits}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Emails you've already sent</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Quick Actions</h3>
              <div className="mt-4 space-y-3">
                <button
                  onClick={() => router.push('/send-email')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-md text-sm font-medium transition duration-200"
                >
                  Send Bulk Email
                </button>
                <button
                  onClick={() => router.push('/campaigns')}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-3 rounded-md text-sm font-medium transition duration-200"
                >
                  View Campaigns
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}