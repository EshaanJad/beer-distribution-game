@startuml Use Case Diagram

left to right direction

actor Player
actor Host as "Host/Instructor"

rectangle "Beer Distribution Game System" {
  usecase "Authenticate" as UC_Auth
  usecase "Connect Wallet" as UC_Wallet
  usecase "Create Game" as UC_Create
  usecase "Join Game" as UC_Join
  usecase "View Game Dashboard" as UC_ViewDash
  usecase "Place Order" as UC_PlaceOrder
  usecase "View Analytics" as UC_ViewAnalytics
  usecase "Configure Game (Blockchain Optional)" as UC_Configure
  usecase "Manage Game Session" as UC_Manage
}

Player -- UC_Auth
Player -- UC_Wallet
Player -- UC_Join
Player -- UC_ViewDash
Player -- UC_PlaceOrder
Player -- UC_ViewAnalytics

Host -- UC_Auth
Host -- UC_Create
Host -- UC_Configure
Host -- UC_Manage

UC_Create ..> UC_Configure : <<include>>
UC_Join ..> UC_Wallet : <<include>> (if blockchain)
UC_PlaceOrder ..> UC_Wallet : <<include>> (if blockchain)
UC_Auth <.. UC_Wallet : <<extend>> (Wallet auth option)

@enduml
