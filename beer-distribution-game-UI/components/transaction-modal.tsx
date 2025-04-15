"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { type BlockchainTransaction, verifyTransaction } from "@/lib/blockchain-utils"
import { CheckCircle2, Copy, ExternalLink, FileText, Clock } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface TransactionModalProps {
  isOpen: boolean
  onClose: () => void
  transaction: BlockchainTransaction | null
  title?: string
}

export function TransactionModal({
  isOpen,
  onClose,
  transaction,
  title = "Transaction Details",
}: TransactionModalProps) {
  const [isVerifying, setIsVerifying] = useState(false)
  const [isVerified, setIsVerified] = useState(false)

  useEffect(() => {
    if (transaction && isOpen) {
      setIsVerified(transaction.status === "confirmed")
    }
  }, [transaction, isOpen])

  const handleVerify = async () => {
    if (!transaction) return

    setIsVerifying(true)
    try {
      const verified = await verifyTransaction(transaction.id)
      setIsVerified(verified)

      toast({
        title: verified ? "Transaction Verified" : "Verification Failed",
        description: verified
          ? "This transaction has been verified on the blockchain"
          : "Could not verify this transaction",
        variant: verified ? "default" : "destructive",
      })
    } catch (error) {
      console.error("Verification error:", error)
      toast({
        title: "Verification Error",
        description: "An error occurred while verifying the transaction",
        variant: "destructive",
      })
    } finally {
      setIsVerifying(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied to clipboard",
      variant: "default",
    })
  }

  if (!transaction) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <FileText className="w-5 h-5 mr-2 text-purple-600" />
            {title}
          </DialogTitle>
          <DialogDescription>View and verify blockchain transaction details</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-500">Transaction ID</span>
            <div className="flex items-center space-x-1">
              <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">{transaction.id}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(transaction.id)}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-500">Status</span>
            <Badge
              variant="outline"
              className={
                transaction.status === "confirmed" || isVerified
                  ? "bg-green-100 text-green-600 border-green-200"
                  : "bg-yellow-100 text-yellow-600 border-yellow-200"
              }
            >
              {isVerified ? "Verified" : transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
            </Badge>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-500">Type</span>
            <Badge
              variant="outline"
              className={
                transaction.type === "order"
                  ? "bg-blue-100 text-blue-600 border-blue-200"
                  : "bg-purple-100 text-purple-600 border-purple-200"
              }
            >
              {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
            </Badge>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-500">From</span>
            <span className="text-sm capitalize">{transaction.from}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-500">To</span>
            <span className="text-sm capitalize">{transaction.to}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-500">Quantity</span>
            <span className="text-sm font-medium">{transaction.quantity}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-500">Timestamp</span>
            <span className="text-sm">{new Date(transaction.timestamp).toLocaleString()}</span>
          </div>

          <div className="pt-4 flex justify-between">
            <Button
              variant="outline"
              size="sm"
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
              onClick={() => window.open(`https://example.com/explorer/tx/${transaction.id}`, "_blank")}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View in Explorer
            </Button>

            <Button
              variant={isVerified ? "outline" : "default"}
              size="sm"
              disabled={isVerifying || isVerified}
              onClick={handleVerify}
              className={
                isVerified
                  ? "bg-green-50 text-green-600 border-green-200 hover:bg-green-100"
                  : "bg-purple-600 hover:bg-purple-700 text-white"
              }
            >
              {isVerifying ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : isVerified ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Verified
                </>
              ) : (
                "Verify on Blockchain"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
