// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./PlayerRegistry.sol";

/**
 * @title GameInstance
 * @dev Contract for a single instance of the Beer Distribution Game
 */
contract GameInstance {
    // Enum for order status
    enum OrderStatus {
        Pending,
        Shipped,
        Delivered,
        Cancelled
    }
    
    // Order structure
    struct Order {
        uint256 orderId;
        PlayerRegistry.Role sender;
        PlayerRegistry.Role recipient;
        uint256 quantity;
        uint256 placedWeek;
        uint256 deliveryWeek;
        OrderStatus status;
    }
    
    // Player inventory and state
    struct PlayerState {
        uint256 inventory;
        uint256 backlog;
        uint256 incomingOrders;
        uint256 outgoingOrders;
        uint256 totalCost;
        bool active;
    }
    
    // Game configuration
    string public gameId;
    address public creator;
    uint8 public orderDelay;
    uint8 public shippingDelay;
    uint8 public demandPattern;
    uint256 public initialInventory;
    uint256 public currentWeek;
    bool public gameStarted;
    bool public gameEnded;
    uint256 public startTime;
    uint256 public endTime;
    
    // Constants for cost calculation
    uint256 public constant HOLDING_COST = 1;
    uint256 public constant BACKLOG_COST = 2;
    
    // Reference to player registry
    PlayerRegistry public playerRegistry;
    
    // Mappings
    mapping(PlayerRegistry.Role => PlayerState) public playerStates;
    mapping(uint256 => uint256) public customerDemand;
    mapping(uint256 => Order[]) public weeklyOrders;
    mapping(uint256 => mapping(PlayerRegistry.Role => mapping(uint256 => uint256))) public shipmentPipeline;
    mapping(uint256 => mapping(PlayerRegistry.Role => mapping(uint256 => uint256))) public orderPipeline;
    
    // Order counter
    uint256 private orderCounter;
    
    // Events
    event GameStarted(string gameId, uint256 week, uint256 timestamp);
    event GameEnded(string gameId, uint256 finalWeek, uint256 timestamp);
    event WeekAdvanced(string gameId, uint256 newWeek);
    event OrderPlaced(uint256 indexed orderId, string gameId, PlayerRegistry.Role sender, PlayerRegistry.Role recipient, uint256 quantity);
    event OrderShipped(uint256 indexed orderId, string gameId, uint256 week);
    event OrderDelivered(uint256 indexed orderId, string gameId, uint256 week);
    event InventoryUpdated(string gameId, PlayerRegistry.Role role, uint256 week, uint256 inventory, uint256 backlog);
    event CostIncurred(string gameId, PlayerRegistry.Role role, uint256 week, uint256 holdingCost, uint256 backlogCost);
    
    /**
     * @dev Constructor to initialize a new game
     * @param _gameId Unique identifier for the game
     * @param _orderDelay Delay period for orders in weeks
     * @param _shippingDelay Delay period for shipments in weeks
     * @param _demandPattern Type of customer demand pattern
     * @param _initialInventory Starting inventory for all players
     * @param _playerRegistryAddress Address of the PlayerRegistry contract
     * @param _creator Address of the game creator
     */
    constructor(
        string memory _gameId,
        uint8 _orderDelay,
        uint8 _shippingDelay,
        uint8 _demandPattern,
        uint256 _initialInventory,
        address _playerRegistryAddress,
        address _creator
    ) {
        gameId = _gameId;
        creator = _creator;
        orderDelay = _orderDelay;
        shippingDelay = _shippingDelay;
        demandPattern = _demandPattern;
        initialInventory = _initialInventory;
        currentWeek = 0;
        gameStarted = false;
        gameEnded = false;
        playerRegistry = PlayerRegistry(_playerRegistryAddress);
        orderCounter = 0;
        
        // Initialize player states
        playerStates[PlayerRegistry.Role.Retailer] = PlayerState({
            inventory: _initialInventory,
            backlog: 0,
            incomingOrders: 0,
            outgoingOrders: 0,
            totalCost: 0,
            active: false
        });
        
        playerStates[PlayerRegistry.Role.Wholesaler] = PlayerState({
            inventory: _initialInventory,
            backlog: 0,
            incomingOrders: 0,
            outgoingOrders: 0,
            totalCost: 0,
            active: false
        });
        
        playerStates[PlayerRegistry.Role.Distributor] = PlayerState({
            inventory: _initialInventory,
            backlog: 0,
            incomingOrders: 0,
            outgoingOrders: 0,
            totalCost: 0,
            active: false
        });
        
        playerStates[PlayerRegistry.Role.Factory] = PlayerState({
            inventory: _initialInventory,
            backlog: 0,
            incomingOrders: 0,
            outgoingOrders: 0,
            totalCost: 0,
            active: false
        });
        
        // Initialize customer demand for first 20 weeks based on pattern
        initializeCustomerDemand();
    }
    
    /**
     * @dev Initialize customer demand based on the selected pattern
     */
    function initializeCustomerDemand() private {
        uint256 numWeeks = 20; // Pre-generate demand for 20 weeks
        
        if (demandPattern == 0) { // Constant
            for (uint256 i = 0; i < numWeeks; i++) {
                customerDemand[i] = 4;
            }
        } else if (demandPattern == 1) { // Step Increase
            for (uint256 i = 0; i < numWeeks; i++) {
                if (i < 4) {
                    customerDemand[i] = 4;
                } else {
                    customerDemand[i] = 8;
                }
            }
        } else if (demandPattern == 2) { // Random
            // Pseudo-random values - not truly random but sufficient for the game
            bytes32 seed = keccak256(abi.encodePacked(block.timestamp, block.difficulty, gameId));
            for (uint256 i = 0; i < numWeeks; i++) {
                uint256 random = uint256(keccak256(abi.encodePacked(seed, i))) % 5 + 2; // 2-6
                customerDemand[i] = random;
            }
        } else {
            // Default to constant demand
            for (uint256 i = 0; i < numWeeks; i++) {
                customerDemand[i] = 4;
            }
        }
    }
    
    /**
     * @dev Start the game
     */
    function startGame() public {
        require(!gameStarted, "Game already started");
        require(playerRegistry.allRolesAssigned(gameId), "Not all roles assigned");
        require(msg.sender == creator, "Only creator can start game");
        
        gameStarted = true;
        startTime = block.timestamp;
        
        // Mark all players as active
        playerStates[PlayerRegistry.Role.Retailer].active = true;
        playerStates[PlayerRegistry.Role.Wholesaler].active = true;
        playerStates[PlayerRegistry.Role.Distributor].active = true;
        playerStates[PlayerRegistry.Role.Factory].active = true;
        
        emit GameStarted(gameId, currentWeek, block.timestamp);
    }
    
    /**
     * @dev End the game
     */
    function endGame() public {
        require(gameStarted, "Game not started");
        require(!gameEnded, "Game already ended");
        require(msg.sender == creator, "Only creator can end game");
        
        gameEnded = true;
        endTime = block.timestamp;
        
        emit GameEnded(gameId, currentWeek, block.timestamp);
    }
    
    /**
     * @dev Place an order from one role to another
     * @param _senderRole Role placing the order
     * @param _recipientRole Role receiving the order
     * @param _quantity Quantity of beer being ordered
     * @return ID of the created order
     */
    function placeOrder(
        PlayerRegistry.Role _senderRole,
        PlayerRegistry.Role _recipientRole,
        uint256 _quantity
    ) public returns (uint256) {
        require(gameStarted && !gameEnded, "Game not active");
        require(_quantity > 0, "Quantity must be positive");
        require(isValidOrderFlow(_senderRole, _recipientRole), "Invalid order flow");
        
        // Verify the sender is the caller or the creator
        address senderAddress = playerRegistry.getPlayerByRole(gameId, _senderRole);
        require(msg.sender == senderAddress || msg.sender == creator, "Not authorized to place this order");
        
        // Update order counter
        orderCounter++;
        
        // Create the order
        Order memory newOrder = Order({
            orderId: orderCounter,
            sender: _senderRole,
            recipient: _recipientRole,
            quantity: _quantity,
            placedWeek: currentWeek,
            deliveryWeek: currentWeek + orderDelay, // When the order will be received by recipient
            status: OrderStatus.Pending
        });
        
        // Add order to weekly orders
        weeklyOrders[currentWeek].push(newOrder);
        
        // Add order to recipient's order pipeline
        // When order delay is 0, use index 0
        uint256 pipelineIndex = orderDelay > 0 ? orderDelay : 0;
        orderPipeline[currentWeek][_recipientRole][pipelineIndex] += _quantity;
        
        // Update player state
        playerStates[_senderRole].outgoingOrders += _quantity;
        
        emit OrderPlaced(orderCounter, gameId, _senderRole, _recipientRole, _quantity);
        
        return orderCounter;
    }
    
    /**
     * @dev Process customer order (special case for Retailer)
     * @param _week Week to process customer order for
     */
    function processCustomerOrder(uint256 _week) public {
        require(gameStarted && !gameEnded, "Game not active");
        require(_week == currentWeek, "Can only process current week");
        require(msg.sender == creator, "Only creator can process customer orders");
        
        uint256 demand = customerDemand[_week];
        PlayerState storage retailerState = playerStates[PlayerRegistry.Role.Retailer];
        
        // Process existing backlog first
        uint256 totalDemand = retailerState.backlog + demand;
        
        // Fulfill as much as possible from inventory
        uint256 fulfilled = 0;
        if (retailerState.inventory >= totalDemand) {
            fulfilled = totalDemand;
            retailerState.inventory -= totalDemand;
            retailerState.backlog = 0;
        } else {
            fulfilled = retailerState.inventory;
            retailerState.backlog = totalDemand - fulfilled;
            retailerState.inventory = 0;
        }
        
        // Update retailer's incoming orders
        retailerState.incomingOrders += demand;
        
        emit InventoryUpdated(gameId, PlayerRegistry.Role.Retailer, _week, retailerState.inventory, retailerState.backlog);
    }
    
    /**
     * @dev Advance to the next week
     */
    function advanceWeek() public {
        require(gameStarted && !gameEnded, "Game not active");
        require(msg.sender == creator, "Only creator can advance week");
        
        // Process all shipments and orders in the pipeline
        processShipments();
        processOrders();
        
        // Calculate costs for all players
        calculateCosts();
        
        // Increment week counter
        currentWeek++;
        
        emit WeekAdvanced(gameId, currentWeek);
    }
    
    /**
     * @dev Process all shipments in the pipeline
     */
    function processShipments() private {
        // Process shipments for each role
        processRoleShipments(PlayerRegistry.Role.Retailer);
        processRoleShipments(PlayerRegistry.Role.Wholesaler);
        processRoleShipments(PlayerRegistry.Role.Distributor);
        processRoleShipments(PlayerRegistry.Role.Factory);
    }
    
    /**
     * @dev Process shipments for a specific role
     * @param _role Role to process shipments for
     */
    function processRoleShipments(PlayerRegistry.Role _role) private {
        PlayerState storage state = playerStates[_role];
        
        // Process incoming shipments
        uint256 arrivingShipment = shipmentPipeline[currentWeek][_role][0];
        if (arrivingShipment > 0) {
            // Add shipment to inventory
            state.inventory += arrivingShipment;
            
            // Try to fulfill backlog
            if (state.backlog > 0) {
                if (state.inventory >= state.backlog) {
                    state.inventory -= state.backlog;
                    state.backlog = 0;
                } else {
                    state.backlog -= state.inventory;
                    state.inventory = 0;
                }
            }
            
            emit InventoryUpdated(gameId, _role, currentWeek, state.inventory, state.backlog);
        }
        
        // Shift shipment pipeline depending on shipping delay
        if (shippingDelay > 1) {
            // For shipping delay > 1, shift all entries left
            for (uint256 i = 0; i < shippingDelay - 1; i++) {
                shipmentPipeline[currentWeek][_role][i] = shipmentPipeline[currentWeek][_role][i + 1];
            }
            // Clear the last position
            shipmentPipeline[currentWeek][_role][shippingDelay - 1] = 0;
        } else if (shippingDelay == 1) {
            // For shipping delay of 1, just reset the only slot after processing
            shipmentPipeline[currentWeek][_role][0] = 0;
        }
    }
    
    /**
     * @dev Process all orders in the pipeline
     */
    function processOrders() private {
        // Process factory production (special case)
        processFactoryProduction();
        
        // Process orders for each role
        processRoleOrders(PlayerRegistry.Role.Wholesaler);
        processRoleOrders(PlayerRegistry.Role.Distributor);
        processRoleOrders(PlayerRegistry.Role.Factory);
    }
    
    /**
     * @dev Process orders for a specific role
     * @param _role Role to process orders for
     */
    function processRoleOrders(PlayerRegistry.Role _role) private {
        PlayerState storage state = playerStates[_role];
        
        // Get incoming orders for this week
        uint256 newOrders = orderPipeline[currentWeek][_role][0];
        if (newOrders > 0) {
            state.incomingOrders += newOrders;
            
            // Try to fulfill the new orders plus any backlog
            uint256 totalToFulfill = newOrders + state.backlog;
            
            if (state.inventory >= totalToFulfill) {
                // Ship all orders
                shipOrdersFromRole(_role, totalToFulfill);
                state.inventory -= totalToFulfill;
                state.backlog = 0;
            } else {
                // Ship what we can
                shipOrdersFromRole(_role, state.inventory);
                state.backlog = totalToFulfill - state.inventory;
                state.inventory = 0;
            }
            
            emit InventoryUpdated(gameId, _role, currentWeek, state.inventory, state.backlog);
        }
        
        // Shift order pipeline if order delay > 0
        if (orderDelay > 0) {
            for (uint256 i = 0; i < orderDelay - 1; i++) {
                orderPipeline[currentWeek][_role][i] = orderPipeline[currentWeek][_role][i + 1];
            }
            orderPipeline[currentWeek][_role][orderDelay - 1] = 0;
        } else {
            // For order delay of 0, just reset the slot
            orderPipeline[currentWeek][_role][0] = 0;
        }
    }
    
    /**
     * @dev Handle factory production (Factory can produce without limits)
     */
    function processFactoryProduction() private {
        PlayerState storage factory = playerStates[PlayerRegistry.Role.Factory];
        
        // Factory can produce as much as it needs to fulfill all orders
        uint256 newOrders = orderPipeline[currentWeek][PlayerRegistry.Role.Factory][0];
        uint256 totalToFulfill = newOrders + factory.backlog;
        
        // Factory produces and ships all orders
        if (totalToFulfill > 0) {
            factory.incomingOrders += newOrders;
            shipOrdersFromRole(PlayerRegistry.Role.Factory, totalToFulfill);
            factory.backlog = 0;
            
            emit InventoryUpdated(
                gameId, 
                PlayerRegistry.Role.Factory, 
                currentWeek, 
                factory.inventory, 
                factory.backlog
            );
        }
        
        // Shift order pipeline if order delay > 0
        if (orderDelay > 0) {
            for (uint256 i = 0; i < orderDelay - 1; i++) {
                orderPipeline[currentWeek][PlayerRegistry.Role.Factory][i] = 
                    orderPipeline[currentWeek][PlayerRegistry.Role.Factory][i + 1];
            }
            orderPipeline[currentWeek][PlayerRegistry.Role.Factory][orderDelay - 1] = 0;
        } else {
            // For order delay of 0, just reset the slot
            orderPipeline[currentWeek][PlayerRegistry.Role.Factory][0] = 0;
        }
    }
    
    /**
     * @dev Ship orders from a role to its downstream customer
     * @param _fromRole Role shipping the orders
     * @param _quantity Quantity to ship
     */
    function shipOrdersFromRole(PlayerRegistry.Role _fromRole, uint256 _quantity) private {
        // Determine recipient role
        PlayerRegistry.Role toRole;
        if (_fromRole == PlayerRegistry.Role.Factory) {
            toRole = PlayerRegistry.Role.Distributor;
        } else if (_fromRole == PlayerRegistry.Role.Distributor) {
            toRole = PlayerRegistry.Role.Wholesaler;
        } else if (_fromRole == PlayerRegistry.Role.Wholesaler) {
            toRole = PlayerRegistry.Role.Retailer;
        } else {
            // Retailer ships to customers (outside the system)
            return;
        }
        
        // Add shipment to pipeline, ensuring we don't go out of bounds
        // When shipping delay is 1, we need to store at index 0
        uint256 pipelineIndex = shippingDelay > 1 ? shippingDelay - 1 : 0;
        shipmentPipeline[currentWeek][toRole][pipelineIndex] += _quantity;
    }
    
    /**
     * @dev Calculate costs for all players
     */
    function calculateCosts() private {
        calculateRoleCosts(PlayerRegistry.Role.Retailer);
        calculateRoleCosts(PlayerRegistry.Role.Wholesaler);
        calculateRoleCosts(PlayerRegistry.Role.Distributor);
        calculateRoleCosts(PlayerRegistry.Role.Factory);
    }
    
    /**
     * @dev Calculate costs for a specific role
     * @param _role Role to calculate costs for
     */
    function calculateRoleCosts(PlayerRegistry.Role _role) private {
        PlayerState storage state = playerStates[_role];
        
        // Calculate holding cost (inventory * HOLDING_COST)
        uint256 holdingCost = state.inventory * HOLDING_COST;
        
        // Calculate backlog cost (backlog * BACKLOG_COST)
        uint256 backlogCost = state.backlog * BACKLOG_COST;
        
        // Update total cost
        state.totalCost += holdingCost + backlogCost;
        
        emit CostIncurred(gameId, _role, currentWeek, holdingCost, backlogCost);
    }
    
    /**
     * @dev Check if the order flow is valid (correct direction in supply chain)
     * @param _sender Role sending the order
     * @param _recipient Role receiving the order
     * @return True if the order flow is valid
     */
    function isValidOrderFlow(
        PlayerRegistry.Role _sender,
        PlayerRegistry.Role _recipient
    ) private pure returns (bool) {
        if (_sender == PlayerRegistry.Role.Retailer && _recipient == PlayerRegistry.Role.Wholesaler) {
            return true;
        }
        if (_sender == PlayerRegistry.Role.Wholesaler && _recipient == PlayerRegistry.Role.Distributor) {
            return true;
        }
        if (_sender == PlayerRegistry.Role.Distributor && _recipient == PlayerRegistry.Role.Factory) {
            return true;
        }
        return false;
    }
    
    /**
     * @dev Get player state for a specific role
     * @param _role Role to get state for
     * @return inventory The player's current inventory
     * @return backlog The player's current backlog
     * @return incomingOrders The player's incoming orders
     * @return outgoingOrders The player's outgoing orders
     * @return totalCost The player's accumulated costs
     */
    function getPlayerState(PlayerRegistry.Role _role) public view returns (
        uint256 inventory,
        uint256 backlog,
        uint256 incomingOrders,
        uint256 outgoingOrders,
        uint256 totalCost
    ) {
        PlayerState storage state = playerStates[_role];
        return (
            state.inventory,
            state.backlog,
            state.incomingOrders,
            state.outgoingOrders,
            state.totalCost
        );
    }
    
    /**
     * @dev Get all order IDs for a specific week
     * @param _week Week to get orders for
     * @return Array of order IDs
     */
    function getWeeklyOrderIds(uint256 _week) public view returns (uint256[] memory) {
        Order[] storage orders = weeklyOrders[_week];
        uint256[] memory orderIds = new uint256[](orders.length);
        
        for (uint256 i = 0; i < orders.length; i++) {
            orderIds[i] = orders[i].orderId;
        }
        
        return orderIds;
    }
    
    /**
     * @dev Get order details by ID
     * @param _orderId ID of the order
     * @return sender The role that placed the order
     * @return recipient The role that received the order
     * @return quantity The quantity ordered
     * @return placedWeek The week when the order was placed
     * @return deliveryWeek The expected delivery week
     * @return status The current status of the order
     */
    function getOrderDetails(uint256 _orderId) public view returns (
        PlayerRegistry.Role sender,
        PlayerRegistry.Role recipient,
        uint256 quantity,
        uint256 placedWeek,
        uint256 deliveryWeek,
        OrderStatus status
    ) {
        // Find the order
        for (uint256 week = 0; week <= currentWeek; week++) {
            Order[] storage orders = weeklyOrders[week];
            for (uint256 i = 0; i < orders.length; i++) {
                if (orders[i].orderId == _orderId) {
                    Order storage order = orders[i];
                    return (
                        order.sender,
                        order.recipient,
                        order.quantity,
                        order.placedWeek,
                        order.deliveryWeek,
                        order.status
                    );
                }
            }
        }
        
        // Order not found
        revert("Order not found");
    }
    
    /**
     * @dev Get current customer demand
     * @return The customer demand for the current week
     */
    function getCurrentCustomerDemand() public view returns (uint256) {
        return customerDemand[currentWeek];
    }
    
    /**
     * @dev Get incoming orders for a role
     * @param _role Role to get incoming orders for
     * @return Array of incoming order quantities for future weeks
     */
    function getIncomingOrdersPipeline(PlayerRegistry.Role _role) public view returns (uint256[] memory) {
        uint256[] memory pipeline = new uint256[](orderDelay);
        
        for (uint256 i = 0; i < orderDelay; i++) {
            pipeline[i] = orderPipeline[currentWeek][_role][i];
        }
        
        return pipeline;
    }
    
    /**
     * @dev Get incoming shipments for a role
     * @param _role Role to get incoming shipments for
     * @return Array of incoming shipment quantities for future weeks
     */
    function getIncomingShipmentsPipeline(PlayerRegistry.Role _role) public view returns (uint256[] memory) {
        uint256[] memory pipeline = new uint256[](shippingDelay);
        
        for (uint256 i = 0; i < shippingDelay; i++) {
            pipeline[i] = shipmentPipeline[currentWeek][_role][i];
        }
        
        return pipeline;
    }
} 