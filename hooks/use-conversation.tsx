"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

interface Message {
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface Appointment {
  service: string
  name: string
  date: string
  time: string
  contact: string
  documents: string[]
}

interface ConversationContextType {
  messages: Message[]
  currentAppointment: Appointment | null
  addMessage: (role: "user" | "assistant", content: string) => void
  setCurrentAppointment: (appointment: Appointment | null) => void
}

const ConversationContext = createContext<ConversationContextType | undefined>(undefined)

export function ConversationProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [currentAppointment, setCurrentAppointment] = useState<Appointment | null>(null)

  const addMessage = (role: "user" | "assistant", content: string) => {
    setMessages((prev) => [
      ...prev,
      {
        role,
        content,
        timestamp: new Date(),
      },
    ])
  }

  return (
    <ConversationContext.Provider
      value={{
        messages,
        currentAppointment,
        addMessage,
        setCurrentAppointment,
      }}
    >
      {children}
    </ConversationContext.Provider>
  )
}

export function useConversation() {
  const context = useContext(ConversationContext)
  if (context === undefined) {
    throw new Error("useConversation must be used within a ConversationProvider")
  }
  return context
}
