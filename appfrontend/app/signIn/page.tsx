'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AuthCard() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <Card className="w-full max-w-sm overflow-hidden">
      <CardHeader>
        <AnimatePresence mode="wait">
          <motion.div
            key={isLogin ? 'login-header' : 'register-header'}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <CardTitle>
              {isLogin ? 'Login to your account' : 'Create an account'}
            </CardTitle>
            <CardDescription>
              {isLogin
                ? 'Enter your email below to login to your account'
                : 'Enter your information to create an account'}
            </CardDescription>
          </motion.div>
        </AnimatePresence>
        <CardAction>
          <Button 
            variant="link" 
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? 'Sign Up' : 'Sign In'}
          </Button>
        </CardAction>
      </CardHeader>

      <div className="relative h-[300px] overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={isLogin ? 'login' : 'register'}
            initial={{ x: isLogin ? 300 : -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: isLogin ? -300 : 300, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="absolute w-full px-6"
          >
            <CardContent>
              {isLogin ? <LoginForm /> : <RegisterForm />}
            </CardContent>
            <CardFooter className="flex-col gap-2 pb-4">
              {isLogin ? <LoginFooter /> : <RegisterFooter />}
            </CardFooter>
          </motion.div>
        </AnimatePresence>
      </div>
    </Card>
  );
}

function LoginForm() {
  return (
    <form>
      <div className="flex flex-col gap-6">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="m@example.com"
            required
          />
        </div>
        <div className="grid gap-2">
          <div className="flex items-center">
            <Label htmlFor="password">Password</Label>
            <a
              href="#"
              className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
            >
              Forgot your password?
            </a>
          </div>
          <Input id="password" type="password" required />
        </div>
      </div>
    </form>
  );
}

function RegisterForm() {
  return (
    <form>
      <div className="flex flex-col gap-6">
        <div className="grid gap-2">
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            type="text"
            placeholder="John Doe"
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="reg-email">Email</Label>
          <Input
            id="reg-email"
            type="email"
            placeholder="m@example.com"
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="reg-password">Password</Label>
          <Input id="reg-password" type="password" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="confirm-password">Confirm Password</Label>
          <Input id="confirm-password" type="password" required />
        </div>
      </div>
    </form>
  );
}

function LoginFooter() {
  return (
    <>
      <Button type="submit" className="w-full">
        Login
      </Button>
      <Button variant="outline" className="w-full">
        Login with Google
      </Button>
    </>
  );
}

function RegisterFooter() {
  return (
    <>
      <Button type="submit" className="w-full">
        Create Account
      </Button>
      <Button variant="outline" className="w-full">
        Sign up with Google
      </Button>
    </>
  );
}