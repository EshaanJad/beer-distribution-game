@startuml Class Diagram

' --- Backend Components ---
package "Backend Server (Node.js)" {
  class GameCoordinator {
    +createGame(config)
    +joinGame(gameId, playerInfo)
    +processOrder(gameId, ...)
    +advanceWeek(gameId)
  }
  class BlockchainService {
    +submitTransaction(funcName, params)
    +listenForEvents(eventName)
  }
  class AuthService {
    +authenticatePlayer(credentials)
    +generateToken(playerId)
  }
  class WebSocketServer {
    +broadcastUpdate(gameId, data)
    +notifyPlayer(playerId, data)
  }
  interface APIGateway <<Interface>> {
    /api/games/...
    /api/players/...
    /api/orders/...
    /api/inventory/...
    /api/analytics/...
  }
  class MongooseInterface <<Interface>> {
     +findUser()
     +saveGame()
     +updateOrder()
     +findGameState()
  }
}

' --- Database Models (MongoDB Collections) ---
package "Database (MongoDB)" {
  class User {
    - _id: ObjectId
    - username: String
    - email: String
    - passwordHash: String
    - walletAddress: String
  }
  class Game {
    - _id: ObjectId
    - gameId: String
    - status: String
    - configuration: Object
    - contractAddress: String
    - players: Array<PlayerRef>
  }
  class GameState {
    - _id: ObjectId
    - gameId: String
    - week: Number
    - playerStates: Map<Role, PlayerStateData>
  }
  class Order {
    - _id: ObjectId
    - gameId: String
    - week: Number
    - sender: Object
    - recipient: Object
    - quantity: Number
    - status: String
    - blockchainData: Object { txHash, confirmed }
  }
    class Analytics {
    - _id: ObjectId
    - gameId: String
    - playerPerformance: Map<Role, PerfData>
    - bullwhipMetrics: Object
  }
}


' --- Blockchain Components ---
package "Blockchain (Ethereum/L2)" {
  class GameFactoryContract {
    +createGame(gameId, configParams)
  }
  class GameInstanceContract {
    +placeOrder(senderRole, recipientRole, quantity)
    +shipOrder(orderId)
    +receiveOrder(orderId)
    +updateInventory(playerRole, newInventory)
    +advanceWeek()
    # gameId: uint256
    # players: mapping(address => Player)
    # orders: mapping(uint256 => OrderData)
    # weekNumber: uint256
  }
  class PlayerRegistryContract {
      +assignRole(gameId, playerAddress, role)
  }
  class OrderData <<Struct>> {
    +orderId: uint256
    +sender: address
    +recipient: address
    +quantity: uint256
    +status: string
  }
  class PlayerData <<Struct>> {
    +playerAddress: address
    +inventory: uint256
    +backlog: uint256
  }
  note right of GameInstanceContract : Emits Events (OrderPlaced, etc.)
}

' --- Frontend (Abstracted) ---
package "Frontend (React)" {
  class GameDashboardUI
  class WalletConnector
  class WebSocketClient
  class StateManager (Redux)
}


' --- Relationships ---
GameCoordinator --> APIGateway : exposes via
GameCoordinator --> BlockchainService : uses
GameCoordinator --> MongooseInterface : uses
AuthService --> APIGateway : exposes via
AuthService --> MongooseInterface : uses
BlockchainService --> GameInstanceContract : interacts via Web3
BlockchainService --> GameFactoryContract : interacts via Web3
MongooseInterface --> User
MongooseInterface --> Game
MongooseInterface --> GameState
MongooseInterface --> Order
MongooseInterface --> Analytics

WebSocketServer -> Frontend : pushes updates via WebSocketClient

Frontend -> APIGateway : calls API
Frontend -> WalletConnector : uses for signing/reading
WalletConnector -> GameInstanceContract : interacts via Web3
WalletConnector -> PlayerRegistryContract : interacts via Web3

GameInstanceContract ..> OrderData : uses
GameInstanceContract ..> PlayerData : uses
GameInstanceContract <-- GameFactoryContract : creates

' Relationship between DB Models and Backend (via Mongoose Interface)
MongooseInterface ..> User
MongooseInterface ..> Game
MongooseInterface ..> GameState
MongooseInterface ..> Order
MongooseInterface ..> Analytics

' Association between Game and Order/GameState
Game "1" *-- "*" Order : contains
Game "1" *-- "*" GameState : records history for

@enduml

