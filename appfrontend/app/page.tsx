"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { 
  Calendar, 
  Clock, 
  FileText, 
  Settings, 
  LogOut, 
  Info, 
  Video,
  Users,
  FolderOpen,
  PlayCircle,
  ChevronLeft,
  ChevronRight
} from "lucide-react"

const menuItems = [
  { icon: Users, label: "Attend Meeting", color: "bg-blue-500" },
  { icon: Calendar, label: "Scheduler", color: "bg-green-500" },
  { icon: PlayCircle, label: "Records", color: "bg-purple-500" },
  { icon: FolderOpen, label: "Files", color: "bg-orange-500" },
  { icon: Settings, label: "Settings", color: "bg-gray-500" },
  { icon: FileText, label: "Reports", color: "bg-red-500" }
]

const slides = [
  {
    title: "About Us",
    content: "We provide seamless meeting solutions for modern teams",
    bg: "bg-gradient-to-r from-blue-600 to-purple-600"
  },
  {
    title: "Our Mission",
    content: "Connecting people through innovative video conferencing",
    bg: "bg-gradient-to-r from-green-600 to-blue-600"
  },
  {
    title: "Why Choose Us",
    content: "Reliable, secure, and user-friendly meeting platform",
    bg: "bg-gradient-to-r from-purple-600 to-pink-600"
  }
]

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const slideTimer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 4000)
    return () => clearInterval(slideTimer)
  }, [])

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length)
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Navbar */}
      <nav className="bg-white shadow-sm border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-slate-800">MeetApp</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Avatar>
              <AvatarImage src="/placeholder-user.jpg" />
              <AvatarFallback className="bg-blue-500 text-white">U</AvatarFallback>
            </Avatar>
            <span className="text-sm text-slate-600">John Doe</span>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Left Sidebar - Slider */}
        <div className="w-80 p-6">
          <div className="relative h-64 rounded-xl overflow-hidden shadow-lg">
            <div 
              className={`absolute inset-0 ${slides[currentSlide].bg} flex items-center justify-center text-white transition-all duration-500`}
            >
              <div className="text-center p-6">
                <h3 className="text-xl font-bold mb-2">{slides[currentSlide].title}</h3>
                <p className="text-sm opacity-90">{slides[currentSlide].content}</p>
              </div>
            </div>
            <button 
              onClick={prevSlide}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white p-1 rounded-full transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={nextSlide}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white p-1 rounded-full transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentSlide ? 'bg-white' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="mt-6 space-y-3">
            <Button variant="outline" className="w-full justify-start" size="sm">
              <Info className="w-4 h-4 mr-2" />
              About Us
            </Button>
            <Button variant="outline" className="w-full justify-start" size="sm">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
            <Button variant="outline" className="w-full justify-start" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          {/* Welcome Section */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-800 mb-2">Welcome Back!</h2>
            <p className="text-slate-600">Ready to start your next meeting?</p>
          </div>

          {/* Menu Grid */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            {menuItems.map((item, index) => {
              const Icon = item.icon
              return (
                <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer group">
                  <CardContent className="p-6 text-center">
                    <div className={`${item.color} w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="font-semibold text-slate-800">{item.label}</h3>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Start Meeting Button */}
          <div className="text-center">
            <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all">
              <Video className="w-6 h-6 mr-2" />
              Start Meeting
            </Button>
          </div>
        </div>

        {/* Right Sidebar - Time & Animations */}
        <div className="w-80 p-6">
          {/* Current Time */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-center">Current Time</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-3xl font-bold text-slate-800 mb-2">
                {currentTime.toLocaleTimeString()}
              </div>
              <div className="text-sm text-slate-600">
                {currentTime.toLocaleDateString()}
              </div>
              <div className="mt-4">
                <Badge variant="secondary" className="animate-pulse">
                  <Clock className="w-3 h-3 mr-1" />
                  Live
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Status Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-center">Status</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Active Users</span>
                  <Badge className="bg-green-500 animate-bounce">24</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Meetings Today</span>
                  <Badge className="bg-blue-500">12</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Server Status</span>
                  <Badge className="bg-green-500 animate-pulse">Online</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Animated Elements */}
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full animate-pulse"></div>
            <div className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
          </div>
        </div>
      </div>
    </div>
  )
}