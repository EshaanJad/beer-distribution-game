"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { Copy, Crown, Loader2, RefreshCw, Settings, Users, Database } from "lucide-react"
import { GameSetup } from "@/components/game-setup"
import { WaitingLobby } from "@/components/waiting-lobby"
import { toast } from "@/components/ui/use-toast"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { BlockchainStatus } from "@/components/blockchain-status"
import { auth, games } from "@/lib/api-client"
import { useWebSocket, WebSocketEvent } from "@/hooks/useWebSocket"

export default function CreateGamePage() {
  const router = useRouter()
  const [gameId, setGameId] = useState("")
  const [hostName, setHostName] = useState("")
  const [isGeneratingCode, setIsGeneratingCode] = useState(false)
  const [isCreatingGame, setIsCreatingGame] = useState(false)
  const [activeTab, setActiveTab] = useState("settings")
  const [roleAssignment, setRoleAssignment] = useState("manual") // manual or random
  const [allowRoleSelection, setAllowRoleSelection] = useState(true)
  const [gameCreated, setGameCreated] = useState(false)
  const [blockchainEnabled, setBlockchainEnabled] = useState(false)
  const [autoplayEnabled, setAutoplayEnabled] = useState(false)
  const [lobbyCountdown, setLobbyCountdown] = useState<number | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  
  // Game configuration options
  const [demandPattern, setDemandPattern] = useState("Constant")
  const [initialInventory, setInitialInventory] = useState(12)
  const [orderDelayPeriod, setOrderDelayPeriod] = useState(1)
  const [shippingDelayPeriod, setShippingDelayPeriod] = useState(1)
  const [agentsEnabled, setAgentsEnabled] = useState(false)
  const [forecastHorizon, setForecastHorizon] = useState(4)
  const [safetyFactor, setSafetyFactor] = useState(0.5)

  // Check authentication on component mount
  useEffect(() => {
    const checkAuth = () => {
      const isAuth = auth.isAuthenticated();
      setIsAuthenticated(isAuth);
      
      if (!isAuth) {
        toast({
          title: "Authentication required",
          description: "Please log in to create a game",
          variant: "destructive",
        });
        router.push('/auth/login');
      }
    };
    
    checkAuth();
  }, [router]);

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

  // Setup WebSocket connection
  const handleWebSocketMessage = (event: WebSocketEvent) => {
    switch (event.type) {
      case 'playerJoined':
        toast({
          title: "Player Joined",
          description: `${event.data.username} joined the game`,
        })
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
        ])
        break;
      case 'playerLeft':
        toast({
          title: "Player Left",
          description: `${event.data.username} left the game`,
        })
        // Remove player from connected players list
        setConnectedPlayers(prev => 
          prev.filter(player => player.id !== event.data.userId)
        )
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
        )
        break;
      case 'gameStarting':
        // Game is starting, set countdown
        setLobbyCountdown(event.data.countdown || 10)
        toast({
          title: "Game Starting Soon",
          description: `The game will begin in ${event.data.countdown || 10} seconds`,
        })
        break;
    }
  }
  
  const { connected: wsConnected, sendMessage } = useWebSocket(gameId, {
    onMessage: handleWebSocketMessage
  })

  useEffect(() => {
    if (gameCreated) {
      // Check if host is already in connected players
      const hostExists = connectedPlayers.some(player => player.isHost);
      
      if (!hostExists) {
        // Add host to connected players
        setConnectedPlayers([
          {
            id: "host-id", // This will be replaced by the actual user ID from backend
            name: hostName || "Host",
            role: null,
            isReady: true,
            isHost: true,
          },
        ]);
      }
    }
  }, [gameCreated, hostName, connectedPlayers]);

  // Handle countdown timer
  useEffect(() => {
    if (lobbyCountdown === null) return

    if (lobbyCountdown <= 0) {
      startGame()
      return
    }

    const timer = setTimeout(() => {
      setLobbyCountdown(lobbyCountdown - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [lobbyCountdown])

  // Load user info if available
  useEffect(() => {
    const loadUserInfo = async () => {
      if (auth.isAuthenticated()) {
        try {
          const userData = await auth.getCurrentUser();
          if (userData.success && userData.data) {
            setHostName(userData.data.username || '');
          }
        } catch (error) {
          console.error('Error loading user info:', error);
        }
      }
    };
    
    loadUserInfo();
  }, []);

  const createGame = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication required",
        description: "Please log in to create a game",
        variant: "destructive",
      });
      router.push('/auth/login');
      return;
    }
    
    if (!hostName.trim()) {
      toast({
        title: "Host name required",
        description: "Please enter your name",
        variant: "destructive",
      })
      return
    }

    setIsCreatingGame(true);

    try {
      // Create game via API
      const result = await games.create({
        demandPattern: demandPattern as any,
        initialInventory: initialInventory,
        orderDelayPeriod: orderDelayPeriod,
        shippingDelayPeriod: shippingDelayPeriod,
        blockchainEnabled: blockchainEnabled,
        agents: {
          enabled: agentsEnabled,
          algorithmConfig: {
            forecastHorizon: forecastHorizon,
            safetyFactor: safetyFactor,
            visibilityMode: blockchainEnabled ? 'blockchain' : 'traditional'
          }
        }
      });

      if (result.success) {
        setGameId(result.data.gameId);
        setGameCreated(true);
        setActiveTab("lobby");

        toast({
          title: "Game created successfully",
          description: `Game ID: ${result.data.gameId}`,
          variant: "default",
        });
      } else {
        toast({
          title: "Error creating game",
          description: result.error || "Failed to create game",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error creating game:', error);
      toast({
        title: "Error creating game",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsCreatingGame(false);
    }
  }

  const copyInviteLink = () => {
    const inviteLink = `${window.location.origin}/join-game?code=${gameId}`
    navigator.clipboard.writeText(inviteLink)

    toast({
      title: "Invite link copied",
      description: "Share this link with your players",
      variant: "default",
    })
  }

  const startGame = async () => {
    if (autoplayEnabled) {
      try {
        // Enable autoplay mode
        await games.enableAutoplay(gameId);
        
        // Navigate to game page
        router.push(`/game?gameId=${gameId}&autoplay=true&blockchain=${blockchainEnabled ? "true" : "false"}`);
        return;
      } catch (error) {
        console.error('Error enabling autoplay:', error);
        toast({
          title: "Error enabling autoplay",
          description: error instanceof Error ? error.message : "Unknown error occurred",
          variant: "destructive",
        });
        return;
      }
    }

    // Check if all roles are filled
    const filledRoles = connectedPlayers.filter((player) => player.role).length;

    if (filledRoles < 4 && !autoplayEnabled) {
      toast({
        title: "Cannot start game",
        description: "All roles must be filled before starting",
        variant: "destructive",
      });
      return;
    }

    // Check if all players are ready
    const allReady = connectedPlayers.every((player) => player.isReady);

    if (!allReady && !autoplayEnabled) {
      toast({
        title: "Cannot start game",
        description: "All players must be ready before starting",
        variant: "destructive",
      });
      return;
    }

    try {
      // Start game via API
      const result = await games.start(gameId);
      
      if (result.success) {
        // Navigate to game page
        router.push(`/game?gameId=${gameId}&blockchain=${blockchainEnabled ? "true" : "false"}`);
      } else {
        toast({
          title: "Error starting game",
          description: result.error || "Failed to start game",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error starting game:', error);
      toast({
        title: "Error starting game",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  }

  const startCountdown = () => {
    // Check if all roles are filled
    const filledRoles = connectedPlayers.filter((player) => player.role).length;

    if (filledRoles < 4 && !autoplayEnabled) {
      toast({
        title: "Cannot start countdown",
        description: "All roles must be filled before starting",
        variant: "destructive",
      });
      return;
    }

    // Check if all players are ready
    const allReady = connectedPlayers.every((player) => player.isReady);

    if (!allReady && !autoplayEnabled) {
      toast({
        title: "Cannot start countdown",
        description: "All players must be ready before starting",
        variant: "destructive",
      });
      return;
    }

    // Send countdown start message through WebSocket
    sendMessage('startCountdown', { 
      gameId: gameId,
      countdown: 10 
    });

    setLobbyCountdown(10); // 10 second countdown

    toast({
      title: "Game starting soon",
      description: "The game will begin in 10 seconds",
      variant: "default",
    });
  }

  const cancelCountdown = () => {
    // Send cancel countdown message through WebSocket
    sendMessage('cancelCountdown', { gameId });
    
    setLobbyCountdown(null);

    toast({
      title: "Countdown cancelled",
      description: "Game start has been cancelled",
      variant: "default",
    });
  }

  // Toggle player ready status
  const togglePlayerReady = (playerId: string) => {
    // Send player ready status update through WebSocket
    sendMessage('updatePlayerStatus', { 
      gameId, 
      playerId,
      isReady: !connectedPlayers.find(p => p.id === playerId)?.isReady 
    });
  }

  // Assign role to player
  const assignRole = (playerId: string, role: string) => {
    // Check if role is already taken
    const isRoleTaken = connectedPlayers.some((p) => p.role === role && p.id !== playerId);

    if (isRoleTaken) {
      toast({
        title: "Role already taken",
        description: `The ${role} role is already assigned to another player`,
        variant: "destructive",
      });
      return;
    }

    // Send role assignment through WebSocket
    sendMessage('assignRole', { 
      gameId, 
      playerId,
      role 
    });
  }

  // Handle blockchain toggle
  const handleBlockchainToggle = (enabled: boolean) => {
    setBlockchainEnabled(enabled);
    
    // Store the blockchain enabled state in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('blockchain_enabled', enabled.toString());
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white text-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600 flex items-center">
            Create New Game
            {blockchainEnabled && <Database className="w-5 h-5 ml-2 text-purple-600" />}
          </h1>
          <div className="flex items-center mt-4 md:mt-0 space-x-2">
            {blockchainEnabled && <BlockchainStatus className="mr-2" />}
            {gameCreated && (
              <Badge className="bg-purple-100 text-purple-600 border-purple-300 mr-2">Game ID: {gameId}</Badge>
            )}
            {gameCreated && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyInviteLink}
                      className="border-purple-300 text-purple-600 hover:bg-purple-50"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Invite Link
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Copy link to share with players</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>

        {!gameCreated ? (
          <Card className="border border-gray-200 bg-white shadow-sm max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center text-xl">
                <Crown className="w-5 h-5 mr-2 text-purple-600" />
                Game Setup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="host-name">Your Name (Host)</Label>
                <Input
                  id="host-name"
                  placeholder="Enter your name"
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  className="border-gray-300"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="game-code">Game ID</Label>
                <div className="flex space-x-2">
                  <Input
                    id="game-code"
                    placeholder="Generate a game ID"
                    value={gameId}
                    readOnly
                    className="border-gray-300 bg-gray-50"
                  />
                  <Button
                    onClick={createGame}
                    variant="outline"
                    disabled={isCreatingGame}
                    className="border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    {isCreatingGame ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Create Game
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Role Assignment</Label>
                <RadioGroup
                  value={roleAssignment}
                  onValueChange={setRoleAssignment}
                  className="flex flex-col space-y-2"
                >
                  <div className="flex items-center space-x-2 rounded-md border border-gray-200 p-2 hover:bg-gray-50">
                    <RadioGroupItem value="manual" id="manual" />
                    <Label htmlFor="manual" className="flex-1 cursor-pointer">
                      Manual Assignment (Host assigns roles)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 rounded-md border border-gray-200 p-2 hover:bg-gray-50">
                    <RadioGroupItem value="random" id="random" />
                    <Label htmlFor="random" className="flex-1 cursor-pointer">
                      Random Assignment
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="flex items-center space-x-2">
                <Switch id="allow-selection" checked={allowRoleSelection} onCheckedChange={setAllowRoleSelection} />
                <Label htmlFor="allow-selection" className="text-sm text-gray-600">
                  Allow players to select their preferred role
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch id="blockchain-enabled" checked={blockchainEnabled} onCheckedChange={handleBlockchainToggle} />
                <Label htmlFor="blockchain-enabled" className="text-sm text-gray-600 flex items-center">
                  <Database className="w-3 h-3 mr-1 text-purple-600" />
                  Enable Blockchain Features
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch id="autoplay-enabled" checked={autoplayEnabled} onCheckedChange={setAutoplayEnabled} />
                <Label htmlFor="autoplay-enabled" className="text-sm text-gray-600 flex items-center">
                  <Users className="w-3 h-3 mr-1 text-blue-600" />
                  Autoplay (4 AI Bots)
                </Label>
              </div>

              <div className="pt-4">
                <Button
                  onClick={createGame}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                >
                  Create Game & Continue to Lobby
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-5xl mx-auto">
            <TabsList className="grid grid-cols-2 mb-6">
              <TabsTrigger
                value="settings"
                className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-600"
              >
                <Settings className="w-4 h-4 mr-2" />
                Game Settings
              </TabsTrigger>
              <TabsTrigger
                value="lobby"
                className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-600"
              >
                <Users className="w-4 h-4 mr-2" />
                Waiting Lobby
              </TabsTrigger>
            </TabsList>

            <TabsContent value="settings" className="mt-0">
              <GameSetup isHost={true} blockchainEnabled={blockchainEnabled} />
            </TabsContent>

            <TabsContent value="lobby" className="mt-0">
              <WaitingLobby
                gameCode={gameId}
                players={connectedPlayers}
                isHost={true}
                onAssignRole={assignRole}
                onToggleReady={togglePlayerReady}
                onStartGame={startGame}
                onAddMockPlayer={() => {}} // For demonstration
                allowRoleSelection={allowRoleSelection}
                countdown={lobbyCountdown}
                onStartCountdown={startCountdown}
                onCancelCountdown={cancelCountdown}
                autoplayEnabled={autoplayEnabled}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </main>
  )
}
