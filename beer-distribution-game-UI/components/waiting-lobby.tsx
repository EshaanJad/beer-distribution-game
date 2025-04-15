"use client"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  CheckCircle2,
  Clock,
  Copy,
  Crown,
  Factory,
  Package,
  Play,
  ShoppingCart,
  Truck,
  UserPlus,
  Users,
  Bot,
  AlertTriangle,
} from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { toast } from "@/components/ui/use-toast"

interface WaitingLobbyProps {
  gameCode: string
  players: {
    id: string
    name: string
    role: string | null
    isReady: boolean
    isHost: boolean
  }[]
  isHost: boolean
  currentPlayerName?: string
  onToggleReady?: () => void
  isReady?: boolean
  onSelectRole?: (role: string) => void
  selectedRole?: string
  onAssignRole?: (playerId: string, role: string) => void
  onStartGame?: () => void
  allowRoleSelection?: boolean
  onAddMockPlayer?: () => void // For demonstration
  countdown?: number | null
  onStartCountdown?: () => void
  onCancelCountdown?: () => void
  autoplayEnabled?: boolean
}

export function WaitingLobby({
  gameCode,
  players,
  isHost,
  currentPlayerName,
  onToggleReady,
  isReady,
  onSelectRole,
  selectedRole,
  onAssignRole,
  onStartGame,
  allowRoleSelection = true,
  onAddMockPlayer,
  countdown,
  onStartCountdown,
  onCancelCountdown,
  autoplayEnabled = false,
}: WaitingLobbyProps) {
  const copyGameCode = () => {
    navigator.clipboard.writeText(gameCode)
    toast({
      title: "Game code copied",
      description: "Share this code with your players",
      variant: "default",
    })
  }

  const getRoleIcon = (role: string | null) => {
    switch (role) {
      case "Retailer":
        return <ShoppingCart className="w-5 h-5 text-green-600" />
      case "Wholesaler":
        return <Package className="w-5 h-5 text-blue-600" />
      case "Distributor":
        return <Truck className="w-5 h-5 text-purple-600" />
      case "Factory":
        return <Factory className="w-5 h-5 text-orange-600" />
      default:
        return null
    }
  }

  const getRoleBadgeColor = (role: string | null) => {
    switch (role) {
      case "Retailer":
        return "bg-green-100 text-green-600 border-green-300"
      case "Wholesaler":
        return "bg-blue-100 text-blue-600 border-blue-300"
      case "Distributor":
        return "bg-purple-100 text-purple-600 border-purple-300"
      case "Factory":
        return "bg-orange-100 text-orange-600 border-orange-300"
      default:
        return "bg-gray-100 text-gray-600 border-gray-300"
    }
  }

  // Check which roles are taken
  const takenRoles = players.map((p) => p.role).filter(Boolean) as string[]
  const availableRoles = ["Retailer", "Wholesaler", "Distributor", "Factory"].filter(
    (role) => !takenRoles.includes(role),
  )

  // Check if all players are ready
  const allPlayersReady = players.every((player) => player.isReady)

  // Check if all roles are filled
  const allRolesFilled = takenRoles.length === 4

  // Calculate how many more players are needed
  const playersNeeded = 4 - players.length
  const rolesNeeded = 4 - takenRoles.length

  return (
    <div className="space-y-6">
      <Card className="border border-gray-200 bg-white shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center text-xl">
              <Users className="w-5 h-5 mr-2 text-blue-600" />
              Waiting Lobby 🍻
            </CardTitle>
            <Badge
              className="bg-blue-100 text-blue-600 border-blue-300 cursor-pointer hover:bg-blue-200"
              onClick={copyGameCode}
            >
              Game Code: {gameCode} <Copy className="w-3 h-3 ml-1" />
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {autoplayEnabled && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-start">
                <Bot className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-800">Autoplay Mode Enabled</h3>
                  <p className="text-sm text-blue-600 mt-1">
                    This game will be played by AI bots. You can start the game immediately or add human players to
                    replace some of the bots.
                  </p>
                </div>
              </div>
            </div>
          )}

          {countdown !== null && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-purple-600 flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  Game starting in: {countdown} seconds
                </span>
                {isHost && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onCancelCountdown}
                    className="text-red-600 border-red-300"
                  >
                    Cancel
                  </Button>
                )}
              </div>
              <Progress value={(countdown / 10) * 100} className="h-2" indicatorClassName="bg-purple-600" />
            </div>
          )}

          {(playersNeeded > 0 || rolesNeeded > 0) && !autoplayEnabled && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex items-start">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
                <div>
                  <h3 className="font-medium text-yellow-800">Waiting for players</h3>
                  <p className="text-sm text-yellow-600 mt-1">
                    {playersNeeded > 0
                      ? `Need ${playersNeeded} more player${playersNeeded > 1 ? "s" : ""} to join.`
                      : `All players have joined, but ${rolesNeeded} role${rolesNeeded > 1 ? "s" : ""} still need to be assigned.`}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {["Retailer", "Wholesaler", "Distributor", "Factory"].map((role) => {
              const player = players.find((p) => p.role === role)
              return (
                <Card key={role} className="border border-gray-200 bg-gray-50">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center">
                      {getRoleIcon(role)}
                      <span className="ml-2 font-medium">{role}</span>
                    </div>

                    {player ? (
                      <div className="flex items-center">
                        <span className="text-gray-700 mr-2">{player.name}</span>
                        {player.isHost && <Crown className="w-4 h-4 text-yellow-500 mr-1" />}
                        {player.isReady ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <Clock className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    ) : (
                      <Badge variant="outline" className="bg-gray-100 text-gray-500 border-gray-300">
                        {autoplayEnabled ? "AI Bot" : "Available"}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <h3 className="text-lg font-medium mb-3">Players</h3>
          <div className="space-y-3">
            {players.map((player) => (
              <div
                key={player.id}
                className={`p-3 rounded-md border ${
                  player.name === currentPlayerName ? "border-blue-300 bg-blue-50" : "border-gray-200 bg-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {player.isHost && (
                      <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300 mr-2">
                        <Crown className="w-3 h-3 mr-1" /> Host
                      </Badge>
                    )}
                    <span className="font-medium">{player.name}</span>
                    {player.isReady && (
                      <Badge className="ml-2 bg-green-100 text-green-600 border-green-300">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Ready
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center">
                    {player.role ? (
                      <Badge className={getRoleBadgeColor(player.role)}>
                        {getRoleIcon(player.role)}
                        <span className="ml-1">{player.role}</span>
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-100 text-gray-500 border-gray-300">
                        No Role
                      </Badge>
                    )}

                    {isHost && player.id !== "host-id" && (
                      <Select
                        value={player.role || ""}
                        onValueChange={(value) => onAssignRole && onAssignRole(player.id, value)}
                      >
                        <SelectTrigger className="ml-2 h-8 w-32 border-gray-300">
                          <SelectValue placeholder="Assign Role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Role</SelectItem>
                          {["Retailer", "Wholesaler", "Distributor", "Factory"].map((role) => (
                            <SelectItem
                              key={role}
                              value={role}
                              disabled={takenRoles.includes(role) && player.role !== role}
                            >
                              {role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* For demonstration purposes only */}
          {onAddMockPlayer && players.length < 4 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onAddMockPlayer}
              className="mt-4 border-gray-300 text-gray-600"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add Mock Player
            </Button>
          )}
        </CardContent>
        <CardFooter className="flex justify-between border-t border-gray-200 pt-4">
          {!isHost && (
            <div className="flex items-center space-x-3">
              {allowRoleSelection && (
                <Select value={selectedRole || ""} onValueChange={(value) => onSelectRole && onSelectRole(value)}>
                  <SelectTrigger className="w-40 border-gray-300">
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Preference</SelectItem>
                    {["Retailer", "Wholesaler", "Distributor", "Factory"].map((role) => (
                      <SelectItem key={role} value={role} disabled={takenRoles.includes(role) && selectedRole !== role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Button
                variant={isReady ? "outline" : "default"}
                onClick={onToggleReady}
                className={
                  isReady
                    ? "border-green-300 text-green-600 hover:bg-green-50"
                    : "bg-green-600 hover:bg-green-700 text-white"
                }
              >
                {isReady ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Ready
                  </>
                ) : (
                  "Mark as Ready"
                )}
              </Button>
            </div>
          )}

          {isHost && (
            <div className="flex space-x-3">
              {countdown === null ? (
                <>
                  <Button
                    onClick={onStartCountdown}
                    disabled={!autoplayEnabled && (!allPlayersReady || !allRolesFilled)}
                    variant="outline"
                    className="border-purple-300 text-purple-600 hover:bg-purple-50"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Start Countdown
                  </Button>
                  <Button
                    onClick={onStartGame}
                    disabled={!autoplayEnabled && (!allPlayersReady || !allRolesFilled)}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Start Game 🍺
                  </Button>
                </>
              ) : (
                <Button
                  onClick={onStartGame}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Now
                </Button>
              )}
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
