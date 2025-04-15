"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { type BlockchainState, connectToBlockchain } from "@/lib/blockchain-utils"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"

interface BlockchainStatusProps {
  className?: string
}

export function BlockchainStatus({ className }: BlockchainStatusProps) {
  const [blockchainState, setBlockchainState] = useState<BlockchainState | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initBlockchain = async () => {
      try {
        setIsLoading(true)
        const state = await connectToBlockchain()
        setBlockchainState(state)
      } catch (error) {
        console.error("Failed to connect to blockchain:", error)
      } finally {
        setIsLoading(false)
      }
    }

    initBlockchain()

    // Poll for blockchain status every 30 seconds
    const interval = setInterval(initBlockchain, 30000)
    
    // Also listen for changes to local storage
    const handleStorageChange = () => {
      initBlockchain()
    }
    
    window.addEventListener('storage', handleStorageChange)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  if (isLoading) {
    return (
      <Badge variant="outline" className={`bg-gray-100 text-gray-600 ${className}`}>
        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
        Connecting to Blockchain
      </Badge>
    )
  }

  // Check localStorage directly in case the state hasn't updated yet
  const blockchainEnabled = typeof window !== 'undefined' ? 
    localStorage.getItem('blockchain_enabled') === 'true' : false;
  
  const isConnected = blockchainState?.connected || blockchainEnabled;

  if (!isConnected) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className={`bg-red-50 text-red-600 border-red-200 ${className}`}>
              <XCircle className="w-3 h-3 mr-1" />
              Blockchain Disconnected
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Unable to connect to the blockchain network</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`bg-green-50 text-green-600 border-green-200 ${className}`}>
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Blockchain Connected
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-medium">Blockchain Status: Active</p>
            {blockchainState?.address && (
              <p className="text-xs text-gray-500">Address: {blockchainState.address.substring(0, 10)}...</p>
            )}
            <p className="text-xs text-gray-500">Transactions: {blockchainState?.transactions.length || 0}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
