"use client"

import { useState } from "react"
import { useGame, type Role, type DemandPattern } from "./game-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Hexagon, Pause, Play, RefreshCw, Database } from "lucide-react"
import { BlockchainLedger } from "@/components/blockchain-ledger"

interface GameSetupProps {
  isHost?: boolean
  blockchainEnabled?: boolean
}

export function GameSetup({ isHost = false, blockchainEnabled = false }: GameSetupProps) {
  const {
    gameState,
    setNumberOfStakeholders,
    setOrderDelayPeriod,
    setShippingDelayPeriod,
    setSelectedRole,
    setDemandPattern,
    setShowFullSupplyChain,
    startGame,
    pauseGame,
    resetGame,
  } = useGame()

  const [showGraphs, setShowGraphs] = useState(true)
  const [showBlockchainLedger, setShowBlockchainLedger] = useState(false)

  const handleRoleChange = (value: string) => {
    setSelectedRole(value as Role)
  }

  const handleDemandPatternChange = (value: string) => {
    setDemandPattern(value as DemandPattern)
  }

  if (showBlockchainLedger && blockchainEnabled) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Blockchain Ledger</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBlockchainLedger(false)}
            className="border-gray-300 text-gray-600"
          >
            Back to Settings
          </Button>
        </div>
        <BlockchainLedger />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border border-gray-200 bg-white shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-xl text-gray-800">
            <Hexagon className="w-5 h-5 mr-2 text-purple-600" />
            Game Settings {isHost && "🍺"}
            {blockchainEnabled && <Database className="w-4 h-4 ml-2 text-purple-600" />}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {blockchainEnabled && (
            <Button
              variant="outline"
              className="w-full border-purple-200 text-purple-600 hover:bg-purple-50 mb-4"
              onClick={() => setShowBlockchainLedger(true)}
            >
              <Database className="w-4 h-4 mr-2" />
              View Blockchain Ledger
            </Button>
          )}

          <div className="space-y-2">
            <Label htmlFor="stakeholders" className="text-sm text-gray-600">
              Number of Stakeholders: {gameState.numberOfStakeholders}
            </Label>
            <Slider
              id="stakeholders"
              min={2}
              max={4}
              step={1}
              value={[gameState.numberOfStakeholders]}
              onValueChange={(value) => setNumberOfStakeholders(value[0])}
              disabled={gameState.isPlaying}
              className="py-4"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>2</span>
              <span>3</span>
              <span>4</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="orderDelay" className="text-sm text-gray-600">
              Order Delay Period (Weeks): {gameState.orderDelayPeriod}
            </Label>
            <Slider
              id="orderDelay"
              min={0}
              max={4}
              step={1}
              value={[gameState.orderDelayPeriod]}
              onValueChange={(value) => setOrderDelayPeriod(value[0])}
              disabled={gameState.isPlaying}
              className="py-4"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>0</span>
              <span>1</span>
              <span>2</span>
              <span>3</span>
              <span>4</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="shippingDelay" className="text-sm text-gray-600">
              Shipping Delay Period (Weeks): {gameState.shippingDelayPeriod}
            </Label>
            <Slider
              id="shippingDelay"
              min={0}
              max={4}
              step={1}
              value={[gameState.shippingDelayPeriod]}
              onValueChange={(value) => setShippingDelayPeriod(value[0])}
              disabled={gameState.isPlaying}
              className="py-4"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>0</span>
              <span>1</span>
              <span>2</span>
              <span>3</span>
              <span>4</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-gray-600">Customer Demand Pattern:</Label>
            <RadioGroup
              value={gameState.demandPattern}
              onValueChange={handleDemandPatternChange}
              disabled={gameState.isPlaying}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2 rounded-md border border-gray-200 p-2 hover:bg-gray-50">
                <RadioGroupItem value="Constant" id="constant" />
                <Label htmlFor="constant" className="flex-1 cursor-pointer text-gray-700">
                  Constant
                </Label>
              </div>
              <div className="flex items-center space-x-2 rounded-md border border-gray-200 p-2 hover:bg-gray-50">
                <RadioGroupItem value="StepIncrease" id="step" />
                <Label htmlFor="step" className="flex-1 cursor-pointer text-gray-700">
                  Step Increase
                </Label>
              </div>
              <div className="flex items-center space-x-2 rounded-md border border-gray-200 p-2 hover:bg-gray-50">
                <RadioGroupItem value="Random" id="random" />
                <Label htmlFor="random" className="flex-1 cursor-pointer text-gray-700">
                  Random
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role" className="text-sm text-gray-600">
              Select Role:
            </Label>
            <Select value={gameState.selectedRole} onValueChange={handleRoleChange} disabled={gameState.isPlaying}>
              <SelectTrigger className="w-full border-gray-300 bg-white text-gray-800">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Retailer">Retailer</SelectItem>
                <SelectItem value="Wholesaler">Wholesaler</SelectItem>
                <SelectItem value="Distributor">Distributor</SelectItem>
                <SelectItem value="Factory">Factory</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="supply-chain-visibility"
              checked={gameState.showFullSupplyChain}
              onCheckedChange={setShowFullSupplyChain}
              disabled={gameState.isPlaying}
            />
            <Label htmlFor="supply-chain-visibility" className="text-sm text-gray-600">
              Enable Full Supply Chain Visibility
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch id="show-graphs" checked={showGraphs} onCheckedChange={setShowGraphs} />
            <Label htmlFor="show-graphs" className="text-sm text-gray-600">
              Show/Hide Graphs
            </Label>
          </div>

          <div className="flex flex-col space-y-2">
            {!gameState.isPlaying ? (
              <Button
                onClick={startGame}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Game
              </Button>
            ) : (
              <Button
                onClick={pauseGame}
                variant="outline"
                className="w-full border-purple-300 text-purple-600 hover:bg-purple-50"
              >
                <Pause className="w-4 h-4 mr-2" />
                Pause Game
              </Button>
            )}
            <Button
              onClick={resetGame}
              variant="outline"
              className="w-full border-gray-300 text-gray-600 hover:bg-gray-50"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset Game
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
