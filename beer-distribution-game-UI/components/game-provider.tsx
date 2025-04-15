"use client"

import React from "react"
import { createContext, useContext, useState, useEffect, type ReactNode, useCallback } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { toast } from "@/components/ui/use-toast"
import { games, orders } from "@/lib/api-client"
import { useWebSocket, WebSocketEvent } from "@/hooks/useWebSocket"

export type Role = "Retailer" | "Wholesaler" | "Distributor" | "Factory"
export type DemandPattern = "Constant" | "StepIncrease" | "Random"

export interface GameState {
  currentWeek: number
  isPlaying: boolean
  numberOfStakeholders: number
  orderDelayPeriod: number
  shippingDelayPeriod: number
  selectedRole: Role
  demandPattern: DemandPattern
  showFullSupplyChain: boolean
  customerDemand: number[]
  inventory: {
    retailer: number[]
    wholesaler: number[]
    distributor: number[]
    factory: number[]
  }
  backorders: {
    retailer: number[]
    wholesaler: number[]
    distributor: number[]
    factory: number[]
  }
  costs: {
    retailer: number[]
    wholesaler: number[]
    distributor: number[]
    factory: number[]
  }
  incomingDelivery: {
    retailer: number
    wholesaler: number
    distributor: number
    factory: number
  }
  outgoingTransport: {
    retailer: number
    wholesaler: number
    distributor: number
    factory: number
  }
  customerOrders: {
    retailer: number
    wholesaler: number
    distributor: number
    factory: number
  }
  pendingOrders: {
    retailer: number[][]
    wholesaler: number[][]
    distributor: number[][]
    factory: number[][]
  }
  pendingShipments: {
    retailer: number[][]
    wholesaler: number[][]
    distributor: number[][]
    factory: number[][]
  }
  inventoryChanges: {
    retailer: number
    wholesaler: number
    distributor: number
    factory: number
  }
}

interface GameContextType {
  gameState: GameState
  gameId: string | null
  loading: boolean
  error: string | null
  setNumberOfStakeholders: (value: number) => void
  setOrderDelayPeriod: (value: number) => void
  setShippingDelayPeriod: (value: number) => void
  setSelectedRole: (role: Role) => void
  setDemandPattern: (pattern: DemandPattern) => void
  setShowFullSupplyChain: (value: boolean) => void
  startGame: () => Promise<void>
  pauseGame: () => Promise<void>
  resetGame: () => Promise<void>
  placeOrder: (role: Role, quantity: number) => Promise<void>
  animateInventoryChange: (role: Role, change: number) => void
  advanceWeek: () => Promise<void>
}

const initialGameState: GameState = {
  currentWeek: 0,
  isPlaying: false,
  numberOfStakeholders: 4,
  orderDelayPeriod: 1,
  shippingDelayPeriod: 1,
  selectedRole: "Distributor",
  demandPattern: "Constant",
  showFullSupplyChain: false,
  customerDemand: [4],
  inventory: {
    retailer: [18],
    wholesaler: [18],
    distributor: [18],
    factory: [18],
  },
  backorders: {
    retailer: [0],
    wholesaler: [0],
    distributor: [0],
    factory: [0],
  },
  costs: {
    retailer: [0],
    wholesaler: [0],
    distributor: [0],
    factory: [0],
  },
  incomingDelivery: {
    retailer: 0,
    wholesaler: 0,
    distributor: 0,
    factory: 0,
  },
  outgoingTransport: {
    retailer: 0,
    wholesaler: 0,
    distributor: 0,
    factory: 0,
  },
  customerOrders: {
    retailer: 4,
    wholesaler: 4,
    distributor: 4,
    factory: 4,
  },
  pendingOrders: {
    retailer: [],
    wholesaler: [],
    distributor: [],
    factory: [],
  },
  pendingShipments: {
    retailer: [],
    wholesaler: [],
    distributor: [],
    factory: [],
  },
  inventoryChanges: {
    retailer: 0,
    wholesaler: 0,
    distributor: 0,
    factory: 0,
  },
}

const GameContext = createContext<GameContextType | undefined>(undefined)

