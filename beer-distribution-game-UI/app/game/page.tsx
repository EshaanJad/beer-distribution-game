"use client"

import { GameProvider } from "@/components/game-provider"
import { GameBoard } from "@/components/game-board"
import { GameSetup } from "@/components/game-setup"
import { GameAnalytics } from "@/components/game-analytics"
import { GameProgressIndicator } from "@/components/game-progress-indicator"
import { BlockchainStatus } from "@/components/blockchain-status"
import { GameAutoplay } from "@/components/game-autoplay"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Database } from "lucide-react"
import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"

export default function GamePage() {
  const searchParams = useSearchParams()
  const [blockchainEnabled, setBlockchainEnabled] = useState(false)
  const [autoplayEnabled, setAutoplayEnabled] = useState(false)

  useEffect(() => {
    // Get URL parameters
    const autoplay = searchParams.get("autoplay") === "true"
    const blockchain = searchParams.get("blockchain") === "true"

    setAutoplayEnabled(autoplay)
    setBlockchainEnabled(blockchain)
  }, [searchParams])

  return (
    <GameProvider>
      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white text-gray-800">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6">
            <div className="flex items-center">
              <Link href="/">
                <Button variant="ghost" size="sm" className="mr-2">
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Exit
                </Button>
              </Link>
              <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600 flex items-center">
                Beer Distribution Game 🍻{blockchainEnabled && <Database className="w-5 h-5 ml-2 text-purple-600" />}
              </h1>
            </div>
            <div className="flex items-center space-x-2 mt-2 md:mt-0">
              {blockchainEnabled && <BlockchainStatus className="mr-2" />}
              <GameProgressIndicator />
            </div>
          </div>

          {autoplayEnabled && <GameAutoplay enabled={autoplayEnabled} />}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-3">
              <GameSetup isHost={true} blockchainEnabled={blockchainEnabled} />
            </div>
            <div className="lg:col-span-9">
              <GameBoard blockchainEnabled={blockchainEnabled} />
              <div className="mt-6">
                <GameAnalytics blockchainEnabled={blockchainEnabled} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </GameProvider>
  )
}
