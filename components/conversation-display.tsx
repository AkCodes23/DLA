"use client"

import { useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { Bot, User } from "lucide-react"

interface Message {
  id: string
  text: string
  sender: "user" | "assistant"
  timestamp: Date
  isInterim?: boolean
}

interface ConversationDisplayProps {
  messages: Message[]
}

export function ConversationDisplay({ messages }: ConversationDisplayProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  return (
    <Card className="bg-black/10 backdrop-blur-xl border-white/10">
      <div className="p-4">
        <h3 className="text-lg font-semibold text-white/90 mb-4 flex items-center">
          <Bot className="w-5 h-5 mr-2" />
          Conversation History
        </h3>

        <ScrollArea className="h-64">
          <div ref={scrollRef} className="space-y-4 pr-4">
            {messages.map((message, index) => (
              <div
                key={message.id}
                className={cn(
                  "flex items-start space-x-3 animate-in slide-in-from-bottom-2 duration-300",
                  message.sender === "user" ? "justify-end" : "justify-start",
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {message.sender === "assistant" && (
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}

                <div
                  className={cn(
                    "max-w-xs lg:max-w-md p-3 rounded-2xl shadow-lg transition-all duration-200",
                    message.sender === "user"
                      ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white ml-auto"
                      : "bg-white/10 backdrop-blur-sm text-white border border-white/20",
                  )}
                >
                  <p className="text-sm leading-relaxed">{message.text}</p>
                  <p
                    className={cn(
                      "text-xs mt-2 opacity-70",
                      message.sender === "user" ? "text-blue-100" : "text-gray-300",
                    )}
                  >
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                {message.sender === "user" && (
                  <div className="w-8 h-8 bg-gradient-to-r from-gray-600 to-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            ))}

            {messages.length === 0 && (
              <div className="text-center text-gray-400 py-8">
                <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Conversation will appear here...</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </Card>
  )
}
