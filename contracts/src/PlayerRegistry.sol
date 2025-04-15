// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @title PlayerRegistry
 * @dev Contract for managing player identities and role assignments
 */
contract PlayerRegistry {
    // Enum for player roles in the supply chain
    enum Role {
        None,
        Retailer,
        Wholesaler,
        Distributor,
        Factory
    }
    
    // Player structure
    struct Player {
        address playerAddress;
        string username;
        uint256 gamesPlayed;
        bool registered;
    }
    
    // Game-specific player data
    struct GamePlayer {
        address playerAddress;
        Role role;
        uint256 joinedAt;
        bool active;
    }
    
    // Mapping from address to Player
    mapping(address => Player) public players;
    
    // Mapping from gameId to player address to GamePlayer
    mapping(string => mapping(address => GamePlayer)) public gamePlayers;
    
    // Mapping from gameId to role to player address
    mapping(string => mapping(Role => address)) public gameRoles;
    
    // Events
    event PlayerRegistered(address playerAddress, string username);
    event PlayerRoleAssigned(string gameId, address playerAddress, Role role);
    event PlayerRoleRevoked(string gameId, address playerAddress, Role role);
    
    /**
     * @dev Register a new player
     * @param _username Username for the player
     */
    function registerPlayer(string memory _username) public {
        require(!players[msg.sender].registered, "Player already registered");
        
        players[msg.sender] = Player({
            playerAddress: msg.sender,
            username: _username,
            gamesPlayed: 0,
            registered: true
        });
        
        emit PlayerRegistered(msg.sender, _username);
    }
    
    /**
     * @dev Assign a role to a player in a specific game
     * @param _gameId ID of the game
     * @param _player Address of the player
     * @param _role Role to assign
     */
    function assignRole(string memory _gameId, address _player, Role _role) public {
        // Ensure the player is registered
        require(players[_player].registered, "Player not registered");
        
        // Ensure the role is valid (not None)
        require(_role != Role.None, "Invalid role");
        
        // Ensure the role is not already assigned in this game
        require(gameRoles[_gameId][_role] == address(0), "Role already assigned");
        
        // Ensure the player doesn't already have a role in this game
        require(gamePlayers[_gameId][_player].role == Role.None, "Player already has a role");
        
        // Assign the role
        gamePlayers[_gameId][_player] = GamePlayer({
            playerAddress: _player,
            role: _role,
            joinedAt: block.timestamp,
            active: true
        });
        
        // Map the role to the player
        gameRoles[_gameId][_role] = _player;
        
        // Increment games played counter
        players[_player].gamesPlayed++;
        
        emit PlayerRoleAssigned(_gameId, _player, _role);
    }
    
    /**
     * @dev Revoke a player's role in a specific game
     * @param _gameId ID of the game
     * @param _player Address of the player
     */
    function revokeRole(string memory _gameId, address _player) public {
        // Ensure the player has a role in this game
        require(gamePlayers[_gameId][_player].role != Role.None, "Player has no role");
        
        // Store the role before removing it
        Role role = gamePlayers[_gameId][_player].role;
        
        // Clear the role mapping
        gameRoles[_gameId][role] = address(0);
        
        // Set the player's role to None and mark as inactive
        gamePlayers[_gameId][_player].role = Role.None;
        gamePlayers[_gameId][_player].active = false;
        
        emit PlayerRoleRevoked(_gameId, _player, role);
    }
    
    /**
     * @dev Get player details
     * @param _player Address of the player
     * @return username The player's username
     * @return gamesPlayed Number of games the player has participated in
     * @return registered Whether the player is registered
     */
    function getPlayerDetails(address _player) public view returns (
        string memory username,
        uint256 gamesPlayed,
        bool registered
    ) {
        Player storage player = players[_player];
        return (player.username, player.gamesPlayed, player.registered);
    }
    
    /**
     * @dev Get player's role in a specific game
     * @param _gameId ID of the game
     * @param _player Address of the player
     * @return The player's role
     */
    function getPlayerRole(string memory _gameId, address _player) public view returns (Role) {
        return gamePlayers[_gameId][_player].role;
    }
    
    /**
     * @dev Get address of the player with a specific role in a game
     * @param _gameId ID of the game
     * @param _role Role to lookup
     * @return Address of the player with that role
     */
    function getPlayerByRole(string memory _gameId, Role _role) public view returns (address) {
        return gameRoles[_gameId][_role];
    }
    
    /**
     * @dev Check if all roles are assigned in a game
     * @param _gameId ID of the game
     * @return True if all roles are assigned
     */
    function allRolesAssigned(string memory _gameId) public view returns (bool) {
        return (
            gameRoles[_gameId][Role.Retailer] != address(0) &&
            gameRoles[_gameId][Role.Wholesaler] != address(0) &&
            gameRoles[_gameId][Role.Distributor] != address(0) &&
            gameRoles[_gameId][Role.Factory] != address(0)
        );
    }
} 