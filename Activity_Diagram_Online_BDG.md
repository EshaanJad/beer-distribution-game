@startuml Activity Diagram: Place Order

|Frontend|
start
:Player enters order quantity;
:Player clicks 'Place Order';
:Send Order Request (API Call);

|Backend Server|
:Receive Order Request (via API Gateway);
:Authenticate Request (AuthService);
:Validate Order Data (GameCoordinator);
:Update Database: Create Order (Status: Pending) (DB Interface);

if (Game is Blockchain Enabled?) then (yes)
  |Backend Server|
  :Submit Transaction to Blockchain (BlockchainService -> Web3);
  |Blockchain|
  :Smart Contract processes placeOrder();
  :Emit OrderPlaced Event;
  |Backend Server|
  :Listen for OrderPlaced Event (BlockchainService);
  :Receive Event Confirmation;
  :Update Database: Order (Status: Confirmed, add TxHash) (DB Interface);
  :Prepare Confirmation Update;
else (no)
  |Backend Server|
  note right: Blockchain steps skipped
  :Prepare Success Update;
endif

|Backend Server|
:Send Real-time Update (WebSocket Server);

|Frontend|
:Receive WebSocket Update;
:Update UI (Show Order Pending/Confirmed);
stop

@enduml
