"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { auth } from "@/lib/api-client"
import { Loader2 } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isDemoLoading, setIsDemoLoading] = useState(false)

  const loginWithDemoAccount = async () => {
    setIsDemoLoading(true)
    
    try {
      // First try to login with demo account
      const demoEmail = "demo@example.com"
      const demoPassword = "password123"
      const username = "demouser"
      
      let loginResult = await auth.login(demoEmail, demoPassword)
      
      // If login fails, try to register the demo account
      if (!loginResult.success) {
        try {
          // Try to register the demo account
          const registerResult = await auth.register(username, demoEmail, demoPassword)
          
          if (registerResult.success) {
            // Now try to login again
            loginResult = await auth.login(demoEmail, demoPassword)
          } else {
            toast({
              title: "Demo account error",
              description: registerResult.error || "Failed to create demo account",
              variant: "destructive",
            })
            setIsDemoLoading(false)
            return
          }
        } catch (error) {
          // If registration fails due to account already existing, proceed with login attempt
          loginResult = await auth.login(demoEmail, demoPassword)
        }
      }
      
      if (loginResult.success) {
        // Save token to localStorage
        if (loginResult.data && loginResult.data.token) {
          localStorage.setItem('bdg_token', loginResult.data.token)
        }
        
        toast({
          title: "Demo login successful",
          description: "You're now logged in with the demo account",
        })
        
        router.push("/")
      } else {
        toast({
          title: "Demo login failed",
          description: loginResult.error || "Could not login with demo account",
          variant: "destructive",
        })
        
        // Still set the form fields so user can try manually
        setEmail(demoEmail)
        setPassword(demoPassword)
      }
    } catch (error) {
      console.error("Demo login error:", error)
      toast({
        title: "Demo login failed",
        description: error instanceof Error ? error.message : "An error occurred during demo login",
        variant: "destructive",
      })
      
      // Still set the form fields so user can try manually
      setEmail("demo@example.com")
      setPassword("password123")
    } finally {
      setIsDemoLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      toast({
        title: "Missing information",
        description: "Please enter your email and password",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const result = await auth.login(email, password)
      
      if (result.success) {
        // Save token to localStorage
        if (result.data && result.data.token) {
          localStorage.setItem('bdg_token', result.data.token);
        }
        
        toast({
          title: "Login successful",
          description: "Welcome back!",
        })
        router.push("/")
      } else {
        toast({
          title: "Login failed",
          description: result.error || "Invalid email or password",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Login error:", error)
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "An error occurred during login",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white py-12 px-4">
      <Card className="w-full max-w-md shadow-lg border-gray-200">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600">
            Sign In
          </CardTitle>
          <CardDescription className="text-center">
            Enter your email and password to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="your.email@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="/auth/forgot-password" className="text-xs text-blue-600 hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : "Sign In"}
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">Or</span>
              </div>
            </div>
            
            <Button 
              type="button" 
              variant="outline" 
              className="w-full border-gray-300 hover:bg-gray-50"
              onClick={loginWithDemoAccount}
              disabled={isDemoLoading}
            >
              {isDemoLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up demo account...
                </>
              ) : "Use Demo Account"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <div className="text-sm text-gray-600">
            Don't have an account?{" "}
            <Link href="/auth/register" className="text-blue-600 hover:underline">
              Sign up
            </Link>
          </div>
        </CardFooter>
      </Card>
    </main>
  )
} 