export function GameProvider({ children }: { children: ReactNode }) {
  const [gameState, setGameState] = useState<GameState>(initialGameState)
  const [gameId, setGameId] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const params = useParams()
  const searchParams = useSearchParams()
  
  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((event: WebSocketEvent) => {
    switch (event.type) {
      case 'gameStateUpdated':
        setGameState(event.data.gameState)
        break
      case 'weekAdvanced':
        setGameState(event.data.gameState)
        toast({
          title: "Week Advanced",
          description: `Advanced to Week ${event.data.gameState.currentWeek}`,
        })
        break
      case 'orderPlaced':
        toast({
          title: "Order Placed",
          description: `${event.data.senderRole} placed an order for ${event.data.quantity} units to ${event.data.recipientRole}`,
        })
        break
      case 'playerJoined':
        toast({
          title: "Player Joined",
          description: `${event.data.username} joined as ${event.data.role}`,
        })
        break
      case 'notification':
        toast({
          title: event.data.title || "Notification",
          description: event.data.message,
          variant: event.data.type === 'error' ? 'destructive' : 'default',
        })
        break
    }
  }, [])
  
  // Connect to WebSocket
  const { connected: wsConnected } = useWebSocket(gameId, {
    onMessage: handleWebSocketMessage
  })

  // Get game ID from URL parameters if available
  useEffect(() => {
    const id = params?.gameId || searchParams?.get('gameId')
    if (id && typeof id === 'string') {
      setGameId(id)
    }
  }, [params, searchParams])

  // Load game data when game ID changes
  useEffect(() => {
    if (gameId) {
      loadGameState()
    }
  }, [gameId])

  // Load game state from the API
  const loadGameState = async () => {
    if (!gameId) return

    setLoading(true)
    setError(null)

    try {
      const result = await games.getById(gameId)
      if (result.success) {
        // Map API game state to our UI game state structure
        const apiGameState = result.data.currentState
        
        // Transform API game state to match our UI state structure
        setGameState(prevState => ({
          ...prevState,
          currentWeek: apiGameState.week,
          isPlaying: result.data.status === 'active',
          orderDelayPeriod: result.data.configuration.orderDelayPeriod || prevState.orderDelayPeriod,
          shippingDelayPeriod: result.data.configuration.shippingDelayPeriod || prevState.shippingDelayPeriod,
          demandPattern: result.data.configuration.demandPattern,
          // Map other properties as needed
          customerDemand: apiGameState.customerDemand || prevState.customerDemand,
          inventory: {
            retailer: apiGameState.playerStates.retailer.inventoryHistory || prevState.inventory.retailer,
            wholesaler: apiGameState.playerStates.wholesaler.inventoryHistory || prevState.inventory.wholesaler,
            distributor: apiGameState.playerStates.distributor.inventoryHistory || prevState.inventory.distributor,
            factory: apiGameState.playerStates.factory.inventoryHistory || prevState.inventory.factory,
          },
          backorders: {
            retailer: apiGameState.playerStates.retailer.backlogHistory || prevState.backorders.retailer,
            wholesaler: apiGameState.playerStates.wholesaler.backlogHistory || prevState.backorders.wholesaler,
            distributor: apiGameState.playerStates.distributor.backlogHistory || prevState.backorders.distributor,
            factory: apiGameState.playerStates.factory.backlogHistory || prevState.backorders.factory,
          },
          costs: {
            retailer: apiGameState.playerStates.retailer.costHistory || prevState.costs.retailer,
            wholesaler: apiGameState.playerStates.wholesaler.costHistory || prevState.costs.wholesaler,
            distributor: apiGameState.playerStates.distributor.costHistory || prevState.costs.distributor,
            factory: apiGameState.playerStates.factory.costHistory || prevState.costs.factory,
          },
          // Current values
          incomingDelivery: {
            retailer: apiGameState.playerStates.retailer.incomingOrders || 0,
            wholesaler: apiGameState.playerStates.wholesaler.incomingOrders || 0,
            distributor: apiGameState.playerStates.distributor.incomingOrders || 0,
            factory: apiGameState.playerStates.factory.incomingOrders || 0,
          },
          outgoingTransport: {
            retailer: apiGameState.playerStates.retailer.outgoingOrders || 0,
            wholesaler: apiGameState.playerStates.wholesaler.outgoingOrders || 0,
            distributor: apiGameState.playerStates.distributor.outgoingOrders || 0,
            factory: apiGameState.playerStates.factory.outgoingOrders || 0,
          },
          // Current customer orders
          customerOrders: {
            retailer: apiGameState.playerStates.retailer.incomingOrders || prevState.customerOrders.retailer,
            wholesaler: apiGameState.playerStates.wholesaler.incomingOrders || prevState.customerOrders.wholesaler,
            distributor: apiGameState.playerStates.distributor.incomingOrders || prevState.customerOrders.distributor,
            factory: apiGameState.playerStates.factory.incomingOrders || prevState.customerOrders.factory,
          }
        }))

        // Set the selected role based on the current user's role in the game
        if (result.data.currentUserRole) {
          setGameState(prevState => ({
            ...prevState,
            selectedRole: result.data.currentUserRole as Role
          }))
        }
      } else {
        setError(result.error || 'Failed to load game')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error loading game')
    } finally {
      setLoading(false)
    }
  }

  const setNumberOfStakeholders = (value: number) => {
    setGameState((prev) => ({ ...prev, numberOfStakeholders: value }))
  }

  const setOrderDelayPeriod = (value: number) => {
    setGameState((prev) => ({ ...prev, orderDelayPeriod: value }))
  }

  const setShippingDelayPeriod = (value: number) => {
    setGameState((prev) => ({ ...prev, shippingDelayPeriod: value }))
  }

  const setSelectedRole = (role: Role) => {
    setGameState((prev) => ({ ...prev, selectedRole: role }))
  }

  const setDemandPattern = (pattern: DemandPattern) => {
    setGameState((prev) => ({ ...prev, demandPattern: pattern }))
  }

  const setShowFullSupplyChain = (value: boolean) => {
    setGameState((prev) => ({ ...prev, showFullSupplyChain: value }))
  }

  const animateInventoryChange = useCallback(
    (role: Role, change: number) => {
      setGameState((prev) => {
        const updatedInventoryChanges = { ...prev.inventoryChanges }
        const roleLower = role.toLowerCase() as keyof typeof updatedInventoryChanges
        updatedInventoryChanges[roleLower] = change

        // Reset the change after a short delay
        setTimeout(() => {
          setGameState((current) => {
            const resetChanges = { ...current.inventoryChanges }
            resetChanges[roleLower] = 0
            return { ...current, inventoryChanges: resetChanges }
          })
        }, 1000)

        return { ...prev, inventoryChanges: updatedInventoryChanges }
      })
    },
    [setGameState],
  )

  const startGame = async () => {
    if (!gameId) {
      setError('No game ID provided')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await games.start(gameId)
      if (result.success) {
        setGameState((prev) => ({ ...prev, isPlaying: true }))
        toast({
          title: "Game Started",
          description: "The game has started. Good luck!",
        })
      } else {
        setError(result.error || 'Failed to start game')
        toast({
          title: "Error",
          description: result.error || 'Failed to start game',
          variant: "destructive",
        })
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error starting game'
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const pauseGame = async () => {
    // This functionality might not be directly supported by the backend
    // For now, just update the UI state
    setGameState((prev) => ({ ...prev, isPlaying: false }))
    return
  }

  const resetGame = async () => {
    if (!gameId) {
      setError('No game ID provided')
      return
    }

    // You may need to implement a reset endpoint in your API
    // For now, just reload the current game state from the server
    await loadGameState()
  }

  const advanceWeek = async () => {
    if (!gameId) {
      setError('No game ID provided')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await games.advanceWeek(gameId)
      if (result.success) {
        // The state update will come through the WebSocket
        toast({
          title: "Week Advanced",
          description: `Advanced to Week ${result.data.week}`,
        })
      } else {
        setError(result.error || 'Failed to advance week')
        toast({
          title: "Error",
          description: result.error || 'Failed to advance week',
          variant: "destructive",
        })
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error advancing week'
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const placeOrder = async (role: Role, quantity: number) => {
    if (!gameId) {
      setError('No game ID provided')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Get the recipient role based on the current role
      const recipientRole = getUpstreamRole(role)
      
      if (!recipientRole) {
        setError('Invalid role for ordering')
        return
      }

      const result = await orders.place(gameId, role, recipientRole, quantity)
      
      if (result.success) {
        // Visual feedback
        animateInventoryChange(role, -quantity)
        
        toast({
          title: "Order Placed",
          description: `Ordered ${quantity} units from ${recipientRole}`,
        })
      } else {
        setError(result.error || 'Failed to place order')
        toast({
          title: "Error",
          description: result.error || 'Failed to place order',
          variant: "destructive",
        })
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error placing order'
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Helper function to get the upstream role
  const getUpstreamRole = (role: string): Role | null => {
    switch (role) {
      case "Retailer":
        return "Wholesaler"
      case "Wholesaler":
        return "Distributor"
      case "Distributor":
        return "Factory"
      default:
        return null
    }
  }

  return (
    <GameContext.Provider
      value={{
        gameState,
        gameId,
        loading,
        error,
        setNumberOfStakeholders,
        setOrderDelayPeriod,
        setShippingDelayPeriod,
        setSelectedRole,
        setDemandPattern,
        setShowFullSupplyChain,
        startGame,
        pauseGame,
        resetGame,
        placeOrder,
        animateInventoryChange,
        advanceWeek
      }}
    >
      {children}
    </GameContext.Provider>
  )
}

export function useGame() {
  const context = useContext(GameContext)
  if (context === undefined) {
    throw new Error("useGame must be used within a GameProvider")
  }
  return context
}
