"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { type BlockchainTransaction, getTransactionHistory } from "@/lib/blockchain-utils"
import { Package, History, ExternalLink, Copy, Layers } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface NFTDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  role: string
  inventory: number
}

export function NFTDetailsModal({ isOpen, onClose, role, inventory }: NFTDetailsModalProps) {
  const [activeTab, setActiveTab] = useState("details")
  const [transactions, setTransactions] = useState<BlockchainTransaction[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Mock NFT data
  const nftData = {
    tokenId: `INV-${role.toUpperCase()}-${Math.floor(Math.random() * 10000)}`,
    owner: role,
    quantity: inventory,
    lastUpdated: new Date().toISOString(),
    contractAddress: "0x1234567890abcdef1234567890abcdef12345678",
    metadata: {
      name: `${role} Inventory`,
      description: `This NFT represents the current inventory of ${inventory} units for the ${role} role in the Beer Distribution Game.`,
      image: "https://example.com/nft-image.png",
    },
  }

  const loadTransactionHistory = async () => {
    if (activeTab === "history" && transactions.length === 0) {
      setIsLoading(true)
      try {
        const txHistory = await getTransactionHistory()
        // Filter transactions related to this role
        const filteredTx = txHistory.filter(
          (tx) => tx.from.toLowerCase() === role.toLowerCase() || tx.to.toLowerCase() === role.toLowerCase(),
        )
        setTransactions(filteredTx)
      } catch (error) {
        console.error("Failed to fetch transaction history:", error)
      } finally {
        setIsLoading(false)
      }
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied to clipboard",
      variant: "default",
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Package className="w-5 h-5 mr-2 text-purple-600" />
            Inventory NFT Details
          </DialogTitle>
          <DialogDescription>
            View details about your inventory as a non-fungible token on the blockchain
          </DialogDescription>
        </DialogHeader>

        <Tabs
          defaultValue="details"
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value)
            if (value === "history") loadTransactionHistory()
          }}
        >
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger
              value="details"
              className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-600"
            >
              <Layers className="w-4 h-4 mr-2" />
              NFT Details
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-600"
            >
              <History className="w-4 h-4 mr-2" />
              Transaction History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <div className="flex justify-center mb-4">
              <div className="w-32 h-32 bg-gradient-to-br from-purple-400 to-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-2xl">
                {inventory} 🍺
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-500">Token ID</span>
                <div className="flex items-center space-x-1">
                  <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded truncate max-w-[150px]">
                    {nftData.tokenId}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => copyToClipboard(nftData.tokenId)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-500">Owner</span>
                <span className="text-sm capitalize">{nftData.owner}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-500">Quantity</span>
                <Badge className="bg-purple-100 text-purple-600 border-purple-200">{nftData.quantity} units</Badge>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-500">Last Updated</span>
                <span className="text-sm">{new Date(nftData.lastUpdated).toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-500">Contract Address</span>
                <div className="flex items-center space-x-1">
                  <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded truncate max-w-[150px]">
                    {`${nftData.contractAddress.substring(0, 6)}...${nftData.contractAddress.substring(nftData.contractAddress.length - 4)}`}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => copyToClipboard(nftData.contractAddress)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-center">
              <Button
                variant="outline"
                size="sm"
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                onClick={() => window.open(`https://example.com/explorer/token/${nftData.tokenId}`, "_blank")}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View on Blockchain Explorer
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center items-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No transaction history found for this inventory</div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {transactions.map((tx) => (
                  <div key={tx.id} className="border rounded-md p-3 hover:bg-gray-50">
                    <div className="flex justify-between items-center mb-2">
                      <Badge
                        variant="outline"
                        className={
                          tx.type === "order"
                            ? "bg-blue-100 text-blue-600 border-blue-200"
                            : "bg-purple-100 text-purple-600 border-purple-200"
                        }
                      >
                        {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={
                          tx.status === "confirmed"
                            ? "bg-green-100 text-green-600 border-green-200"
                            : "bg-yellow-100 text-yellow-600 border-yellow-200"
                        }
                      >
                        {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                      </Badge>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">From:</span>
                      <span className="capitalize">{tx.from}</span>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">To:</span>
                      <span className="capitalize">{tx.to}</span>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Quantity:</span>
                      <span>{tx.quantity}</span>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Date:</span>
                      <span>{new Date(tx.timestamp).toLocaleString()}</span>
                    </div>

                    <div className="mt-2 flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-600 hover:bg-blue-50 text-xs"
                        onClick={() => window.open(`https://example.com/explorer/tx/${tx.id}`, "_blank")}
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        View Transaction
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
