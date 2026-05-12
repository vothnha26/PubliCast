import { LayoutDashboard, User, Key, Settings, LogOut, Camera, Zap } from 'lucide-react';
import { useState } from 'react';

export default function App() {
  const [activeMenu, setActiveMenu] = useState('profile');

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'stream-keys', label: 'Stream Keys', icon: Key },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen w-full flex bg-slate-950 relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute top-20 left-20 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />

      {/* Sidebar */}
      <aside className="w-72 h-screen sticky top-0 border-r border-slate-800/50 backdrop-blur-xl bg-slate-900/30 p-6 flex flex-col">
        {/* Logo/Brand */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-cyan-500 rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div className="absolute inset-0 blur-lg bg-purple-500/30 rounded-xl" />
            </div>
            <div>
              <h1 className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
                StreamHub
              </h1>
              <p className="text-xs text-slate-500">Pro Dashboard</p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeMenu === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveMenu(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-600/20 to-cyan-600/20 border border-purple-500/30 text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.2)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-600/10 hover:text-red-300 transition-all duration-300 border border-transparent hover:border-red-500/30">
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Top Header */}
        <header className="sticky top-0 z-40 backdrop-blur-xl bg-slate-900/40 border-b border-slate-800/50 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-slate-200 mb-1">Edit Profile</h2>
              <p className="text-sm text-slate-500">Manage your streaming identity</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-gradient-to-r from-purple-600/20 to-cyan-600/20 border border-purple-500/30 rounded-full backdrop-blur-xl">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
                  Pro Streamer
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Profile Content */}
        <div className="p-8">
          <div className="max-w-3xl mx-auto">
            {/* Profile Header with Avatar */}
            <div className="backdrop-blur-xl bg-slate-900/40 border border-purple-500/20 rounded-3xl p-8 mb-6 shadow-[0_0_50px_rgba(168,85,247,0.1)]">
              <div className="flex flex-col items-center mb-8">
                {/* Avatar with Glowing Ring */}
                <div className="relative group">
                  {/* Glowing Ring */}
                  <div className="absolute -inset-2 bg-gradient-to-r from-purple-600 via-pink-500 to-cyan-500 rounded-full blur-lg opacity-75 animate-pulse" />

                  {/* Avatar Container */}
                  <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-slate-900 shadow-[0_0_30px_rgba(168,85,247,0.3)]">
                    <img
                      src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop"
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />

                    {/* Camera Icon Overlay */}
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer">
                      <Camera className="w-8 h-8 text-white" />
                    </div>
                  </div>

                  {/* Edit Badge */}
                  <div className="absolute bottom-0 right-0 w-10 h-10 bg-gradient-to-r from-purple-600 to-cyan-500 rounded-full flex items-center justify-center border-4 border-slate-900 cursor-pointer hover:scale-110 transition-transform">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                </div>

                <h3 className="mt-6 text-slate-200">Alex "Streamer" Johnson</h3>
                <p className="text-sm text-slate-500">@alexstreams</p>
              </div>

              {/* Form Section */}
              <div className="space-y-5">
                {/* Full Name */}
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Full Name</label>
                  <input
                    type="text"
                    defaultValue="Alex Johnson"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    defaultValue="+1 (555) 123-4567"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                  />
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Address</label>
                  <textarea
                    rows={3}
                    defaultValue="123 Streaming Lane, Digital City, DC 12345"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all resize-none"
                  />
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Bio</label>
                  <textarea
                    rows={4}
                    placeholder="Tell your viewers about yourself..."
                    defaultValue="Professional streamer and content creator. Gaming enthusiast and tech reviewer. Streaming daily on multiple platforms."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all resize-none"
                  />
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end mt-8">
                <button className="px-8 py-3 bg-gradient-to-r from-emerald-600 via-green-500 to-emerald-600 text-white rounded-xl hover:shadow-[0_0_30px_rgba(16,185,129,0.6)] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2">
                  <span>Save Changes</span>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Additional Stats Card */}
            <div className="grid grid-cols-3 gap-4">
              <div className="backdrop-blur-xl bg-slate-900/40 border border-purple-500/20 rounded-2xl p-4 text-center">
                <div className="text-2xl text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-1">
                  12.5K
                </div>
                <div className="text-sm text-slate-500">Followers</div>
              </div>
              <div className="backdrop-blur-xl bg-slate-900/40 border border-cyan-500/20 rounded-2xl p-4 text-center">
                <div className="text-2xl text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 mb-1">
                  248
                </div>
                <div className="text-sm text-slate-500">Streams</div>
              </div>
              <div className="backdrop-blur-xl bg-slate-900/40 border border-emerald-500/20 rounded-2xl p-4 text-center">
                <div className="text-2xl text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-400 mb-1">
                  89%
                </div>
                <div className="text-sm text-slate-500">Uptime</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
