import React, { useEffect, useRef, useState } from 'react';
import { LayoutDashboard, User, Key, Settings, LogOut, Camera, Check } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { logout, editProfile, getUserProfile, uploadAvatar } from '../../features/auth/authSlice';
import Button from '../../components/ui/Button';
import { toast } from 'sonner';

const navigation = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard', disabled: true },
  { id: 'profile', label: 'Profile', icon: User, to: '/profile' },
  { id: 'stream-keys', label: 'Stream Keys', icon: Key, to: '/stream-keys', disabled: true },
  { id: 'settings', label: 'Settings', icon: Settings, to: '/settings', disabled: true },
];

export default function Profile() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const [fullName, setFullName] = useState(user?.fullName || user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatarUrl || null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarObjectUrl, setAvatarObjectUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    dispatch(getUserProfile());
  }, [dispatch]);

  useEffect(() => {
    setFullName(user?.fullName || user?.name || '');
    setPhone(user?.phone || '');
    setAddress(user?.address || '');
    setBio(user?.bio || '');
  }, [user?.fullName, user?.name, user?.phone, user?.address, user?.bio]);

  useEffect(() => {
    if (user?.avatarUrl) {
      setAvatarPreview(user.avatarUrl);
      // Clean up old object URL
      if (avatarObjectUrl) {
        URL.revokeObjectURL(avatarObjectUrl);
        setAvatarObjectUrl(null);
      }
    }
  }, [user?.avatarUrl]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const handleAvatarClick = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    if (avatarObjectUrl) {
      URL.revokeObjectURL(avatarObjectUrl);
    }

    setAvatarFile(file);
    setAvatarPreview(previewUrl);
    setAvatarObjectUrl(previewUrl);

    // Upload the file immediately
    try {
      await dispatch(uploadAvatar(file)).unwrap();
      toast.success('Avatar uploaded successfully');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to upload avatar');
    }
  };

  useEffect(() => {
    return () => {
      if (avatarObjectUrl) {
        URL.revokeObjectURL(avatarObjectUrl);
      }
    };
  }, [avatarObjectUrl]);

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!fullName.trim()) {
      toast.error('Full Name is required');
      return;
    }

    const payload: any = {
      fullName: fullName.trim(),
    };

    // Only include optional fields if they have values
    if (user?.avatarUrl) {
      payload.avatarUrl = user.avatarUrl;
    }
    if (phone.trim()) {
      payload.phone = phone.trim();
    }
    if (address.trim()) {
      payload.address = address.trim();
    }
    if (bio.trim()) {
      payload.bio = bio.trim();
    }

    setIsSaving(true);
    try {
      await dispatch(editProfile(payload)).unwrap();
      toast.success('Profile updated successfully');
    } catch (error: any) {
      toast.error(error?.message || 'Unable to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-6 px-6 py-8 max-w-[1500px] mx-auto">
        <aside className="rounded-[2rem] border border-slate-700/70 bg-slate-900/80 p-6 shadow-[0_0_70px_rgba(15,23,42,0.35)] backdrop-blur-xl">
          <div className="mb-8">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-14 h-14 rounded-3xl bg-gradient-to-r from-purple-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                  <span className="text-white text-2xl font-bold">S</span>
                </div>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-100">StreamHub</h2>
                <p className="text-xs text-slate-500 uppercase tracking-[0.18em]">Pro Dashboard</p>
              </div>
            </div>
          </div>

          <nav className="space-y-2 mb-8">
            {navigation.map((item) => {
              const Icon = item.icon;
              if (item.disabled) {
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 px-4 py-3 rounded-3xl text-slate-500 bg-slate-900/60 border border-slate-800 cursor-not-allowed"
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </div>
                );
              }

              return (
                <NavLink
                  key={item.id}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-3xl transition-all duration-300 ${
                      isActive
                        ? 'bg-gradient-to-r from-purple-600/20 to-cyan-600/20 border border-purple-500/30 text-purple-200 shadow-[0_0_18px_rgba(168,85,247,0.15)]'
                        : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-100'
                    }`
                  }
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-3xl text-red-400 border border-transparent hover:border-red-500/30 hover:bg-red-600/10 transition-all"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </aside>

        <main className="space-y-6">
          <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold text-slate-100">Edit Profile</h1>
              <p className="mt-2 text-slate-400">Manage your streaming identity</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/80 px-4 py-2 text-sm text-slate-300">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
              Pro Streamer
            </div>
          </header>

          <section className="rounded-[2rem] border border-slate-700/80 bg-slate-900/80 p-8 shadow-[0_0_120px_rgba(15,23,42,0.35)] backdrop-blur-xl">
            <form onSubmit={handleSave} className="space-y-8">
              <div className="flex flex-col items-center gap-6 text-center mb-10">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-600 via-fuchsia-500 to-cyan-500 blur-3xl opacity-60 animate-pulse" />
                <div
                  className="relative w-36 h-36 rounded-full overflow-hidden border-4 border-slate-900 bg-slate-950 shadow-[0_0_40px_rgba(168,85,247,0.2)] cursor-pointer"
                  onClick={handleAvatarClick}
                >
                  <img
                    src={
                      avatarPreview
                        ? `http://localhost:3000${avatarPreview}`
                        : '/default-avatar.png'
                    }
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-300 hover:opacity-100">
                    <Camera className="w-7 h-7 text-white" />
                  </div>
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                <div className="absolute right-0 bottom-0 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-cyan-500 border-4 border-slate-900 shadow-lg">
                  <Camera className="w-5 h-5 text-white" />
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-semibold text-slate-100">{user?.fullName || user?.name || 'Your Name'}</h2>
                <p className="text-sm text-slate-500">{user?.email || 'your@email.com'}</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-3xl px-5 py-4 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone number"
                  className="w-full bg-slate-800 border border-slate-700 rounded-3xl px-5 py-4 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Address</label>
                <textarea
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Address"
                  className="w-full bg-slate-800 border border-slate-700 rounded-3xl px-5 py-4 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20 transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Bio</label>
                <textarea
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell your audience about yourself"
                  className="w-full bg-slate-800 border border-slate-700 rounded-3xl px-5 py-4 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20 transition-all resize-none"
                />
              </div>
            </div>

            <div className="mt-10 flex justify-end">
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-gradient-to-r from-emerald-500 to-green-500 px-8 py-3 text-base font-semibold shadow-lg shadow-emerald-500/20 hover:shadow-[0_0_40px_rgba(16,185,129,0.35)] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span className="flex items-center gap-2">
                  {isSaving ? 'Saving...' : 'Save Changes'}
                  <Check className="w-4 h-4" />
                </span>
              </Button>
            </div>
          </form>
          </section>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            <div className="rounded-3xl border border-purple-500/10 bg-slate-900/70 p-6 text-center shadow-[0_0_30px_rgba(168,85,247,0.1)]">
              <p className="text-3xl font-semibold text-purple-300">12.5K</p>
              <p className="mt-2 text-sm text-slate-500">Followers</p>
            </div>
            <div className="rounded-3xl border border-cyan-500/10 bg-slate-900/70 p-6 text-center shadow-[0_0_30px_rgba(34,211,238,0.1)]">
              <p className="text-3xl font-semibold text-cyan-300">248</p>
              <p className="mt-2 text-sm text-slate-500">Streams</p>
            </div>
            <div className="rounded-3xl border border-emerald-500/10 bg-slate-900/70 p-6 text-center shadow-[0_0_30px_rgba(16,185,129,0.1)]">
              <p className="text-3xl font-semibold text-emerald-300">89%</p>
              <p className="mt-2 text-sm text-slate-500">Uptime</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
