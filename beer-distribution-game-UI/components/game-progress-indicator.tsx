"use client"

import { useGame } from "./game-provider"
import { Badge } from "@/components/ui/badge"
import { Clock } from "lucide-react"

export function GameProgressIndicator() {
  const { gameState } = useGame()

  // Assuming a typical game lasts around 30 weeks
  const progressPercentage = Math.min((gameState.currentWeek / 30) * 100, 100)

  return (
    <div className="flex flex-col items-center md:items-end space-y-2 mt-4 md:mt-0">
      <div className="flex items-center space-x-2">
        <Clock className="w-4 h-4 text-blue-600" />
        <span className="text-gray-700">Game Progress</span>
        <Badge variant="outline" className="bg-blue-50 border-blue-300 text-blue-600">
          Week {gameState.currentWeek}
        </Badge>
      </div>
      <div className="w-full md:w-48 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500 ease-out"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
    </div>
  )
}
