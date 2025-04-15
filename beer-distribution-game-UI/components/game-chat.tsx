"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send } from "lucide-react"

interface GameChatProps {
  inLobby?: boolean
}

export function GameChat({ inLobby = false }: GameChatProps) {
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<
    {
      id: string
      sender: string
      content: string
      timestamp: Date
      isSystem?: boolean
    }[]
  >([
    {
      id: "1",
      sender: "System",
      content: inLobby
        ? "Welcome to the game lobby! You can chat with other players here."
        : "Game started! You can communicate with other players here.",
      timestamp: new Date(),
      isSystem: true,
    },
  ])

  const scrollAreaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]")
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [messages])

  const sendMessage = () => {
    if (!message.trim()) return

    const newMessage = {
      id: Date.now().toString(),
      sender: "You",
      content: message,
      timestamp: new Date(),
    }

    setMessages([...messages, newMessage])
    setMessage("")

    // Simulate response for demo
    if (inLobby) {
      setTimeout(() => {
        const responses = [
          "I'm excited to play!",
          "Has anyone played this before?",
          "I hope I get the Retailer role",
          "Let me know when everyone is ready",
        ]

        const mockResponse = {
          id: Date.now().toString(),
          sender: ["Alice", "Bob", "Charlie", "Instructor"][Math.floor(Math.random() * 4)],
          content: responses[Math.floor(Math.random() * responses.length)],
          timestamp: new Date(),
        }

        setMessages((prev) => [...prev, mockResponse])
      }, 2000)
    } else {
      setTimeout(() => {
        const responses = [
          "I'm seeing a bullwhip effect forming!",
          "My inventory is getting low, placing a larger order",
          "Be careful not to overorder",
          "The demand pattern seems to be changing",
        ]

        const mockResponse = {
          id: Date.now().toString(),
          sender: ["Retailer", "Wholesaler", "Distributor", "Factory"][Math.floor(Math.random() * 4)],
          content: responses[Math.floor(Math.random() * responses.length)],
          timestamp: new Date(),
        }

        setMessages((prev) => [...prev, mockResponse])
      }, 2000)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  const getAvatarColor = (name: string) => {
    const colors = [
      "bg-red-500",
      "bg-blue-500",
      "bg-green-500",
      "bg-yellow-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-indigo-500",
      "bg-teal-500",
    ]

    // Simple hash function to get consistent color for a name
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }

    return colors[Math.abs(hash) % colors.length]
  }

  return (
    <Card className="border border-gray-200 bg-white shadow-sm h-full flex flex-col">
      {!inLobby && (
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Game Chat</CardTitle>
        </CardHeader>
      )}
      <CardContent className={`flex-grow p-0 ${inLobby ? "pt-0" : "pt-2"}`}>
        <ScrollArea className="h-[calc(100%-2rem)]" ref={scrollAreaRef}>
          <div className="p-4 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === "You" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`flex ${msg.sender === "You" ? "flex-row-reverse" : "flex-row"} items-start gap-2 max-w-[80%]`}
                >
                  {!msg.isSystem && (
                    <Avatar className={`w-8 h-8 ${msg.sender === "You" ? "ml-2" : "mr-2"}`}>
                      <AvatarFallback className={getAvatarColor(msg.sender)}>{getInitials(msg.sender)}</AvatarFallback>
                    </Avatar>
                  )}
                  <div>
                    <div
                      className={`px-3 py-2 rounded-lg ${
                        msg.isSystem
                          ? "bg-gray-100 text-gray-600 border border-gray-200"
                          : msg.sender === "You"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {msg.isSystem && <div className="font-semibold text-xs text-gray-500 mb-1">System Message</div>}
                      {!msg.isSystem && <div className="font-semibold text-xs mb-1">{msg.sender}</div>}
                      <p className="text-sm">{msg.content}</p>
                    </div>
                    <div className={`text-xs text-gray-500 mt-1 ${msg.sender === "You" ? "text-right" : "text-left"}`}>
                      {formatTime(msg.timestamp)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter className="border-t border-gray-200 p-3">
        <div className="flex w-full items-center space-x-2">
          <Input
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="border-gray-300"
          />
          <Button
            size="icon"
            onClick={sendMessage}
            disabled={!message.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
