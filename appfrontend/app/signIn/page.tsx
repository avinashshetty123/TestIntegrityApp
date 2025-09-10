"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { ZodError } from "zod";
import { Upload, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import {jwtDecode} from "jwt-decode";

// --- Schemas ---
const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const studentSchema = z.object({
  fullName: z.string().min(3, "Full name is required"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  studentUid: z.string().min(1, "Student UID cannot be blank"),
  rollNumber: z.string().min(1, "Roll number is required"),
  institutionName: z.string().min(1, "Institution cannot be blank"),
  profilePic: z.string().url("Must be a valid URL"),
  publicId: z.string().min(1, "Public ID is required"),
 
});

const tutorSchema = z.object({
  fullName: z.string().min(3, "Full name is required"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  institutionName: z.string().min(1, "Institution cannot be blank"),
  designation: z.string().min(1, "Designation cannot be blank"),
  department: z.string().min(1, "Department cannot be blank"),

});

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<"student" | "tutor">("student");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [profilePic, setProfilePic] = useState("");
  const [publicId, setPublicId] = useState("");
  const router = useRouter();

  // 🔹 Handle Cloudinary Upload
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "TestIntegrityApp"); // replace with your preset
    formData.append("folder", "profile_pics");

    try {
      const res = await fetch(
        "https://api.cloudinary.com/v1_1/dizvgbpai/image/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await res.json();

      if (data.secure_url && data.public_id) {
        setProfilePic(data.secure_url);
        setPublicId(data.public_id);

        toast.success("Upload successful ✅", {
          description: "Your profile picture has been uploaded.",
        });
      } else {
        throw new Error("Upload failed");
      }
    } catch (err) {
      console.error("Upload failed", err);
      toast.error("Upload failed ❌", {
        description: "Please try again later.",
      });
    } finally {
      setUploading(false);
    }
  };

  // 🔹 Handle Submit

type JwtPayload = {
  sub: string;
  email: string;
  role: "student" | "tutor";
  exp: number;
};

const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const formData = new FormData(e.currentTarget);
  const data = Object.fromEntries(formData) as Record<string, string>;

  // Remove role from data if it exists
  delete data.role;

  // Add profile pic info only for student
  if (!isLogin && role === "student") {
    data.profilePic = profilePic;
    data.publicId = publicId;
  }

  // Choose Zod schema
  let schema;
  if (isLogin) schema = loginSchema;
  else if (role === "student") schema = studentSchema;
  else schema = tutorSchema;

  const result = schema.safeParse(data);

  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    result.error.issues.forEach(({ path, message }) => {
      fieldErrors[path[0] as string] = message;
    });
    console.log(result);
    setErrors(fieldErrors);
    toast.error("Validation failed ❌", {
      description: "Please correct the highlighted fields.",
    });
    return;
  }

  setErrors({});

  try {
    const endpoint = isLogin
      ? "http://localhost:4000/auth/login"
      : `http://localhost:4000/auth/register/${role}`; // dynamic endpoint

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result.data),
    });

    const responseData = await res.json();

    if (!res.ok) {
      // Handle structured backend errors
      if (responseData.errors) {
        responseData.errors.forEach((err: { field?: string; message: string }) => {
          if (err.field) {
            setErrors((prev) => ({ ...prev, [err.field!]: err.message }));
          }
          toast.error(err.message, { description: `Error in ${err.field ?? "form"}` });
        });
      } else if (responseData.message) {
        toast.error(responseData.message);
      } else {
        toast.error("Something went wrong ❌");
      }
      return;
    }

    // Success: save tokens & redirect
    const tokens = responseData; // backend returns { accessToken, refreshToken }
    const decoded = jwtDecode<JwtPayload>(tokens.accessToken);

    localStorage.setItem("accessToken", tokens.accessToken);
    localStorage.setItem("refreshToken", tokens.refreshToken);
    localStorage.setItem("role", decoded.role);

    router.push(decoded.role === "tutor" ? "/tutor" : "/student");
  } catch (err) {
    console.error("Auth error", err);
    toast.error("Authentication failed ❌", {
      description: "Server unreachable or invalid credentials.",
    });
  }
};



  // 🔹 Google Sign-in (placeholder - you can integrate NextAuth.js or Firebase)
  const handleGoogleSignIn = () => {
    window.location.href = "http://localhost:4000/auth/google"; // backend OAuth route
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-gradient-to-br from-gray-900 via-black to-gray-800 relative overflow-hidden">
      {/* Floating Blobs */}
      <motion.div
        animate={{ x: [0, 80, 0], y: [0, -60, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-40 -left-40 w-[32rem] h-[32rem] bg-purple-500/30 rounded-full blur-[120px]"
      />
      <motion.div
        animate={{ x: [0, -100, 0], y: [0, 40, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-0 right-0 w-[36rem] h-[36rem] bg-pink-500/20 rounded-full blur-[120px]"
      />

      {/* Branding */}
      <div className="relative flex-1 flex items-center justify-center text-white px-6 sm:px-12 py-16">
        <div className="relative z-10 text-center lg:text-left space-y-8 max-w-lg mb-1.5">
          <motion.h1
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="text-5xl  sm:text-6xl lg:text-7xl font-extrabold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"
          >
            TestIntegrity
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="text-base sm:text-lg text-gray-300 max-w-md leading-relaxed"
          >
            Secure. Seamless. Smart. <br />
            AI-powered proctoring & collaboration that puts trust first.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="hidden lg:flex"
          >
            <img
              src="8912831.svg"
              alt="Illustration"
              className="w-80 h-auto drop-shadow-2xl invert mix-blend-screen"
            />
          </motion.div>
        </div>
      </div>

      {/* Auth */}
      <div className="relative flex-1 flex items-center justify-center px-4 sm:px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="w-full max-w-md"
        >
          <Card className="rounded-3xl shadow-2xl bg-white/10 backdrop-blur-xl border border-white/20">
            <CardContent className="p-8 sm:p-10">
              <AnimatePresence mode="wait">
                {isLogin ? (
                  // 🔹 Login
                  <motion.div
                    key="login"
                    initial={{ opacity: 0, x: 60 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -60 }}
                    transition={{ duration: 0.6 }}
                  >
                    <h2 className="text-3xl font-bold text-white text-center mb-8">
                      Login
                    </h2>
                    <form className="space-y-5" onSubmit={handleSubmit}>
                      <Input
                        name="email"
                        placeholder="Email"
                        className="rounded-xl bg-white/20 border-none text-white placeholder-gray-300"
                      />
                      {errors.email && (
                        <p className="text-red-400 text-sm">{errors.email}</p>
                      )}

                      <Input
                        type="password"
                        name="password"
                        placeholder="Password"
                        className="rounded-xl bg-white/20 border-none text-white placeholder-gray-300"
                      />
                      {errors.password && (
                        <p className="text-red-400 text-sm">
                          {errors.password}
                        </p>
                      )}

                      <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl py-3 text-lg hover:opacity-90 transition"
                      >
                        Sign In
                      </Button>
                    </form>

                    {/* Google Sign-In */}
                    <Button
                      onClick={handleGoogleSignIn}
                      className="w-full mt-4 bg-white text-black rounded-xl py-3 text-lg hover:opacity-90 transition"
                    >
                      Sign in with Google
                    </Button>
                  </motion.div>
                ) : (
                  // 🔹 Register
                  <motion.div
                    key="register"
                    initial={{ opacity: 0, x: -60 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 60 }}
                    transition={{ duration: 0.6 }}
                  >
                    <h2 className="text-3xl font-bold text-white text-center mb-8">
                      Register
                    </h2>
                    <form className="space-y-5" onSubmit={handleSubmit}>
                      <Input
                        name="fullName"
                        placeholder="Full Name"
                        className="rounded-xl bg-white/20 border-none text-white placeholder-gray-300"
                      />
                      {errors.fullName && (
                        <p className="text-red-400 text-sm">
                          {errors.fullName}
                        </p>
                      )}

                      <Input
                        name="email"
                        placeholder="Email"
                        className="rounded-xl bg-white/20 border-none text-white placeholder-gray-300"
                      />
                      {errors.email && (
                        <p className="text-red-400 text-sm">{errors.email}</p>
                      )}

                      <Input
                        type="password"
                        name="password"
                        placeholder="Password"
                        className="rounded-xl bg-white/20 border-none text-white placeholder-gray-300"
                      />
                      {errors.password && (
                        <p className="text-red-400 text-sm">
                          {errors.password}
                        </p>
                      )}

                      {/* Role Dropdown */}
                      <select
                        name="role"
                        className="w-full rounded-xl p-3 bg-white/20 text-white placeholder-gray-300"
                        value={role}
                        onChange={(e) =>
                          setRole(e.target.value as "student" | "tutor")
                        }
                      >
                        <option value="student" className="text-black">
                          Student
                        </option>
                        <option value="tutor" className="text-black">
                          Tutor
                        </option>
                      </select>

                      {/* Student Fields */}
                      {role === "student" && (
                        <div className="space-y-3">
                          <Input
                            name="studentUid"
                            placeholder="Student UID"
                            className="rounded-xl bg-white/20 border-none text-white placeholder-gray-300"
                          />
                          <Input
                            name="rollNumber"
                            placeholder="Roll Number"
                            className="rounded-xl bg-white/20 border-none text-white placeholder-gray-300"
                          />
                          <Input
                            name="institutionName"
                            placeholder="Institution"
                            className="rounded-xl bg-white/20 border-none text-white placeholder-gray-300"
                          />

                          {/* Cloudinary Upload */}
                          <div className="flex flex-col gap-2">
                            <label className="w-full flex flex-col items-center justify-center border-2 border-dashed border-gray-500/50 rounded-xl p-6 text-gray-300 cursor-pointer hover:border-purple-400 hover:text-purple-400 transition">
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleUpload}
                              />
                              {uploading ? (
                                <Loader2 className="w-10 h-10 animate-spin text-purple-400" />
                              ) : profilePic ? (
                                <img
                                  src={profilePic}
                                  alt="Profile"
                                  className="w-24 h-24 rounded-full object-cover border-2 border-purple-400"
                                />
                              ) : (
                                <>
                                  <Upload className="w-10 h-10 mb-2 text-purple-400" />
                                  <span className="text-sm">
                                    Click to upload profile photo
                                  </span>
                                </>
                              )}
                            </label>

                            {publicId && (
                              <p className="text-xs text-gray-500 text-center">
                                Uploaded ✔
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Tutor Fields */}
                      {role === "tutor" && (
                        <div className="space-y-3">
                          <Input
                            name="institutionName"
                            placeholder="Institution"
                            className="rounded-xl bg-white/20 border-none text-white placeholder-gray-300"
                          />
                          <Input
                            name="designation"
                            placeholder="Designation"
                            className="rounded-xl bg-white/20 border-none text-white placeholder-gray-300"
                          />
                          <Input
                            name="department"
                            placeholder="Department"
                            className="rounded-xl bg-white/20 border-none text-white placeholder-gray-300"
                          />
                        </div>
                      )}

                      <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl py-3 text-lg hover:opacity-90 transition"
                      >
                        Register
                      </Button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Toggle */}
              <p className="text-center text-sm text-gray-300 mt-8">
                {isLogin
                  ? "Don’t have an account?"
                  : "Already have an account?"}{" "}
                <button
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-purple-400 font-medium hover:underline"
                >
                  {isLogin ? "Register" : "Login"}
                </button>
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
