"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogIn, LogOut, User, Home, PlusCircle, Beer, Settings } from "lucide-react"
import { auth } from "@/lib/api-client"
import { toast } from "@/components/ui/use-toast"

export function AppHeader() {
  const router = useRouter()
  const [user, setUser] = useState<{ username: string; email: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      if (auth.isAuthenticated()) {
        try {
          const userData = await auth.getCurrentUser()
          if (userData.success && userData.data) {
            setUser({
              username: userData.data.username,
              email: userData.data.email,
            })
          } else {
            setUser(null)
          }
        } catch (error) {
          console.error("Error fetching user data:", error)
          setUser(null)
        }
      } else {
        setUser(null)
      }
      
      setIsLoading(false)
    }
    
    checkAuth()
  }, [])

  const handleLogout = () => {
    auth.logout()
    setUser(null)
    toast({
      title: "Logged out",
      description: "You have been successfully logged out",
    })
    router.push("/")
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container flex h-16 items-center px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Beer className="h-6 w-6 text-purple-600" />
          <span className="font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600">Beer Distribution Game</span>
        </Link>
        <nav className="ml-auto flex gap-2 sm:gap-4">
          <Link href="/" className="text-sm font-medium hover:underline underline-offset-4">
            <Button variant="ghost" size="sm" className="gap-1">
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Home</span>
            </Button>
          </Link>
          <Link href="/create-game" className="text-sm font-medium hover:underline underline-offset-4">
            <Button variant="ghost" size="sm" className="gap-1">
              <PlusCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Create Game</span>
            </Button>
          </Link>
          <Link href="/join-game" className="text-sm font-medium hover:underline underline-offset-4">
            <Button variant="ghost" size="sm" className="gap-1">
              <Beer className="h-4 w-4" />
              <span className="hidden sm:inline">Join Game</span>
            </Button>
          </Link>
        </nav>
        
        <div className="ml-4 md:ml-6">
          {isLoading ? (
            <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse"></div>
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={`https://avatar.vercel.sh/${user.username}`} alt={user.username} />
                    <AvatarFallback>{getInitials(user.username)}</AvatarFallback>
                  </Avatar>
                  <span className="sr-only">User menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium">{user.username}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/account" className="cursor-pointer w-full">
                    <User className="mr-2 h-4 w-4" />
                    <span>Account</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="cursor-pointer w-full">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="cursor-pointer text-red-600 focus:text-red-600" 
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/auth/login" className="gap-1">
                <LogIn className="h-4 w-4" />
                <span>Login</span>
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
} 