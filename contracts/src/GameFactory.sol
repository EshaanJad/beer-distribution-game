// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./GameInstance.sol";
import "./PlayerRegistry.sol";

/**
 * @title GameFactory
 * @dev Contract for creating and managing Beer Distribution Game instances
 */
contract GameFactory {
    // Structure to store basic game information
    struct GameInfo {
        address contractAddress;
        string gameId;
        address creator;
        uint256 createdAt;
        bool active;
    }

    // Mapping from string gameId to GameInfo
    mapping(string => GameInfo) public games;
    
    // Array to keep track of all game IDs
    string[] public gameIds;
    
    // Reference to PlayerRegistry
    PlayerRegistry public playerRegistry;
    
    // Events
    event GameCreated(string gameId, address gameAddress, address creator);
    event GameStatusUpdated(string gameId, bool active);
    
    /**
     * @dev Constructor initializes with a PlayerRegistry
     * @param _playerRegistryAddress Address of the PlayerRegistry contract
     */
    constructor(address _playerRegistryAddress) {
        playerRegistry = PlayerRegistry(_playerRegistryAddress);
    }
    
    /**
     * @dev Creates a new game instance
     * @param _gameId Unique identifier for the game
     * @param _orderDelay Delay period for orders in weeks
     * @param _shippingDelay Delay period for shipments in weeks
     * @param _demandPattern Type of customer demand pattern (0=Constant, 1=Step, 2=Random)
     * @param _initialInventory Starting inventory for all players
     * @return Address of the newly created game contract
     */
    function createGame(
        string memory _gameId,
        uint8 _orderDelay,
        uint8 _shippingDelay,
        uint8 _demandPattern,
        uint256 _initialInventory
    ) public returns (address) {
        // Ensure game ID is unique
        require(games[_gameId].contractAddress == address(0), "Game ID already exists");
        
        // Create a new game instance contract
        GameInstance newGame = new GameInstance(
            _gameId,
            _orderDelay,
            _shippingDelay,
            _demandPattern,
            _initialInventory,
            address(playerRegistry),
            msg.sender
        );
        
        // Store the game information
        games[_gameId] = GameInfo({
            contractAddress: address(newGame),
            gameId: _gameId,
            creator: msg.sender,
            createdAt: block.timestamp,
            active: true
        });
        
        // Add to the list of game IDs
        gameIds.push(_gameId);
        
        // Emit event
        emit GameCreated(_gameId, address(newGame), msg.sender);
        
        return address(newGame);
    }
    
    /**
     * @dev Updates the status of a game (active/inactive)
     * @param _gameId The ID of the game to update
     * @param _active New status
     */
    function setGameStatus(string memory _gameId, bool _active) public {
        // Ensure game exists
        require(games[_gameId].contractAddress != address(0), "Game does not exist");
        
        // Ensure caller is the game creator or the game contract itself
        require(
            msg.sender == games[_gameId].creator || 
            msg.sender == games[_gameId].contractAddress,
            "Only creator or game contract can update status"
        );
        
        games[_gameId].active = _active;
        
        emit GameStatusUpdated(_gameId, _active);
    }
    
    /**
     * @dev Returns the address of a game by ID
     * @param _gameId The game ID to lookup
     * @return The address of the game contract
     */
    function getGameAddress(string memory _gameId) public view returns (address) {
        return games[_gameId].contractAddress;
    }
    
    /**
     * @dev Returns the number of games created
     * @return The total number of games
     */
    function getGameCount() public view returns (uint256) {
        return gameIds.length;
    }
    
    /**
     * @dev Returns active games
     * @param _start Starting index
     * @param _count Number of games to return
     * @return Array of active game IDs
     */
    function getActiveGames(uint256 _start, uint256 _count) public view returns (string[] memory) {
        require(_start < gameIds.length, "Start index out of bounds");
        
        // Determine how many games to return
        uint256 count = _count;
        if (_start + _count > gameIds.length) {
            count = gameIds.length - _start;
        }
        
        // Count active games in the range
        uint256 activeCount = 0;
        for (uint256 i = _start; i < _start + count; i++) {
            if (games[gameIds[i]].active) {
                activeCount++;
            }
        }
        
        // Populate the result array
        string[] memory result = new string[](activeCount);
        uint256 resultIndex = 0;
        
        for (uint256 i = _start; i < _start + count; i++) {
            if (games[gameIds[i]].active) {
                result[resultIndex] = gameIds[i];
                resultIndex++;
            }
        }
        
        return result;
    }
} 