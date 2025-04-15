"use client"

import { useEffect, useState } from "react"
import { useGame, type Role } from "./game-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Pause, Play, Bot, Zap } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface GameAutoplayProps {
  enabled: boolean
  onToggle?: (enabled: boolean) => void
}

export function GameAutoplay({ enabled, onToggle }: GameAutoplayProps) {
  const { gameState, placeOrder, startGame, pauseGame } = useGame()
  const [isRunning, setIsRunning] = useState(false)
  const [autoplaySpeed, setAutoplaySpeed] = useState(1000) // ms between decisions
  const [botThinking, setBotThinking] = useState<Record<Role, boolean>>({
    Retailer: false,
    Wholesaler: false,
    Distributor: false,
    Factory: false,
  })

  // Bot strategies
  const strategies = {
    Retailer: "Responsive",
    Wholesaler: "Cautious",
    Distributor: "Balanced",
    Factory: "Aggressive",
  }

  useEffect(() => {
    if (!enabled || !isRunning) return

    // Start the game if it's not already playing
    if (!gameState.isPlaying) {
      startGame()
    }

    // Set up intervals for each bot to make decisions
    const retailerInterval = setInterval(() => makeBotDecision("Retailer"), autoplaySpeed)
    const wholesalerInterval = setInterval(() => makeBotDecision("Wholesaler"), autoplaySpeed * 1.2)
    const distributorInterval = setInterval(() => makeBotDecision("Distributor"), autoplaySpeed * 1.4)
    const factoryInterval = setInterval(() => makeBotDecision("Factory"), autoplaySpeed * 1.6)

    return () => {
      clearInterval(retailerInterval)
      clearInterval(wholesalerInterval)
      clearInterval(distributorInterval)
      clearInterval(factoryInterval)
    }
  }, [enabled, isRunning, gameState.isPlaying, autoplaySpeed])

  const makeBotDecision = (role: Role) => {
    if (!enabled || !isRunning) return

    // Set thinking state
    setBotThinking((prev) => ({ ...prev, [role]: true }))

    // Get current inventory and customer orders for the role
    const roleLower = role.toLowerCase() as keyof typeof gameState.inventory
    const currentInventory = gameState.inventory[roleLower][gameState.inventory[roleLower].length - 1] || 0
    const customerOrders = gameState.customerOrders[roleLower]
    const backorders = gameState.backorders[roleLower][gameState.backorders[roleLower].length - 1] || 0

    // Calculate order quantity based on strategy
    let orderQuantity = 0

    switch (strategies[role]) {
      case "Responsive":
        // Orders exactly what is needed plus a small buffer
        orderQuantity = customerOrders + Math.max(0, backorders) + Math.floor(Math.random() * 3)
        break
      case "Cautious":
        // Maintains higher inventory levels
        orderQuantity = Math.max(0, 12 - currentInventory) + customerOrders
        break
      case "Balanced":
        // Tries to maintain steady inventory
        orderQuantity = Math.max(0, 15 - currentInventory) + Math.floor(customerOrders * 1.1)
        break
      case "Aggressive":
        // Orders in larger batches
        orderQuantity = Math.max(0, 10 - currentInventory) + Math.floor(customerOrders * 1.5)
        break
      default:
        orderQuantity = customerOrders
    }

    // Add some randomness
    orderQuantity += Math.floor(Math.random() * 3) - 1

    // Ensure order quantity is positive
    orderQuantity = Math.max(0, orderQuantity)

    // Simulate thinking time
    setTimeout(
      () => {
        // Place the order
        placeOrder(role, orderQuantity)

        // Reset thinking state
        setBotThinking((prev) => ({ ...prev, [role]: false }))

        // Show toast notification
        toast({
          title: `${role} Bot Placed Order`,
          description: `Ordered ${orderQuantity} units using ${strategies[role]} strategy`,
          variant: "default",
        })
      },
      500 + Math.random() * 1000,
    ) // Random thinking time between 500ms and 1500ms
  }

  const toggleAutoplay = () => {
    const newState = !isRunning
    setIsRunning(newState)

    if (onToggle) {
      onToggle(newState)
    }

    if (newState) {
      startGame()
      toast({
        title: "Autoplay Started",
        description: "AI bots will now make decisions for all roles",
        variant: "default",
      })
    } else {
      pauseGame()
      toast({
        title: "Autoplay Paused",
        description: "AI bots have been paused",
        variant: "default",
      })
    }
  }

  if (!enabled) return null

  return (
    <Card className="border border-gray-200 bg-white shadow-sm mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center text-lg text-gray-800">
          <Bot className="w-5 h-5 mr-2 text-blue-600" />
          AI Autoplay
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Status:</span>
          <Badge
            variant="outline"
            className={
              isRunning ? "bg-green-100 text-green-600 border-green-300" : "bg-gray-100 text-gray-600 border-gray-300"
            }
          >
            {isRunning ? "Running" : "Paused"}
          </Badge>
        </div>

        <div className="space-y-3">
          {Object.entries(strategies).map(([role, strategy]) => (
            <div key={role} className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-600">
                  {role} Bot ({strategy})
                </span>
                {botThinking[role as Role] && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 animate-pulse">
                    <Zap className="w-3 h-3 mr-1" />
                    Thinking...
                  </Badge>
                )}
              </div>
              <Progress
                value={botThinking[role as Role] ? Math.random() * 100 : 100}
                className="h-1 bg-gray-100"
                indicatorClassName={`bg-gradient-to-r ${
                  role === "Retailer"
                    ? "from-green-500 to-green-400"
                    : role === "Wholesaler"
                      ? "from-blue-500 to-blue-400"
                      : role === "Distributor"
                        ? "from-purple-500 to-purple-400"
                        : "from-orange-500 to-orange-400"
                }`}
              />
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Speed:</span>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoplaySpeed(Math.min(2000, autoplaySpeed + 250))}
              className="h-7 px-2 border-gray-300 text-gray-600"
              disabled={autoplaySpeed >= 2000}
            >
              Slower
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoplaySpeed(Math.max(250, autoplaySpeed - 250))}
              className="h-7 px-2 border-gray-300 text-gray-600"
              disabled={autoplaySpeed <= 250}
            >
              Faster
            </Button>
          </div>
        </div>

        <Button
          onClick={toggleAutoplay}
          className={
            isRunning
              ? "w-full border-orange-300 text-orange-600 hover:bg-orange-50"
              : "w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
          }
          variant={isRunning ? "outline" : "default"}
        >
          {isRunning ? (
            <>
              <Pause className="w-4 h-4 mr-2" />
              Pause Autoplay
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Start Autoplay
            </>
          )}
        </Button>

        <div className="text-xs text-gray-500 italic">
          Each bot uses a different strategy to make decisions. Watch how the bullwhip effect develops over time!
        </div>
      </CardContent>
    </Card>
  )
}
