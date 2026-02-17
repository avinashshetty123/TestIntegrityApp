"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

  delete data.role;
  if (!isLogin && role === "student") {
    data.profilePic = profilePic;
    data.publicId = publicId;
  }

  const schema = isLogin
    ? loginSchema
    : role === "student"
    ? studentSchema
    : tutorSchema;

  const result = schema.safeParse(data);
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    result.error.issues.forEach(({ path, message }) => {
      fieldErrors[path[0] as string] = message;
    });
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
      : `http://localhost:4000/auth/register/${role}`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result.data),
      credentials: "include", // ✅ important: send/receive cookies
    });

    const responseData = await res.json();

    if (!res.ok) {
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
    
    toast.success(isLogin ? "Login successful! ✅" : "Registration successful! ✅", {
      description: `Welcome, ${responseData.role}!`,
    });

    router.push(responseData.role === "tutor" ? "/tutor" : "/student");
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
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-gradient-to-br from-orange-50 via-orange-100 to-white relative overflow-hidden font-['Inter']">
      {/* Floating Blobs */}
      <motion.div
        animate={{ x: [0, 80, 0], y: [0, -60, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-40 -left-40 w-[32rem] h-[32rem] bg-orange-400/20 rounded-full blur-[120px]"
      />
      <motion.div
        animate={{ x: [0, -100, 0], y: [0, 40, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-0 right-0 w-[36rem] h-[36rem] bg-orange-300/15 rounded-full blur-[120px]"
      />

      {/* Branding */}
      <div className="relative flex-1 flex items-center justify-center px-6 sm:px-12 py-16">
        <div className="relative z-10 text-center lg:text-left space-y-8 max-w-lg mb-1.5">
          <motion.h1
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            whileHover={{ scale: 1.05 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-extrabold bg-gradient-to-r from-orange-600 to-orange-700 bg-clip-text text-transparent drop-shadow-[0_10px_20px_rgba(249,115,22,0.3)]"
          >
            TestIntegrity
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="text-base sm:text-lg text-gray-700 max-w-md leading-relaxed font-medium"
          >
            Secure. Seamless. Smart. <br />
            AI-powered proctoring & collaboration that puts trust first.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.6 }}
            whileHover={{ scale: 1.1, rotate: 5 }}
            className="hidden lg:flex"
          >
            <img
              src="8912831.svg"
              alt="Illustration"
              className="w-80 h-auto drop-shadow-[0_20px_50px_rgba(249,115,22,0.4)] opacity-60"
            />
          </motion.div>
        </div>
      </div>

      {/* Auth */}
      <div className="relative flex-1 flex items-center justify-center px-4 sm:px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 60, rotateX: 15 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 1, type: "spring", stiffness: 100 }}
          whileHover={{ y: -5, scale: 1.02 }}
          className="w-full max-w-md perspective-1000"
        >
          <div className="rounded-3xl shadow-[0_20px_60px_-15px_rgba(249,115,22,0.4)] bg-white/70 backdrop-blur-3xl border border-orange-200/60 transform-gpu transition-all duration-500 hover:shadow-[0_30px_80px_-20px_rgba(249,115,22,0.5)]">
            <div className="p-8 sm:p-10">
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
                    <h2 className="text-3xl font-bold text-gray-800 text-center mb-8 drop-shadow-sm">
                      Login
                    </h2>
                    <form className="space-y-5" onSubmit={handleSubmit}>
                      <input
                        name="email"
                        placeholder="Email"
                        className="w-full px-4 py-3 bg-white/40 backdrop-blur-xl border border-orange-200/30 rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-200/50 outline-none transition-all duration-300 shadow-lg shadow-orange-100/20 text-gray-700 placeholder-gray-500"
                      />
                      {errors.email && (
                        <p className="text-red-500 text-sm font-medium">{errors.email}</p>
                      )}

                      <input
                        type="password"
                        name="password"
                        placeholder="Password"
                        className="w-full px-4 py-3 bg-white/40 backdrop-blur-xl border border-orange-200/30 rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-200/50 outline-none transition-all duration-300 shadow-lg shadow-orange-100/20 text-gray-700 placeholder-gray-500"
                      />
                      {errors.password && (
                        <p className="text-red-500 text-sm font-medium">
                          {errors.password}
                        </p>
                      )}

                      <motion.button
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                        type="submit"
                        className="w-full px-6 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold text-lg shadow-[0_10px_30px_-5px_rgba(249,115,22,0.5)] hover:shadow-[0_15px_40px_-5px_rgba(249,115,22,0.6)] transition-shadow duration-300"
                      >
                        Sign In
                      </motion.button>
                    </form>

                    {/* Google Sign-In */}
                    <motion.button
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 400, damping: 17 }}
                      onClick={handleGoogleSignIn}
                      className="w-full mt-4 px-6 py-4 bg-white/60 backdrop-blur-xl border border-orange-200/50 text-gray-800 rounded-xl font-semibold text-lg shadow-[0_8px_25px_-5px_rgba(249,115,22,0.3)] hover:shadow-[0_12px_35px_-5px_rgba(249,115,22,0.4)] hover:bg-white/80 transition-all duration-300"
                    >
                      Sign in with Google
                    </motion.button>
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
                    <h2 className="text-3xl font-bold text-gray-800 text-center mb-8 drop-shadow-sm">
                      Register
                    </h2>
                    <form className="space-y-5" onSubmit={handleSubmit}>
                      <input
                        name="fullName"
                        placeholder="Full Name"
                        className="w-full px-4 py-3 bg-white/40 backdrop-blur-xl border border-orange-200/30 rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-200/50 outline-none transition-all duration-300 shadow-lg shadow-orange-100/20 text-gray-700 placeholder-gray-500"
                      />
                      {errors.fullName && (
                        <p className="text-red-500 text-sm font-medium">
                          {errors.fullName}
                        </p>
                      )}

                      <input
                        name="email"
                        placeholder="Email"
                        className="w-full px-4 py-3 bg-white/40 backdrop-blur-xl border border-orange-200/30 rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-200/50 outline-none transition-all duration-300 shadow-lg shadow-orange-100/20 text-gray-700 placeholder-gray-500"
                      />
                      {errors.email && (
                        <p className="text-red-500 text-sm font-medium">{errors.email}</p>
                      )}

                      <input
                        type="password"
                        name="password"
                        placeholder="Password"
                        className="w-full px-4 py-3 bg-white/40 backdrop-blur-xl border border-orange-200/30 rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-200/50 outline-none transition-all duration-300 shadow-lg shadow-orange-100/20 text-gray-700 placeholder-gray-500"
                      />
                      {errors.password && (
                        <p className="text-red-500 text-sm font-medium">
                          {errors.password}
                        </p>
                      )}

                      {/* Role Dropdown */}
                      <select
                        name="role"
                        className="w-full px-4 py-3 bg-white/40 backdrop-blur-xl border border-orange-200/30 rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-200/50 outline-none transition-all duration-300 shadow-lg shadow-orange-100/20 text-gray-700"
                        value={role}
                        onChange={(e) =>
                          setRole(e.target.value as "student" | "tutor")
                        }
                      >
                        <option value="student" className="text-gray-800">
                          Student
                        </option>
                        <option value="tutor" className="text-gray-800">
                          Tutor
                        </option>
                      </select>

                      {/* Student Fields */}
                      {role === "student" && (
                        <div className="space-y-3">
                          <input
                            name="studentUid"
                            placeholder="Student UID"
                            className="w-full px-4 py-3 bg-white/40 backdrop-blur-xl border border-orange-200/30 rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-200/50 outline-none transition-all duration-300 shadow-lg shadow-orange-100/20 text-gray-700 placeholder-gray-500"
                          />
                          <input
                            name="rollNumber"
                            placeholder="Roll Number"
                            className="w-full px-4 py-3 bg-white/40 backdrop-blur-xl border border-orange-200/30 rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-200/50 outline-none transition-all duration-300 shadow-lg shadow-orange-100/20 text-gray-700 placeholder-gray-500"
                          />
                          <input
                            name="institutionName"
                            placeholder="Institution"
                            className="w-full px-4 py-3 bg-white/40 backdrop-blur-xl border border-orange-200/30 rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-200/50 outline-none transition-all duration-300 shadow-lg shadow-orange-100/20 text-gray-700 placeholder-gray-500"
                          />

                          {/* Cloudinary Upload */}
                          <div className="flex flex-col gap-2">
                            <label className="w-full flex flex-col items-center justify-center border-2 border-dashed border-orange-300/50 rounded-xl p-6 bg-white/20 backdrop-blur-xl text-gray-600 cursor-pointer hover:border-orange-400 hover:text-orange-600 hover:bg-white/30 transition-all duration-300 shadow-lg shadow-orange-100/20">
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleUpload}
                              />
                              {uploading ? (
                                <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
                              ) : profilePic ? (
                                <img
                                  src={profilePic}
                                  alt="Profile"
                                  className="w-24 h-24 rounded-full object-cover border-3 border-orange-400 shadow-lg shadow-orange-200/50"
                                />
                              ) : (
                                <>
                                  <Upload className="w-10 h-10 mb-2 text-orange-500" />
                                  <span className="text-sm font-medium">
                                    Click to upload profile photo
                                  </span>
                                </>
                              )}
                            </label>

                            {publicId && (
                              <p className="text-xs text-green-600 text-center font-medium">
                                Uploaded ✔
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Tutor Fields */}
                      {role === "tutor" && (
                        <div className="space-y-3">
                          <input
                            name="institutionName"
                            placeholder="Institution"
                            className="w-full px-4 py-3 bg-white/40 backdrop-blur-xl border border-orange-200/30 rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-200/50 outline-none transition-all duration-300 shadow-lg shadow-orange-100/20 text-gray-700 placeholder-gray-500"
                          />
                          <input
                            name="designation"
                            placeholder="Designation"
                            className="w-full px-4 py-3 bg-white/40 backdrop-blur-xl border border-orange-200/30 rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-200/50 outline-none transition-all duration-300 shadow-lg shadow-orange-100/20 text-gray-700 placeholder-gray-500"
                          />
                          <input
                            name="department"
                            placeholder="Department"
                            className="w-full px-4 py-3 bg-white/40 backdrop-blur-xl border border-orange-200/30 rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-200/50 outline-none transition-all duration-300 shadow-lg shadow-orange-100/20 text-gray-700 placeholder-gray-500"
                          />
                        </div>
                      )}

                      <motion.button
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                        type="submit"
                        className="w-full px-6 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold text-lg shadow-[0_10px_30px_-5px_rgba(249,115,22,0.5)] hover:shadow-[0_15px_40px_-5px_rgba(249,115,22,0.6)] transition-shadow duration-300"
                      >
                        Register
                      </motion.button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Toggle */}
              <p className="text-center text-sm text-gray-600 mt-8">
                {isLogin
                  ? "Don't have an account?"
                  : "Already have an account?"}{" "}
                <button
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-orange-600 font-semibold hover:text-orange-700 hover:underline transition-colors duration-300"
                >
                  {isLogin ? "Register" : "Login"}
                </button>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}