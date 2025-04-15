 
Database Layer: Detailed Architecture for the Beer Distribution Game
The database layer provides persistent storage for game data, player information, and analytics while complementing the blockchain's immutable record-keeping. MongoDB is an ideal choice due to its flexibility with schema design and excellent performance for real-time applications.
 
Data Model
1. Users Collection
Stores player profiles and authentication information:
{
  "_id": "ObjectId",
  "username": "String",
  "email": "String",
  "passwordHash": "String",
  "walletAddress": "String (optional)",
  "createdAt": "Date",
  "lastLogin": "Date",
  "gameHistory": [
    {
      "gameId": "String",
      "role": "String (Retailer/Wholesaler/Distributor/Factory)",
      "finalCost": "Number",
      "completedAt": "Date"
    }
  ],
  "preferences": {
    "theme": "String",
    "notifications": "Boolean"
  }
}

2. Games Collection
Stores game session metadata and current state:
{
  "_id": "ObjectId",
  "gameId": "String",
  "contractAddress": "String (if blockchain enabled)",
  "createdBy": "ObjectId (ref: Users)",
  "createdAt": "Date",
  "status": "String (Setup/Active/Completed)",
  "configuration": {
    "orderDelay": "Number",
    "shippingDelay": "Number",
    "demandPattern": "String (Constant/Step/Random)",
    "initialInventory": "Number",
    "blockchainEnabled": "Boolean"
  },
  "currentWeek": "Number",
  "players": [
    {
      "userId": "ObjectId (ref: Users)",
      "role": "String",
      "joined": "Date",
      "isActive": "Boolean"
    }
  ],
  "customerDemand": [
    {
      "week": "Number",
      "quantity": "Number"
    }
  ]
}

3. GameState Collection
Stores the dynamic state of each game session:
{
  "_id": "ObjectId",
  "gameId": "String (ref: Games._id)",
  "week": "Number",
  "playerStates": {
    "retailer": {
      "inventory": "Number",
      "backlog": "Number",
      "incomingOrders": "Number",
      "outgoingOrders": "Number",
      "currentCost": "Number"
    },
    "wholesaler": { /* Same structure as retailer */ },
    "distributor": { /* Same structure as retailer */ },
    "factory": { /* Same structure as retailer */ }
  },
  "pendingActions": [
    {
      "playerId": "ObjectId",
      "actionType": "String",
      "completed": "Boolean"
    }
  ],
  "lastUpdated": "Date"
}

4. Orders Collection
Tracks all orders placed during the game:
{
  "_id": "ObjectId",
  "gameId": "String (ref: Games._id)",
  "week": "Number",
  "sender": {
    "role": "String",
    "userId": "ObjectId (ref: Users)"
  },
  "recipient": {
    "role": "String",
    "userId": "ObjectId (ref: Users)"
  },
  "quantity": "Number",
  "status": "String (Pending/Shipped/Delivered)",
  "placedAt": "Date",
  "deliveryWeek": "Number (calculated)",
  "blockchainData": {
    "transactionHash": "String",
    "blockNumber": "Number",
    "confirmed": "Boolean"
  }
}

5. Analytics Collection
Stores aggregated game data for analysis:
{
  "_id": "ObjectId",
  "gameId": "String (ref: Games._id)",
  "completedAt": "Date",
  "duration": "Number (weeks)",
  "playerPerformance": {
    "retailer": {
      "totalCost": "Number",
      "averageInventory": "Number",
      "orderVariability": "Number"
    },
    "wholesaler": { /* Same structure as retailer */ },
    "distributor": { /* Same structure as retailer */ },
    "factory": { /* Same structure as retailer */ }
  },
  "bullwhipMetrics": {
    "demandAmplification": "Number",
    "orderVarianceRatio": "Number"
  },
  "blockchainMetrics": {
    "transactionsSubmitted": "Number",
    "transactionsConfirmed": "Number",
    "averageConfirmationTime": "Number"
  }
}

 
Indexing Strategy
To optimize query performance:
1.	Primary Indexes:
o	Users: _id, email, walletAddress
o	Games: _id, gameId, status
o	GameState: gameId + week (compound)
o	Orders: gameId + week + sender.role + recipient.role (compound)
2.	Secondary Indexes:
o	Games.players.userId for quick lookup of a user's games
o	Orders.blockchainData.transactionHash for blockchain transaction verification
o	GameState.lastUpdated for finding recently updated games
3.	Text Indexes:
o	Users.username for player search functionality
 
Data Synchronization
1. Blockchain Synchronization
The database maintains a relationship with blockchain data:
•	Transaction Mapping: Each order in the database includes blockchain transaction details.
•	Verification Status: Orders track whether they've been confirmed on the blockchain.
•	Reconciliation Process: A scheduled job compares database state with blockchain state to ensure consistency.
2. Real-time Updates
To support WebSocket-based real-time updates:
•	Change Streams: MongoDB change streams monitor for updates to game state.
•	Optimistic Updates: Database is updated immediately, then confirmed when blockchain transactions are verified.
 
Data Access Patterns
1. Game Initialization
•	Create new game document in Games collection
•	Initialize first week in GameState collection
•	Generate customer demand pattern
2. Player Actions
•	Read current game state from GameState collection
•	Update Orders collection when orders are placed
•	Update GameState collection when inventory changes
3. Analytics Queries
•	Aggregate data across multiple collections for comprehensive game analysis
•	Calculate bullwhip effect metrics by comparing order variability across roles
 
Data Retention and Backup
1.	Retention Policy:
o	Active games: Retained indefinitely
o	Completed games: Retained for 90 days in primary storage
o	Historical data: Archived after 90 days
2.	Backup Strategy:
o	Daily backups of the entire database
o	Point-in-time recovery capability
o	Geo-redundant storage for disaster recovery
 
Integration Points
Backend Server Integration
•	The backend server uses Mongoose ODM (Object Document Mapper) to interact with MongoDB
•	Transactions ensure data consistency for multi-document operations
•	Connection pooling optimizes database performance
Blockchain Integration
•	Database stores references to blockchain transactions
•	Serves as a cache and query layer on top of blockchain data
•	Provides faster access to historical data than direct blockchain queries
