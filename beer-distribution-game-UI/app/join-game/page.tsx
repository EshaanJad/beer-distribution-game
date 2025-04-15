"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Loader2, LogIn } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { WaitingLobby } from "@/components/waiting-lobby"
import { auth, games } from "@/lib/api-client"
import { Role } from "@/components/game-provider"
import { useWebSocket, WebSocketEvent } from "@/hooks/useWebSocket"

export default function JoinGamePage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [gameId, setGameId] = useState("")
  const [playerName, setPlayerName] = useState("")
  const [selectedRole, setSelectedRole] = useState<Role | "">("")
  const [isJoining, setIsJoining] = useState(false)
  const [hasJoined, setHasJoined] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  // Game configuration
  const [gameInfo, setGameInfo] = useState<{
    hostName: string
    allowRoleSelection: boolean
    availableRoles: Role[]
  }>({
    hostName: "",
    allowRoleSelection: true,
    availableRoles: ["Retailer", "Wholesaler", "Distributor", "Factory"]
  })

  // Connected players state
  const [connectedPlayers, setConnectedPlayers] = useState<
    {
      id: string
      name: string
      role: string | null
      isReady: boolean
      isHost: boolean
    }[]
  >([])

  // Handle WebSocket messages
  const handleWebSocketMessage = (event: WebSocketEvent) => {
    switch (event.type) {
      case 'playerJoined':
        // Update connected players list
        setConnectedPlayers(prev => [
          ...prev,
          {
            id: event.data.userId,
            name: event.data.username,
            role: event.data.role || null,
            isReady: event.data.isReady || false,
            isHost: event.data.isHost || false,
          }
        ]);
        
        // Show toast notification if it's not the current user
        if (event.data.userId !== userId) {
          toast({
            title: "Player Joined",
            description: `${event.data.username} joined the game`,
          });
        }
        break;
        
      case 'playerLeft':
        // Remove player from connected players list
        setConnectedPlayers(prev => 
          prev.filter(player => player.id !== event.data.userId)
        );
        
        // Show toast notification
        toast({
          title: "Player Left",
          description: `${event.data.username} left the game`,
        });
        break;
        
      case 'playerUpdated':
        // Update player information (role, ready status)
        setConnectedPlayers(prev => 
          prev.map(player => 
            player.id === event.data.userId 
              ? { 
                  ...player, 
                  role: event.data.role || player.role,
                  isReady: event.data.isReady !== undefined ? event.data.isReady : player.isReady 
                }
              : player
          )
        );
        
        // If it's the current user, update the local ready state
        if (event.data.userId === userId && event.data.isReady !== undefined) {
          setIsReady(event.data.isReady);
        }
        break;
        
      case 'gameStarting':
        // Game is starting, set countdown
        setCountdown(event.data.countdown || 10);
        
        toast({
          title: "Game Starting Soon",
          description: `The game will begin in ${event.data.countdown || 10} seconds`,
        });
        break;
    }
  };
  
  // Connect to WebSocket
  const { connected: wsConnected, sendMessage } = useWebSocket(gameId, {
    onMessage: handleWebSocketMessage
  });

  // Check for game code in URL params
  useEffect(() => {
    const code = searchParams.get("code")
    if (code) {
      setGameId(code)
    }
  }, [searchParams])

  // Load user info if available
  useEffect(() => {
    const loadUserInfo = async () => {
      if (auth.isAuthenticated()) {
        try {
          const userData = await auth.getCurrentUser();
          if (userData.success && userData.data) {
            setPlayerName(userData.data.username || '');
            setUserId(userData.data.id || null);
          }
        } catch (error) {
          console.error('Error loading user info:', error);
        }
      }
    };
    
    loadUserInfo();
  }, []);

  // Handle countdown timer
  useEffect(() => {
    if (countdown === null) return

    if (countdown <= 0) {
      router.push(`/game?gameId=${gameId}`)
      return
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [countdown, router, gameId])

  // Load game info when game ID changes
  useEffect(() => {
    const loadGameInfo = async () => {
      if (!gameId || hasJoined) return;
      
      try {
        const result = await games.getById(gameId);
        
        if (result.success) {
          // Update game info
          setGameInfo({
            hostName: result.data.createdBy?.username || 'Host',
            allowRoleSelection: result.data.configuration?.allowRoleSelection !== false,
            availableRoles: ["Retailer", "Wholesaler", "Distributor", "Factory"].filter(role => 
              !result.data.players?.some(p => p.role === role)
            ) as Role[]
          });
          
          // Update connected players
          if (result.data.players) {
            setConnectedPlayers(
              result.data.players.map(player => ({
                id: player.userId,
                name: player.username,
                role: player.role,
                isReady: player.isReady || false,
                isHost: player.isHost || false
              }))
            );
          }
        }
      } catch (error) {
        console.error('Error loading game info:', error);
      }
    };
    
    if (gameId) {
      loadGameInfo();
    }
  }, [gameId, hasJoined]);

  const joinGame = async () => {
    if (!gameId.trim()) {
      toast({
        title: "Game ID required",
        description: "Please enter a valid game ID",
        variant: "destructive",
      })
      return
    }

    if (!playerName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter your name",
        variant: "destructive",
      })
      return
    }

    if (!selectedRole) {
      toast({
        title: "Role required",
        description: "Please select a role",
        variant: "destructive",
      })
      return
    }

    setIsJoining(true)

    try {
      // Join game via API
      const result = await games.join(gameId, selectedRole);
      
      if (result.success) {
        // Update user ID if not set yet
        if (!userId && result.data.userId) {
          setUserId(result.data.userId);
        }
        
        // Add player to connected players if not already in the list
        const currentUserId = userId || result.data.userId;
        if (currentUserId && !connectedPlayers.some(p => p.id === currentUserId)) {
          const newPlayer = {
            id: currentUserId,
            name: playerName,
            role: selectedRole,
            isReady: false,
            isHost: false,
          };
          
          setConnectedPlayers(prev => [...prev, newPlayer]);
        }
        
        setHasJoined(true);
        
        toast({
          title: "Joined game successfully",
          description: `You've joined game ${gameId} as ${selectedRole}`,
          variant: "default",
        });
      } else {
        toast({
          title: "Failed to join game",
          description: result.error || "Unknown error occurred",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error joining game:', error);
      toast({
        title: "Error joining game",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsJoining(false);
    }
  }

  const toggleReady = () => {
    const currentUserId = userId;
    if (!currentUserId) return;
    
    // Toggle ready status locally
    const newReadyStatus = !isReady;
    setIsReady(newReadyStatus);
    
    // Send update to server via WebSocket
    sendMessage('updatePlayerStatus', {
      gameId,
      playerId: currentUserId,
      isReady: newReadyStatus
    });
    
    // Also update the connected players list
    setConnectedPlayers(players =>
      players.map(player => 
        player.id === currentUserId 
          ? { ...player, isReady: newReadyStatus }
          : player
      )
    );
  }

  const selectRole = (role: string) => {
    // Check if role is already taken
    const isRoleTaken = connectedPlayers.some(p => p.role === role && p.id !== userId);
    
    if (isRoleTaken) {
      toast({
        title: "Role already taken",
        description: `The ${role} role is already assigned to another player`,
        variant: "destructive",
      });
      return;
    }
    
    setSelectedRole(role as Role);
    
    // If already joined, send role update via WebSocket
    if (hasJoined && userId) {
      sendMessage('assignRole', {
        gameId,
        playerId: userId,
        role
      });
      
      // Update connected players
      setConnectedPlayers(players =>
        players.map(player =>
          player.id === userId
            ? { ...player, role }
            : player
        )
      );
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white text-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
            Join Game
          </h1>
          {hasJoined && (
            <Badge className="bg-blue-100 text-blue-600 border-blue-300 mt-2 md:mt-0">Game ID: {gameId}</Badge>
          )}
        </div>

        {!hasJoined ? (
          <Card className="border border-gray-200 bg-white shadow-sm max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center text-xl">
                <LogIn className="w-5 h-5 mr-2 text-blue-600" />
                Join Existing Game
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="game-code">Game ID</Label>
                <Input
                  id="game-code"
                  placeholder="Enter game ID"
                  value={gameId}
                  onChange={(e) => setGameId(e.target.value.toUpperCase())}
                  className="border-gray-300"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="player-name">Your Name</Label>
                <Input
                  id="player-name"
                  placeholder="Enter your name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="border-gray-300"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role-selection">Choose Role</Label>
                <Select value={selectedRole} onValueChange={selectRole}>
                  <SelectTrigger className="w-full border-gray-300">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {gameInfo.availableRoles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={joinGame}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                disabled={isJoining}
              >
                {isJoining ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 mr-2" />
                    Join Game
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <WaitingLobby
            gameCode={gameId}
            players={connectedPlayers}
            isHost={false}
            currentUserName={playerName}
            isCurrentUserReady={isReady}
            onToggleReady={toggleReady}
            allowRoleSelection={gameInfo.allowRoleSelection}
            countdown={countdown}
          />
        )}
      </div>
    </main>
  )
}
