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
    <div
      className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${
        settings.theme === "light"
          ? "bg-gradient-to-r from-gray-100 via-gray-200 to-gray-300 text-black"
          : "bg-gradient-to-r from-purple-900 via-black to-gray-900 text-white"
      } p-6 font-poppins`}
    >
      <div className="w-full max-w-4xl bg-black/40 dark:bg-black/50 backdrop-blur-md p-10 rounded-2xl shadow-2xl border border-white/10">
        <h2 className="text-3xl font-bold text-center bg-gradient-to-r from-pink-500 to-purple-400 bg-clip-text text-transparent">
          Settings
        </h2>
        <p className="text-gray-400 text-center mb-6">
          Manage your account, privacy, and preferences
        </p>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Account Section */}
          <section>
            <h3 className="text-xl font-semibold mb-3">👤 Account</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                name="fullName"
                value={settings.fullName}
                onChange={handleChange}
                placeholder="Full Name"
                className="px-4 py-2 rounded-lg bg-white/10 focus:bg-white/20 outline-none"
              />
              <input
                type="email"
                name="email"
                value={settings.email}
                onChange={handleChange}
                placeholder="Email"
                className="px-4 py-2 rounded-lg bg-white/10 focus:bg-white/20 outline-none"
              />
              <input
                type="text"
                name="phone"
                value={settings.phone}
                onChange={handleChange}
                placeholder="Phone Number"
                className="px-4 py-2 rounded-lg bg-white/10 focus:bg-white/20 outline-none"
              />
              <input
                type="password"
                name="password"
                value={settings.password}
                onChange={handleChange}
                placeholder="New Password"
                className="px-4 py-2 rounded-lg bg-white/10 focus:bg-white/20 outline-none"
              />
            </div>
          </section>

          {/* Preferences */}
          <section>
            <h3 className="text-xl font-semibold mb-3">⚙️ Preferences</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select
                name="theme"
                value={settings.theme}
                onChange={handleChange}
                className="px-4 py-2 rounded-lg bg-white/10 focus:bg-white/20 outline-none"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </select>

              <select
                name="language"
                value={settings.language}
                onChange={handleChange}
                className="px-4 py-2 rounded-lg bg-white/10 focus:bg-white/20 outline-none"
              >
                <option value="English">English</option>
                <option value="Hindi">Hindi</option>
                <option value="Marathi">Marathi</option>
              </select>
            </div>
          </section>

          {/* Privacy */}
          <section>
            <h3 className="text-xl font-semibold mb-3">🔒 Privacy</h3>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="twoFactorAuth"
                  checked={settings.twoFactorAuth}
                  onChange={handleChange}
                  className="accent-pink-500"
                />
                Enable Two-Factor Authentication
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="showEmailPublic"
                  checked={settings.showEmailPublic}
                  onChange={handleChange}
                  className="accent-pink-500"
                />
                Make Email Public
              </label>
            </div>
          </section>

          {/* Notifications */}
          <section>
            <h3 className="text-xl font-semibold mb-3">🔔 Notifications</h3>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="emailNotifications"
                  checked={settings.emailNotifications}
                  onChange={handleChange}
                  className="accent-pink-500"
                />
                Email Notifications
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="smsNotifications"
                  checked={settings.smsNotifications}
                  onChange={handleChange}
                  className="accent-pink-500"
                />
                SMS Notifications
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="pushNotifications"
                  checked={settings.pushNotifications}
                  onChange={handleChange}
                  className="accent-pink-500"
                />
                Push Notifications
              </label>
            </div>
          </section>

          {/* Save */}
          <button
            type="submit"
            className="w-full py-3 rounded-lg bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 transition font-semibold shadow-lg"
          >
            Save Settings
          </button>
        </form>
      </div>
    </div>
  );
}
