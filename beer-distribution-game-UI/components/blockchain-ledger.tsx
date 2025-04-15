"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { type BlockchainTransaction, getTransactionHistory } from "@/lib/blockchain-utils"
import { Database, Download, Search, Filter, ExternalLink } from "lucide-react"

export function BlockchainLedger() {
  const [transactions, setTransactions] = useState<BlockchainTransaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setIsLoading(true)
        const txHistory = await getTransactionHistory()
        setTransactions(txHistory)
      } catch (error) {
        console.error("Failed to fetch transaction history:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTransactions()
  }, [])

  const filteredTransactions = transactions.filter((tx) => {
    // Apply role filter
    if (filter !== "all" && !tx.from.toLowerCase().includes(filter) && !tx.to.toLowerCase().includes(filter)) {
      return false
    }

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        tx.id.toLowerCase().includes(query) ||
        tx.from.toLowerCase().includes(query) ||
        tx.to.toLowerCase().includes(query) ||
        tx.type.toLowerCase().includes(query)
      )
    }

    return true
  })

  const exportLedger = () => {
    const dataStr = JSON.stringify(transactions, null, 2)
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`

    const exportFileDefaultName = `blockchain-ledger-${new Date().toISOString().slice(0, 10)}.json`

    const linkElement = document.createElement("a")
    linkElement.setAttribute("href", dataUri)
    linkElement.setAttribute("download", exportFileDefaultName)
    linkElement.click()
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-600 border-green-200"
      case "pending":
        return "bg-yellow-100 text-yellow-600 border-yellow-200"
      default:
        return "bg-gray-100 text-gray-600 border-gray-200"
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "order":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
            Order
          </Badge>
        )
      case "shipment":
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-200">
            Shipment
          </Badge>
        )
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  return (
    <Card className="border border-gray-200 bg-white shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center text-xl text-gray-800">
            <Database className="w-5 h-5 mr-2 text-purple-600" />
            Blockchain Ledger
          </CardTitle>
          <Button variant="outline" size="sm" onClick={exportLedger} className="border-gray-300 text-gray-600">
            <Download className="w-4 h-4 mr-2" />
            Export Ledger
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 border-gray-300"
            />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px] border-gray-300">
              <Filter className="w-4 h-4 mr-2 text-gray-500" />
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="retailer">Retailer</SelectItem>
              <SelectItem value="wholesaler">Wholesaler</SelectItem>
              <SelectItem value="distributor">Distributor</SelectItem>
              <SelectItem value="factory">Factory</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {searchQuery || filter !== "all" ? "No transactions match your filters" : "No transactions recorded yet"}
          </div>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Transaction ID
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Type
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    From
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    To
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Quantity
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Timestamp
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                      <div className="flex items-center">
                        <span className="truncate max-w-[100px]">{tx.id}</span>
                        <ExternalLink className="w-3 h-3 ml-1 text-gray-400" />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getTypeIcon(tx.type)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{tx.from}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{tx.to}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tx.quantity}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatTimestamp(tx.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Badge variant="outline" className={getStatusColor(tx.status)}>
                        {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
