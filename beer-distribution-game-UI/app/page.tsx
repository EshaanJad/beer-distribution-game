import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowRight, Users, UserPlus, Info } from 'lucide-react'
import Link from "next/link"

export default function LandingPage() {
return (
  <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white text-gray-800">
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600 mb-4">
          Beer Distribution Game 🍻
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Experience the dynamics of supply chain management in this interactive simulation
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
        <Card className="border border-gray-200 bg-white shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-8 flex flex-col items-center text-center">
            <UserPlus className="w-16 h-16 text-purple-600 mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Create Game</h2>
            <p className="text-gray-600 mb-6">
              Host a new game session for your class or team. Configure game settings and invite players.
            </p>
            <Link href="/create-game" className="w-full">
              <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white">
                Create Game
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 bg-white shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-8 flex flex-col items-center text-center">
            <Users className="w-16 h-16 text-blue-600 mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Join Game</h2>
            <p className="text-gray-600 mb-6">
              Join an existing game session using a game code provided by your instructor or host.
            </p>
            <Link href="/join-game" className="w-full">
              <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
                Join Game
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-gray-200 bg-white shadow-md max-w-4xl mx-auto">
        <CardContent className="p-8">
          <div className="flex items-start mb-4">
            <Info className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">About the Game</h3>
              <p className="text-gray-600 mb-4">
                The Beer Distribution Game is a simulation that demonstrates key principles of supply chain
                management, including the bullwhip effect, information delay, and the importance of coordination.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h4 className="font-bold text-gray-800 mb-2">How to Play</h4>
              <ol className="list-decimal list-inside text-gray-600 space-y-2">
                <li>Join a game or create your own</li>
                <li>Select your role in the supply chain</li>
                <li>Manage inventory and place orders 🍺</li>
                <li>Minimize costs while meeting customer demand</li>
                <li>Analyze results and learn from the experience</li>
              </ol>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h4 className="font-bold text-gray-800 mb-2">Roles</h4>
              <ul className="text-gray-600 space-y-2">
                <li className="flex items-center">
                  <span className="w-3 h-3 rounded-full bg-green-600 mr-2"></span>
                  <span>
                    <strong>Retailer:</strong> Fulfills customer orders
                  </span>
                </li>
                <li className="flex items-center">
                  <span className="w-3 h-3 rounded-full bg-blue-600 mr-2"></span>
                  <span>
                    <strong>Wholesaler:</strong> Supplies retailers
                  </span>
                </li>
                <li className="flex items-center">
                  <span className="w-3 h-3 rounded-full bg-purple-600 mr-2"></span>
                  <span>
                    <strong>Distributor:</strong> Supplies wholesalers
                  </span>
                </li>
                <li className="flex items-center">
                  <span className="w-3 h-3 rounded-full bg-orange-600 mr-2"></span>
                  <span>
                    <strong>Factory:</strong> Manufactures products
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-bold text-blue-800 mb-2">Learning Objectives</h4>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>Understand the bullwhip effect in supply chains</li>
              <li>Experience the impact of information delays</li>
              <li>Learn strategies for inventory management</li>
              <li>Develop coordination skills in a distributed system</li>
              <li>Analyze data to improve decision-making</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  </main>
)
}
