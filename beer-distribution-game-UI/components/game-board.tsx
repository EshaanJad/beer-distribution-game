"use client"

import { useState } from "react"
import { useGame } from "./game-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowRight, Package, Truck, ShoppingCart, FactoryIcon, Database, ExternalLink } from "lucide-react"
import { blockchain } from "@/lib/api-client"
import { TransactionModal } from "@/components/transaction-modal"
import { NFTDetailsModal } from "@/components/nft-details-modal"
import { toast } from "@/components/ui/use-toast"

interface GameBoardProps {
  blockchainEnabled?: boolean
}

export function GameBoard({ blockchainEnabled = false }: GameBoardProps) {
  const { gameState, gameId, placeOrder, loading, error } = useGame()
  const [orderQuantity, setOrderQuantity] = useState<string>("0")
  const [verifyOnBlockchain, setVerifyOnBlockchain] = useState(false)
  const [lastTransaction, setLastTransaction] = useState<any>(null)
  const [showTransactionModal, setShowTransactionModal] = useState(false)
  const [showNFTModal, setShowNFTModal] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null)

  const handlePlaceOrder = async () => {
    const quantity = Number.parseInt(orderQuantity)
    if (!isNaN(quantity) && quantity >= 0) {
      try {
        // Call the placeOrder function from the GameProvider
        await placeOrder(gameState.selectedRole, quantity)
        
        // If blockchain is enabled and verification is requested, record the transaction
        if (blockchainEnabled && verifyOnBlockchain && gameId) {
          try {
            // Get the upstream role based on current role
            const upstreamRole = getUpstreamRole(gameState.selectedRole)

            if (upstreamRole) {
              const transaction = await blockchain.submitTransaction(
                gameId,
                'placeOrder',
                {
                  senderRole: gameState.selectedRole.toLowerCase(),
                  recipientRole: upstreamRole.toLowerCase(),
                  quantity
                }
              )

              if (transaction.success) {
                setLastTransaction(transaction.data)
                toast({
                  title: "Order Recorded on Blockchain",
                  description: `Transaction ID: ${transaction.data.id.substring(0, 10)}...`,
                  variant: "default",
                })
              }
            }
          } catch (error) {
            console.error("Failed to record transaction:", error)
            toast({
              title: "Blockchain Error",
              description: "Failed to record order on blockchain",
              variant: "destructive",
            })
          }
        }

        setOrderQuantity("0")
      } catch (error) {
        // Error handling is already done in the placeOrder function
        console.error("Order placement error:", error)
      }
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "Retailer":
        return <ShoppingCart className="w-5 h-5 text-green-600" />
      case "Wholesaler":
        return <Package className="w-5 h-5 text-blue-600" />
      case "Distributor":
        return <Truck className="w-5 h-5 text-purple-600" />
      case "Factory":
        return <FactoryIcon className="w-5 h-5 text-orange-600" />
      default:
        return <Package className="w-5 h-5" />
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case "Retailer":
        return "text-green-600 border-green-600/30 bg-green-100"
      case "Wholesaler":
        return "text-blue-600 border-blue-600/30 bg-blue-100"
      case "Distributor":
        return "text-purple-600 border-purple-600/30 bg-purple-100"
      case "Factory":
        return "text-orange-600 border-orange-600/30 bg-orange-100"
      default:
        return "text-gray-600 border-gray-600/30 bg-gray-100"
    }
  }

  const roleLower = gameState.selectedRole.toLowerCase() as keyof typeof gameState.inventory
  const currentInventory = gameState.inventory[roleLower][gameState.inventory[roleLower].length - 1] || 0
  const currentBackorder = gameState.backorders[roleLower][gameState.backorders[roleLower].length - 1] || 0
  const currentCost = gameState.costs[roleLower][gameState.costs[roleLower].length - 1] || 0

  // Get next week's incoming delivery (if available)
  const getNextWeekDelivery = () => {
    const nextRole = gameState.selectedRole.toLowerCase() as keyof typeof gameState.pendingShipments
    const upstreamRole = getUpstreamRole(gameState.selectedRole)

    if (!upstreamRole) return null

    const upstreamRoleLower = upstreamRole.toLowerCase() as keyof typeof gameState.pendingShipments

    if (
      gameState.pendingShipments[upstreamRoleLower]?.length > 0 &&
      gameState.pendingShipments[upstreamRoleLower][0]?.length > 0
    ) {
      return gameState.pendingShipments[upstreamRoleLower][0][0]
    }

    return null
  }

  // Helper function to get the upstream role
  const getUpstreamRole = (role: string): string | null => {
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

  const nextWeekDelivery = getNextWeekDelivery()

  // Mock transaction data for the view transaction button (if needed)
  const getMockTransaction = (type: "incoming" | "outgoing") => {
    const upstreamRole = getUpstreamRole(gameState.selectedRole)
    const downstreamRole = getDownstreamRole(gameState.selectedRole)

    if (type === "incoming" && upstreamRole) {
      return {
        id: `tx_${Math.random().toString(36).substring(2, 15)}`,
        timestamp: Date.now() - 3600000, // 1 hour ago
        from: upstreamRole.toLowerCase(),
        to: gameState.selectedRole.toLowerCase(),
        quantity: gameState.incomingDelivery[roleLower],
        type: "shipment",
        status: "confirmed",
      }
    } else if (type === "outgoing" && downstreamRole) {
      return {
        id: `tx_${Math.random().toString(36).substring(2, 15)}`,
        timestamp: Date.now() - 1800000, // 30 minutes ago
        from: gameState.selectedRole.toLowerCase(),
        to: downstreamRole.toLowerCase(),
        quantity: gameState.outgoingTransport[roleLower],
        type: "shipment",
        status: "confirmed",
      }
    }

    return null
  }

  // Helper function to get the downstream role
  const getDownstreamRole = (role: string): string | null => {
    switch (role) {
      case "Wholesaler":
        return "Retailer"
      case "Distributor":
        return "Wholesaler"
      case "Factory":
        return "Distributor"
      default:
        return null
    }
  }

  const handleViewTransaction = (type: "incoming" | "outgoing") => {
    // If we have a real transaction from blockchain, use that
    if (lastTransaction && type === "outgoing") {
      setSelectedTransaction(lastTransaction)
      setShowTransactionModal(true)
      return
    }
    
    // Otherwise use mock data
    const transaction = getMockTransaction(type)
    if (transaction) {
      setSelectedTransaction(transaction)
      setShowTransactionModal(true)
    }
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Badge className={`${getRoleColor(gameState.selectedRole)} px-3 py-1`}>
              {getRoleIcon(gameState.selectedRole)}
              <span className="ml-1">{gameState.selectedRole}</span>
            </Badge>
            <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-300">
              Week {gameState.currentWeek}
            </Badge>
          </div>
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
            Total Cost: ${currentCost.toFixed(2)}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <ShoppingCart className="w-4 h-4 mr-2 text-blue-600" />
                Customer Order
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-center h-24">
                <span className="text-4xl font-bold text-blue-600">{gameState.customerOrders[roleLower]}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <Package className="w-4 h-4 mr-2 text-green-600" />
                Your Stock (Inventory) 🍺{blockchainEnabled && <Database className="w-3 h-3 ml-1 text-purple-600" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-col items-center justify-center h-24">
                <span
                  className={`text-4xl font-bold transition-colors duration-300 ${
                    currentInventory >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {currentInventory}
                </span>
                {currentBackorder > 0 && (
                  <Badge variant="outline" className="mt-2 text-red-600 border-red-300 bg-red-50">
                    Backorders: {currentBackorder}
                  </Badge>
                )}
              </div>

              {blockchainEnabled && (
                <div className="mt-2 flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-purple-600 border-purple-200 hover:bg-purple-50 text-xs"
                    onClick={() => setShowNFTModal(true)}
                  >
                    <Database className="w-3 h-3 mr-1" />
                    View NFT Details
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <Truck className="w-4 h-4 mr-2 text-purple-600" />
                Outgoing Transport
                {blockchainEnabled && gameState.outgoingTransport[roleLower] > 0 && (
                  <Badge variant="outline" className="ml-2 bg-green-50 text-green-600 border-green-200 text-xs">
                    Verified
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-col items-center justify-center h-24">
                <span className="text-4xl font-bold text-purple-600">{gameState.outgoingTransport[roleLower]}</span>
              </div>

              {blockchainEnabled && gameState.outgoingTransport[roleLower] > 0 && (
                <div className="mt-2 flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-blue-600 border-blue-200 hover:bg-blue-50 text-xs"
                    onClick={() => handleViewTransaction("outgoing")}
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    View Transaction
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <ArrowRight className="w-4 h-4 mr-2 text-orange-600" />
                Incoming Delivery
                {blockchainEnabled && gameState.incomingDelivery[roleLower] > 0 && (
                  <Badge variant="outline" className="ml-2 bg-green-50 text-green-600 border-green-200 text-xs">
                    Verified
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-col items-center justify-center h-24">
                <span className="text-4xl font-bold text-orange-600">{gameState.incomingDelivery[roleLower]}</span>

                {nextWeekDelivery !== null && (
                  <div className="mt-2 flex items-center">
                    <span className="text-sm text-gray-500">Next week:</span>
                    <span className="ml-2 text-lg font-medium text-orange-500">{nextWeekDelivery}</span>
                  </div>
                )}
              </div>

              {blockchainEnabled && gameState.incomingDelivery[roleLower] > 0 && (
                <div className="mt-2 flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-blue-600 border-blue-200 hover:bg-blue-50 text-xs"
                    onClick={() => handleViewTransaction("incoming")}
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    View Transaction
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border border-gray-200 bg-white shadow-sm overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <ShoppingCart className="w-4 h-4 mr-2 text-yellow-600" />
              Place Order to Supplier
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex space-x-2">
                <Input
                  type="number"
                  min="0"
                  value={orderQuantity}
                  onChange={(e) => setOrderQuantity(e.target.value)}
                  className="border-gray-300 bg-white text-gray-800"
                />
                <Button
                  onClick={handlePlaceOrder}
                  className="relative overflow-hidden bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white group"
                >
                  <span className="relative z-10">Place Order</span>
                  <span className="absolute inset-0 bg-black opacity-0 group-active:opacity-10 transition-opacity duration-300"></span>
                  <span className="absolute inset-0 bg-gradient-to-r from-purple-700 to-blue-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></span>
                </Button>
              </div>

              {blockchainEnabled && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="verify-blockchain"
                    checked={verifyOnBlockchain}
                    onCheckedChange={(checked) => setVerifyOnBlockchain(checked as boolean)}
                  />
                  <label
                    htmlFor="verify-blockchain"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center"
                  >
                    <Database className="w-3 h-3 mr-1 text-purple-600" />
                    Verify on Blockchain
                  </label>
                </div>
              )}

              {blockchainEnabled && lastTransaction && (
                <div className="mt-2 p-2 bg-purple-50 rounded-md border border-purple-200 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Transaction ID:</span>
                    <span className="font-mono text-purple-600">{`${lastTransaction.id.substring(0, 10)}...`}</span>
                  </div>
                  <div className="flex justify-end mt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-blue-600 hover:bg-blue-50 p-0 text-xs"
                      onClick={() => {
                        setSelectedTransaction(lastTransaction)
                        setShowTransactionModal(true)
                      }}
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      View Details
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
        transaction={selectedTransaction}
      />

      {/* NFT Details Modal */}
      <NFTDetailsModal
        isOpen={showNFTModal}
        onClose={() => setShowNFTModal(false)}
        role={gameState.selectedRole}
        inventory={currentInventory}
      />
    </>
  )
}
