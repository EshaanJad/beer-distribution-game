"use client"

import { useEffect, useRef, useState } from "react"
import { useGame } from "./game-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  BarChart3,
  LineChart,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Waves,
  Activity,
  Zap,
  Database,
} from "lucide-react"
import Chart from "chart.js/auto"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { BlockchainLedger } from "@/components/blockchain-ledger"

interface GameAnalyticsProps {
  blockchainEnabled?: boolean
}

export function GameAnalytics({ blockchainEnabled = false }: GameAnalyticsProps) {
  const { gameState } = useGame()
  const inventoryChartRef = useRef<HTMLCanvasElement>(null)
  const backordersChartRef = useRef<HTMLCanvasElement>(null)
  const costsChartRef = useRef<HTMLCanvasElement>(null)
  const demandChartRef = useRef<HTMLCanvasElement>(null)
  const bullwhipChartRef = useRef<HTMLCanvasElement>(null)
  const inventoryChartInstance = useRef<Chart | null>(null)
  const backordersChartInstance = useRef<Chart | null>(null)
  const costsChartInstance = useRef<Chart | null>(null)
  const demandChartInstance = useRef<Chart | null>(null)
  const bullwhipChartInstance = useRef<Chart | null>(null)

  const [showBlockchainData, setShowBlockchainData] = useState(false)

  useEffect(() => {
    if (
      inventoryChartRef.current &&
      backordersChartRef.current &&
      costsChartRef.current &&
      demandChartRef.current &&
      bullwhipChartRef.current
    ) {
      // Destroy existing charts
      if (inventoryChartInstance.current) {
        inventoryChartInstance.current.destroy()
      }
      if (backordersChartInstance.current) {
        backordersChartInstance.current.destroy()
      }
      if (costsChartInstance.current) {
        costsChartInstance.current.destroy()
      }
      if (demandChartInstance.current) {
        demandChartInstance.current.destroy()
      }
      if (bullwhipChartInstance.current) {
        bullwhipChartInstance.current.destroy()
      }

      // Create labels for x-axis (weeks)
      const labels = Array.from({ length: gameState.currentWeek + 1 }, (_, i) => `Week ${i}`)

      // Create inventory chart
      const inventoryCtx = inventoryChartRef.current.getContext("2d")
      if (inventoryCtx) {
        inventoryChartInstance.current = new Chart(inventoryCtx, {
          type: "line",
          data: {
            labels,
            datasets: [
              {
                label: "Retailer Inventory",
                data: gameState.inventory.retailer,
                borderColor: "#16a34a",
                backgroundColor: "rgba(22, 163, 74, 0.1)",
                tension: 0.2,
                fill: true,
              },
              {
                label: "Wholesaler Inventory",
                data: gameState.inventory.wholesaler,
                borderColor: "#2563eb",
                backgroundColor: "rgba(37, 99, 235, 0.1)",
                tension: 0.2,
                fill: true,
              },
              {
                label: "Distributor Inventory",
                data: gameState.inventory.distributor,
                borderColor: "#9333ea",
                backgroundColor: "rgba(147, 51, 234, 0.1)",
                tension: 0.2,
                fill: true,
              },
              {
                label: "Factory Inventory",
                data: gameState.inventory.factory,
                borderColor: "#ea580c",
                backgroundColor: "rgba(234, 88, 12, 0.1)",
                tension: 0.2,
                fill: true,
              },
              // Add blockchain verified data if enabled
              ...(blockchainEnabled && showBlockchainData
                ? [
                    {
                      label: "Verified Retailer Inventory",
                      data: gameState.inventory.retailer.map((v) => v * 0.95), // Simulate slight difference
                      borderColor: "#16a34a",
                      borderDash: [5, 5],
                      backgroundColor: "rgba(0, 0, 0, 0)",
                      tension: 0.2,
                      fill: false,
                    },
                    {
                      label: "Verified Wholesaler Inventory",
                      data: gameState.inventory.wholesaler.map((v) => v * 0.97),
                      borderColor: "#2563eb",
                      borderDash: [5, 5],
                      backgroundColor: "rgba(0, 0, 0, 0)",
                      tension: 0.2,
                      fill: false,
                    },
                    {
                      label: "Verified Distributor Inventory",
                      data: gameState.inventory.distributor.map((v) => v * 0.98),
                      borderColor: "#9333ea",
                      borderDash: [5, 5],
                      backgroundColor: "rgba(0, 0, 0, 0)",
                      tension: 0.2,
                      fill: false,
                    },
                    {
                      label: "Verified Factory Inventory",
                      data: gameState.inventory.factory.map((v) => v * 0.99),
                      borderColor: "#ea580c",
                      borderDash: [5, 5],
                      backgroundColor: "rgba(0, 0, 0, 0)",
                      tension: 0.2,
                      fill: false,
                    },
                  ]
                : []),
            ],
          },
          options: {
            responsive: true,
            scales: {
              y: {
                beginAtZero: true,
                grid: {
                  color: "rgba(0, 0, 0, 0.1)",
                },
                ticks: {
                  color: "rgba(0, 0, 0, 0.7)",
                },
              },
              x: {
                grid: {
                  color: "rgba(0, 0, 0, 0.1)",
                },
                ticks: {
                  color: "rgba(0, 0, 0, 0.7)",
                },
              },
            },
            plugins: {
              legend: {
                position: "top",
                labels: {
                  color: "rgba(0, 0, 0, 0.7)",
                },
              },
              tooltip: {
                backgroundColor: "rgba(255, 255, 255, 0.9)",
                titleColor: "rgba(0, 0, 0, 0.9)",
                bodyColor: "rgba(0, 0, 0, 0.9)",
                borderColor: "rgba(0, 0, 0, 0.2)",
                borderWidth: 1,
              },
            },
          },
        })
      }

      // Create backorders chart
      const backordersCtx = backordersChartRef.current.getContext("2d")
      if (backordersCtx) {
        backordersChartInstance.current = new Chart(backordersCtx, {
          type: "line",
          data: {
            labels,
            datasets: [
              {
                label: "Retailer Backorders",
                data: gameState.backorders.retailer,
                borderColor: "#16a34a",
                backgroundColor: "rgba(22, 163, 74, 0.1)",
                tension: 0.2,
                fill: true,
              },
              {
                label: "Wholesaler Backorders",
                data: gameState.backorders.wholesaler,
                borderColor: "#2563eb",
                backgroundColor: "rgba(37, 99, 235, 0.1)",
                tension: 0.2,
                fill: true,
              },
              {
                label: "Distributor Backorders",
                data: gameState.backorders.distributor,
                borderColor: "#9333ea",
                backgroundColor: "rgba(147, 51, 234, 0.1)",
                tension: 0.2,
                fill: true,
              },
              {
                label: "Factory Backorders",
                data: gameState.backorders.factory,
                borderColor: "#ea580c",
                backgroundColor: "rgba(234, 88, 12, 0.1)",
                tension: 0.2,
                fill: true,
              },
            ],
          },
          options: {
            responsive: true,
            scales: {
              y: {
                beginAtZero: true,
                grid: {
                  color: "rgba(0, 0, 0, 0.1)",
                },
                ticks: {
                  color: "rgba(0, 0, 0, 0.7)",
                },
              },
              x: {
                grid: {
                  color: "rgba(0, 0, 0, 0.1)",
                },
                ticks: {
                  color: "rgba(0, 0, 0, 0.7)",
                },
              },
            },
            plugins: {
              legend: {
                position: "top",
                labels: {
                  color: "rgba(0, 0, 0, 0.7)",
                },
              },
              tooltip: {
                backgroundColor: "rgba(255, 255, 255, 0.9)",
                titleColor: "rgba(0, 0, 0, 0.9)",
                bodyColor: "rgba(0, 0, 0, 0.9)",
                borderColor: "rgba(0, 0, 0, 0,0,0.9)",
                bodyColor: "rgba(0, 0, 0, 0.9)",
                borderColor: "rgba(0, 0, 0, 0.2)",
                borderWidth: 1,
              },
            },
          },
        })
      }

      // Create costs chart
      const costsCtx = costsChartRef.current.getContext("2d")
      if (costsCtx) {
        costsChartInstance.current = new Chart(costsCtx, {
          type: "line",
          data: {
            labels,
            datasets: [
              {
                label: "Retailer Cumulative Costs",
                data: gameState.costs.retailer,
                borderColor: "#16a34a",
                backgroundColor: "rgba(22, 163, 74, 0.1)",
                tension: 0.2,
                fill: true,
              },
              {
                label: "Wholesaler Cumulative Costs",
                data: gameState.costs.wholesaler,
                borderColor: "#2563eb",
                backgroundColor: "rgba(37, 99, 235, 0.1)",
                tension: 0.2,
                fill: true,
              },
              {
                label: "Distributor Cumulative Costs",
                data: gameState.costs.distributor,
                borderColor: "#9333ea",
                backgroundColor: "rgba(147, 51, 234, 0.1)",
                tension: 0.2,
                fill: true,
              },
              {
                label: "Factory Cumulative Costs",
                data: gameState.costs.factory,
                borderColor: "#ea580c",
                backgroundColor: "rgba(234, 88, 12, 0.1)",
                tension: 0.2,
                fill: true,
              },
            ],
          },
          options: {
            responsive: true,
            scales: {
              y: {
                beginAtZero: true,
                grid: {
                  color: "rgba(0, 0, 0, 0.1)",
                },
                ticks: {
                  color: "rgba(0, 0, 0, 0.7)",
                },
              },
              x: {
                grid: {
                  color: "rgba(0, 0, 0, 0.1)",
                },
                ticks: {
                  color: "rgba(0, 0, 0, 0.7)",
                },
              },
            },
            plugins: {
              legend: {
                position: "top",
                labels: {
                  color: "rgba(0, 0, 0, 0.7)",
                },
              },
              tooltip: {
                backgroundColor: "rgba(255, 255, 255, 0.9)",
                titleColor: "rgba(0, 0, 0, 0.9)",
                bodyColor: "rgba(0, 0, 0, 0.9)",
                borderColor: "rgba(0, 0, 0, 0.2)",
                borderWidth: 1,
              },
            },
          },
        })
      }

      // Create customer demand chart
      const demandCtx = demandChartRef.current.getContext("2d")
      if (demandCtx) {
        demandChartInstance.current = new Chart(demandCtx, {
          type: "bar",
          data: {
            labels,
            datasets: [
              {
                label: "Customer Demand",
                data: gameState.customerDemand,
                backgroundColor: "rgba(219, 39, 119, 0.7)",
                borderColor: "#db2777",
                borderWidth: 1,
              },
              // Add blockchain verified data if enabled
              ...(blockchainEnabled && showBlockchainData
                ? [
                    {
                      label: "Verified Orders",
                      data: gameState.customerDemand.map((v) => v * 0.96), // Simulate slight difference
                      backgroundColor: "rgba(147, 51, 234, 0.7)",
                      borderColor: "#9333ea",
                      borderWidth: 1,
                    },
                  ]
                : []),
            ],
          },
          options: {
            responsive: true,
            scales: {
              y: {
                beginAtZero: true,
                grid: {
                  color: "rgba(0, 0, 0, 0.1)",
                },
                ticks: {
                  color: "rgba(0, 0, 0, 0.7)",
                },
              },
              x: {
                grid: {
                  color: "rgba(0, 0, 0, 0.1)",
                },
                ticks: {
                  color: "rgba(0, 0, 0, 0.7)",
                },
              },
            },
            plugins: {
              legend: {
                position: "top",
                labels: {
                  color: "rgba(0, 0, 0, 0.7)",
                },
              },
              tooltip: {
                backgroundColor: "rgba(255, 255, 255, 0.9)",
                titleColor: "rgba(0, 0, 0, 0.9)",
                bodyColor: "rgba(0, 0, 0, 0.9)",
                borderColor: "rgba(0, 0, 0, 0.2)",
                borderWidth: 1,
              },
            },
          },
        })
      }

      // Create bullwhip effect visualization
      const bullwhipCtx = bullwhipChartRef.current.getContext("2d")
      if (bullwhipCtx) {
        // Calculate order variance for each role
        const calculateVariance = (data: number[]) => {
          if (data.length <= 1) return 0
          const mean = data.reduce((sum, val) => sum + val, 0) / data.length
          const squaredDiffs = data.map((val) => Math.pow(val - mean, 2))
          return squaredDiffs.reduce((sum, val) => sum + val, 0) / data.length
        }

        // Extract orders data (simplified for this example)
        const retailerOrders = gameState.customerDemand
        const wholesalerOrders = gameState.inventory.retailer.map((_, i, arr) =>
          i > 0 ? Math.max(0, arr[i - 1] - arr[i] + (gameState.customerDemand[i] || 4)) : 4,
        )
        const distributorOrders = gameState.inventory.wholesaler.map((_, i, arr) =>
          i > 0 ? Math.max(0, arr[i - 1] - arr[i] + (wholesalerOrders[i] || 4)) : 4,
        )
        const factoryOrders = gameState.inventory.distributor.map((_, i, arr) =>
          i > 0 ? Math.max(0, arr[i - 1] - arr[i] + (distributorOrders[i] || 4)) : 4,
        )

        // Calculate variance ratios (bullwhip effect)
        const demandVariance = calculateVariance(retailerOrders)
        const variances = [
          { role: "Customer Demand", value: 1 }, // Normalized to 1
          { role: "Retailer", value: calculateVariance(wholesalerOrders) / (demandVariance || 1) },
          { role: "Wholesaler", value: calculateVariance(distributorOrders) / (demandVariance || 1) },
          { role: "Distributor", value: calculateVariance(factoryOrders) / (demandVariance || 1) },
          { role: "Factory", value: calculateVariance(gameState.inventory.factory) / (demandVariance || 1) },
        ]

        bullwhipChartInstance.current = new Chart(bullwhipCtx, {
          type: "bar",
          data: {
            labels: variances.map((v) => v.role),
            datasets: [
              {
                label: "Order Variance Ratio (Bullwhip Effect)",
                data: variances.map((v) => v.value),
                backgroundColor: [
                  "rgba(219, 39, 119, 0.7)",
                  "rgba(22, 163, 74, 0.7)",
                  "rgba(37, 99, 235, 0.7)",
                  "rgba(147, 51, 234, 0.7)",
                  "rgba(234, 88, 12, 0.7)",
                ],
                borderColor: ["#db2777", "#16a34a", "#2563eb", "#9333ea", "#ea580c"],
                borderWidth: 1,
              },
            ],
          },
          options: {
            responsive: true,
            scales: {
              y: {
                beginAtZero: true,
                grid: {
                  color: "rgba(0, 0, 0, 0.1)",
                },
                ticks: {
                  color: "rgba(0, 0, 0, 0.7)",
                },
              },
              x: {
                grid: {
                  color: "rgba(0, 0, 0, 0.1)",
                },
                ticks: {
                  color: "rgba(0, 0, 0, 0.7)",
                },
              },
            },
            plugins: {
              legend: {
                position: "top",
                labels: {
                  color: "rgba(0, 0, 0, 0.7)",
                },
              },
              tooltip: {
                backgroundColor: "rgba(255, 255, 255, 0.9)",
                titleColor: "rgba(0, 0, 0, 0.9)",
                bodyColor: "rgba(0, 0, 0, 0.9)",
                borderColor: "rgba(0, 0, 0, 0.2)",
                borderWidth: 1,
              },
            },
          },
        })
      }
    }
  }, [gameState, blockchainEnabled, showBlockchainData])

  return (
    <Card className="border border-gray-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center text-xl text-gray-800">
          <BarChart3 className="w-5 h-5 mr-2 text-purple-600" />
          Analytics Dashboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="inventory">
          <TabsList className="grid grid-cols-6 mb-4 bg-gray-100">
            <TabsTrigger
              value="inventory"
              className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-600"
            >
              <LineChart className="w-4 h-4 mr-2" />
              Inventory
            </TabsTrigger>
            <TabsTrigger
              value="backorders"
              className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-600"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Backorders
            </TabsTrigger>
            <TabsTrigger
              value="costs"
              className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-600"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Costs
            </TabsTrigger>
            <TabsTrigger
              value="demand"
              className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-600"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Demand
            </TabsTrigger>
            <TabsTrigger
              value="bullwhip"
              className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-600"
            >
              <Waves className="w-4 h-4 mr-2" />
              Bullwhip
            </TabsTrigger>
            {blockchainEnabled && (
              <TabsTrigger
                value="blockchain"
                className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-600"
              >
                <Database className="w-4 h-4 mr-2" />
                Blockchain
              </TabsTrigger>
            )}
          </TabsList>

          {blockchainEnabled && (
            <div className="mb-4 flex items-center justify-end">
              <div className="flex items-center space-x-2">
                <Switch id="blockchain-data" checked={showBlockchainData} onCheckedChange={setShowBlockchainData} />
                <Label htmlFor="blockchain-data" className="text-sm text-gray-600 flex items-center">
                  <Database className="w-3 h-3 mr-1 text-purple-600" />
                  Show Blockchain-Verified Data
                </Label>
              </div>
            </div>
          )}

          <TabsContent value="inventory" className="mt-0">
            <div className="h-[300px]">
              <canvas ref={inventoryChartRef} />
            </div>
          </TabsContent>
          <TabsContent value="backorders" className="mt-0">
            <div className="h-[300px]">
              <canvas ref={backordersChartRef} />
            </div>
          </TabsContent>
          <TabsContent value="costs" className="mt-0">
            <div className="h-[300px]">
              <canvas ref={costsChartRef} />
            </div>
          </TabsContent>
          <TabsContent value="demand" className="mt-0">
            <div className="h-[300px]">
              <canvas ref={demandChartRef} />
            </div>

            {blockchainEnabled && showBlockchainData && (
              <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-md">
                <h4 className="text-sm font-medium text-purple-700 mb-2 flex items-center">
                  <Database className="w-4 h-4 mr-1" />
                  Blockchain Verification Analysis
                </h4>
                <p className="text-sm text-gray-600 mb-2">
                  The chart shows a comparison between reported orders and blockchain-verified orders. Small
                  discrepancies may indicate data transmission delays or verification issues.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">Retailer Order Accuracy:</span>
                      <span className="font-medium">96%</span>
                    </div>
                    <Progress value={96} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">Wholesaler Order Accuracy:</span>
                      <span className="font-medium">98%</span>
                    </div>
                    <Progress value={98} className="h-2" />
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
          <TabsContent value="bullwhip" className="mt-0">
            <div className="h-[300px]">
              <canvas ref={bullwhipChartRef} />
            </div>
          </TabsContent>

          {blockchainEnabled && (
            <TabsContent value="blockchain" className="mt-0">
              <BlockchainLedger />
            </TabsContent>
          )}
        </Tabs>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border border-gray-200 bg-gray-50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center text-gray-800">
                <Activity className="w-4 h-4 mr-2 text-green-600" />
                Supply Chain Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600">Inventory Balance</span>
                  <Badge
                    variant="outline"
                    className={`${
                      gameState.inventory[
                        gameState.selectedRole.toLowerCase() as keyof typeof gameState.inventory
                      ].slice(-1)[0] > 0
                        ? "text-green-600 border-green-300 bg-green-50"
                        : "text-red-600 border-red-300 bg-red-50"
                    }`}
                  >
                    {gameState.inventory[
                      gameState.selectedRole.toLowerCase() as keyof typeof gameState.inventory
                    ].slice(-1)[0] > 0
                      ? "Healthy"
                      : "Critical"}
                  </Badge>
                </div>
                <Progress
                  value={Math.min(
                    100,
                    Math.max(
                      0,
                      (gameState.inventory[
                        gameState.selectedRole.toLowerCase() as keyof typeof gameState.inventory
                      ].slice(-1)[0] /
                        20) *
                        100,
                    ),
                  )}
                  className="h-2 bg-gray-200"
                  indicatorClassName={`${
                    gameState.inventory[gameState.selectedRole.toLowerCase() as keyof typeof gameState.inventory].slice(
                      -1,
                    )[0] > 0
                      ? "bg-gradient-to-r from-green-500 to-green-400"
                      : "bg-gradient-to-r from-red-500 to-red-400"
                  }`}
                />
              </div>
              <div className="space-y-2 mt-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600">Cost Efficiency</span>
                  <Badge variant="outline" className="text-yellow-600 border-yellow-300 bg-yellow-50">
                    {gameState.costs[gameState.selectedRole.toLowerCase() as keyof typeof gameState.costs].slice(
                      -1,
                    )[0] < 100
                      ? "Optimal"
                      : "High Cost"}
                  </Badge>
                </div>
                <Progress
                  value={Math.min(
                    100,
                    gameState.costs[gameState.selectedRole.toLowerCase() as keyof typeof gameState.costs].slice(-1)[0] /
                      5,
                  )}
                  className="h-2 bg-gray-200"
                  indicatorClassName="bg-gradient-to-r from-yellow-500 to-yellow-400"
                />
              </div>

              {blockchainEnabled && (
                <div className="space-y-2 mt-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-600">Blockchain Verification</span>
                    <Badge variant="outline" className="text-purple-600 border-purple-300 bg-purple-50">
                      97% Accurate
                    </Badge>
                  </div>
                  <Progress
                    value={97}
                    className="h-2 bg-gray-200"
                    indicatorClassName="bg-gradient-to-r from-purple-500 to-purple-400"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-gray-200 bg-gray-50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center text-gray-800">
                <TrendingUp className="w-4 h-4 mr-2 text-blue-600" />
                Order Patterns
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col h-full justify-center items-center">
                <div className="text-center space-y-2">
                  <div className="text-3xl font-bold text-blue-600">
                    {
                      gameState.customerOrders[
                        gameState.selectedRole.toLowerCase() as keyof typeof gameState.customerOrders
                      ]
                    }
                  </div>
                  <div className="text-xs text-gray-600">Current Order</div>

                  <div className="flex items-center justify-center mt-2">
                    <Badge variant="outline" className="text-purple-600 border-purple-300 bg-purple-50">
                      {gameState.demandPattern}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 bg-gray-50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center text-gray-800">
                <Zap className="w-4 h-4 mr-2 text-orange-600" />
                Bullwhip Effect
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col h-full justify-center items-center">
                <div className="relative w-full h-16">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full h-0.5 bg-gray-300"></div>
                  </div>
                  <div className="relative flex justify-between">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full bg-pink-500"></div>
                      <span className="mt-1 text-[10px] text-gray-600">Customer</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-4 h-4 rounded-full bg-green-500 animate-pulse"></div>
                      <span className="mt-1 text-[10px] text-gray-600">Retailer</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-5 h-5 rounded-full bg-blue-500 animate-pulse"></div>
                      <span className="mt-1 text-[10px] text-gray-600">Wholesaler</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-6 h-6 rounded-full bg-purple-500 animate-pulse"></div>
                      <span className="mt-1 text-[10px] text-gray-600">Distributor</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-7 h-7 rounded-full bg-orange-500 animate-pulse"></div>
                      <span className="mt-1 text-[10px] text-gray-600">Factory</span>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-center text-gray-600 mt-2">Increasing order variability upstream</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  )
}
