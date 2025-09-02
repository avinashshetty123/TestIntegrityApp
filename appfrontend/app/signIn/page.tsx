"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Apple, Mail, Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("isLoggedIn", "true");
    router.push("/");
  };

  return (
    <div className="min-h-screen w-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-gray-900 to-black text-white items-center justify-center p-12">
        <div className="text-center">
          <Apple size={64} className="mx-auto mb-6" />
          <h1 className="text-4xl font-bold mb-4">Welcome to TestIntegrityApp</h1>
          <p className="text-gray-300 text-lg max-w-md mx-auto">
            Secure exams, proctoring, and collaboration all in one platform.
          </p>
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="flex flex-1 items-center justify-center p-8 bg-gray-50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <Card className="rounded-2xl shadow-lg p-8 bg-white">
            <CardContent>
              {/* Header */}
              <div className="flex flex-col items-center mb-6">
                <Apple size={40} className="text-black" />
                <h1 className="text-2xl font-semibold mt-2">
                  {isSignUp ? "Create Account" : "Sign In"}
                </h1>
                <p className="text-gray-500 text-sm">
                  {isSignUp ? "Join us today." : "Welcome back!"}
                </p>
              </div>

              <form className="space-y-4" onSubmit={handleSubmit}>
                {/* Full Name (signup only) */}
                {isSignUp && (
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      type="text"
                      placeholder="Full Name"
                      className="pl-10 rounded-xl"
                    />
                  </div>
                )}

                {/* Email */}
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    type="email"
                    placeholder="Email Address"
                    className="pl-10 rounded-xl"
                  />
                </div>

                {/* Password */}
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    type="password"
                    placeholder="Password"
                    className="pl-10 rounded-xl"
                  />
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  className="w-full rounded-xl bg-black text-white hover:bg-gray-900 transition"
                >
                  {isSignUp ? "Create Account" : "Sign In"}
                </Button>
              </form>

              {/* Social Logins */}
              <div className="flex flex-col gap-3 mt-6">
                <Button
                  variant="outline"
                  className="w-full rounded-xl flex items-center justify-center gap-2"
                >
                  <Apple size={18} /> Continue with Apple
                </Button>
                <Button
                  variant="outline"
                  className="w-full rounded-xl flex items-center justify-center gap-2"
                >
                  <img
                    src="https://www.svgrepo.com/show/475656/google-color.svg"
                    alt="Google"
                    className="w-4 h-4"
                  />
                  Continue with Google
                </Button>
              </div>

              {/* Switch Sign In / Sign Up */}
              <p className="text-center text-sm text-gray-500 mt-4">
                {isSignUp ? "Already have an account?" : "Don’t have an account?"}{" "}
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-black font-medium hover:underline"
                >
                  {isSignUp ? "Sign In" : "Create One"}
                </button>
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
