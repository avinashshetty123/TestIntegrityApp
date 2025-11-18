"use client";

import { useState } from "react";

interface SettingsData {
  // Account
  fullName: string;
  email: string;
  phone: string;
  password: string;

  // Preferences
  theme: "light" | "dark" | "system";
  language: string;

  // Privacy
  twoFactorAuth: boolean;
  showEmailPublic: boolean;

  // Notifications
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData>({
    fullName: "Vedant Taware",
    email: "vedanttaware24@gmail.com",
    phone: "+91 9876543210",
    password: "",

    theme: "dark",
    language: "English",

    twoFactorAuth: true,
    showEmailPublic: false,

    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const target = e.target as HTMLInputElement | HTMLSelectElement;
    const { name, type, value } = target;
    setSettings((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Updated Settings:", settings);
    // 🔗 API call goes here
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-orange-100 to-white p-6 font-['Inter']">
      <div className="w-full max-w-4xl bg-white/60 backdrop-blur-3xl p-10 rounded-3xl shadow-2xl shadow-orange-200/50 border border-orange-200/50">
        <h2 className="text-4xl font-bold text-center bg-gradient-to-r from-orange-600 to-orange-700 bg-clip-text text-transparent drop-shadow-lg mb-2">
          Settings
        </h2>
        <p className="text-gray-600 text-center mb-8 font-medium">
          Manage your account, privacy, and preferences
        </p>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Account Section */}
          <section className="bg-white/40 backdrop-blur-xl rounded-2xl p-6 shadow-lg shadow-orange-100/30 border border-orange-200/30">
            <h3 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">👤 Account</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                name="fullName"
                value={settings.fullName}
                onChange={handleChange}
                placeholder="Full Name"
                className="px-4 py-3 rounded-xl bg-white/60 backdrop-blur-xl border border-orange-200/30 focus:border-orange-400 focus:ring-2 focus:ring-orange-200/50 outline-none transition-all duration-300 shadow-lg shadow-orange-100/20 text-gray-700 placeholder-gray-500"
              />
              <input
                type="email"
                name="email"
                value={settings.email}
                onChange={handleChange}
                placeholder="Email"
                className="px-4 py-3 rounded-xl bg-white/60 backdrop-blur-xl border border-orange-200/30 focus:border-orange-400 focus:ring-2 focus:ring-orange-200/50 outline-none transition-all duration-300 shadow-lg shadow-orange-100/20 text-gray-700 placeholder-gray-500"
              />
              <input
                type="text"
                name="phone"
                value={settings.phone}
                onChange={handleChange}
                placeholder="Phone Number"
                className="px-4 py-3 rounded-xl bg-white/60 backdrop-blur-xl border border-orange-200/30 focus:border-orange-400 focus:ring-2 focus:ring-orange-200/50 outline-none transition-all duration-300 shadow-lg shadow-orange-100/20 text-gray-700 placeholder-gray-500"
              />
              <input
                type="password"
                name="password"
                value={settings.password}
                onChange={handleChange}
                placeholder="New Password"
                className="px-4 py-3 rounded-xl bg-white/60 backdrop-blur-xl border border-orange-200/30 focus:border-orange-400 focus:ring-2 focus:ring-orange-200/50 outline-none transition-all duration-300 shadow-lg shadow-orange-100/20 text-gray-700 placeholder-gray-500"
              />
            </div>
          </section>

          {/* Preferences */}
          <section className="bg-white/40 backdrop-blur-xl rounded-2xl p-6 shadow-lg shadow-orange-100/30 border border-orange-200/30">
            <h3 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">⚙️ Preferences</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select
                name="theme"
                value={settings.theme}
                onChange={handleChange}
                className="px-4 py-3 rounded-xl bg-white/60 backdrop-blur-xl border border-orange-200/30 focus:border-orange-400 focus:ring-2 focus:ring-orange-200/50 outline-none transition-all duration-300 shadow-lg shadow-orange-100/20 text-gray-700"
              >
                <option value="light" className="text-gray-800">Light</option>
                <option value="dark" className="text-gray-800">Dark</option>
                <option value="system" className="text-gray-800">System</option>
              </select>

              <select
                name="language"
                value={settings.language}
                onChange={handleChange}
                className="px-4 py-3 rounded-xl bg-white/60 backdrop-blur-xl border border-orange-200/30 focus:border-orange-400 focus:ring-2 focus:ring-orange-200/50 outline-none transition-all duration-300 shadow-lg shadow-orange-100/20 text-gray-700"
              >
                <option value="English" className="text-gray-800">English</option>
                <option value="Hindi" className="text-gray-800">Hindi</option>
                <option value="Marathi" className="text-gray-800">Marathi</option>
              </select>
            </div>
          </section>

          {/* Privacy */}
          <section className="bg-white/40 backdrop-blur-xl rounded-2xl p-6 shadow-lg shadow-orange-100/30 border border-orange-200/30">
            <h3 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">🔒 Privacy</h3>
            <div className="flex flex-col gap-4">
              <label className="flex items-center gap-3 p-3 bg-white/40 backdrop-blur-xl rounded-xl border border-orange-200/20 hover:bg-white/60 transition-all duration-300 cursor-pointer">
                <input
                  type="checkbox"
                  name="twoFactorAuth"
                  checked={settings.twoFactorAuth}
                  onChange={handleChange}
                  className="accent-orange-500 w-4 h-4"
                />
                <span className="text-gray-700 font-medium">Enable Two-Factor Authentication</span>
              </label>
              <label className="flex items-center gap-3 p-3 bg-white/40 backdrop-blur-xl rounded-xl border border-orange-200/20 hover:bg-white/60 transition-all duration-300 cursor-pointer">
                <input
                  type="checkbox"
                  name="showEmailPublic"
                  checked={settings.showEmailPublic}
                  onChange={handleChange}
                  className="accent-orange-500 w-4 h-4"
                />
                <span className="text-gray-700 font-medium">Make Email Public</span>
              </label>
            </div>
          </section>

          {/* Notifications */}
          <section className="bg-white/40 backdrop-blur-xl rounded-2xl p-6 shadow-lg shadow-orange-100/30 border border-orange-200/30">
            <h3 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">🔔 Notifications</h3>
            <div className="flex flex-col gap-4">
              <label className="flex items-center gap-3 p-3 bg-white/40 backdrop-blur-xl rounded-xl border border-orange-200/20 hover:bg-white/60 transition-all duration-300 cursor-pointer">
                <input
                  type="checkbox"
                  name="emailNotifications"
                  checked={settings.emailNotifications}
                  onChange={handleChange}
                  className="accent-orange-500 w-4 h-4"
                />
                <span className="text-gray-700 font-medium">Email Notifications</span>
              </label>
              <label className="flex items-center gap-3 p-3 bg-white/40 backdrop-blur-xl rounded-xl border border-orange-200/20 hover:bg-white/60 transition-all duration-300 cursor-pointer">
                <input
                  type="checkbox"
                  name="smsNotifications"
                  checked={settings.smsNotifications}
                  onChange={handleChange}
                  className="accent-orange-500 w-4 h-4"
                />
                <span className="text-gray-700 font-medium">SMS Notifications</span>
              </label>
              <label className="flex items-center gap-3 p-3 bg-white/40 backdrop-blur-xl rounded-xl border border-orange-200/20 hover:bg-white/60 transition-all duration-300 cursor-pointer">
                <input
                  type="checkbox"
                  name="pushNotifications"
                  checked={settings.pushNotifications}
                  onChange={handleChange}
                  className="accent-orange-500 w-4 h-4"
                />
                <span className="text-gray-700 font-medium">Push Notifications</span>
              </label>
            </div>
          </section>

          {/* Save */}
          <button
            type="submit"
            className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-lg hover:scale-105 transition-all duration-300 shadow-xl shadow-orange-200/50"
          >
            Save Settings
          </button>
        </form>
      </div>
    </div>
  );
}
