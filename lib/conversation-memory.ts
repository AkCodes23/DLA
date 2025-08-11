interface UserProfile {
  name: string
  preferredName?: string
  phone: string
  email?: string
  address?: string
  preferredTimeSlots: string[]
  preferredServices: string[]
  lastVisit?: Date
  totalAppointments: number
  notes: string[]
}

interface ConversationHistory {
  id: string
  timestamp: Date
  messages: Array<{
    role: "user" | "assistant"
    content: string
    timestamp: Date
  }>
  intent: string
  completed: boolean
  appointment?: any
  userSentiment: "positive" | "neutral" | "negative"
}

interface UserPreferences {
  communicationStyle: "formal" | "casual" | "friendly"
  reminderPreference: "sms" | "email" | "both" | "none"
  appointmentBuffer: number // minutes before/after preferred times
  languagePreference: "english" | "hindi" | "mixed"
  accessibilityNeeds: string[]
}

export class ConversationMemory {
  private userProfiles: Map<string, UserProfile> = new Map()
  private conversationHistory: Map<string, ConversationHistory[]> = new Map()
  private userPreferences: Map<string, UserPreferences> = new Map()
  private currentSessionId = ""
  private currentUserPhone = ""

  constructor() {
    this.loadFromStorage()
  }

  // Initialize session with user identification
  initializeSession(sessionId: string): void {
    this.currentSessionId = sessionId
    console.log("Session initialized:", sessionId)
  }

  // Identify user by phone number or name
  identifyUser(phone?: string, name?: string): UserProfile | null {
    if (phone) {
      this.currentUserPhone = phone
      return this.getUserProfile(phone)
    }

    if (name) {
      // Try to find user by name
      for (const [userPhone, profile] of this.userProfiles) {
        if (
          profile.name.toLowerCase().includes(name.toLowerCase()) ||
          profile.preferredName?.toLowerCase().includes(name.toLowerCase())
        ) {
          this.currentUserPhone = userPhone
          return profile
        }
      }
    }

    return null
  }

  // Get or create user profile
  getUserProfile(phone: string): UserProfile {
    if (!this.userProfiles.has(phone)) {
      const newProfile: UserProfile = {
        name: "",
        phone: phone,
        preferredTimeSlots: [],
        preferredServices: [],
        totalAppointments: 0,
        notes: [],
      }
      this.userProfiles.set(phone, newProfile)
    }
    return this.userProfiles.get(phone)!
  }

  // Update user profile
  updateUserProfile(phone: string, updates: Partial<UserProfile>): void {
    const profile = this.getUserProfile(phone)
    Object.assign(profile, updates)
    this.saveToStorage()
  }

  // Get user preferences
  getUserPreferences(phone: string): UserPreferences {
    if (!this.userPreferences.has(phone)) {
      const defaultPreferences: UserPreferences = {
        communicationStyle: "friendly",
        reminderPreference: "sms",
        appointmentBuffer: 30,
        languagePreference: "english",
        accessibilityNeeds: [],
      }
      this.userPreferences.set(phone, defaultPreferences)
    }
    return this.userPreferences.get(phone)!
  }

  // Update user preferences
  updateUserPreferences(phone: string, preferences: Partial<UserPreferences>): void {
    const current = this.getUserPreferences(phone)
    Object.assign(current, preferences)
    this.saveToStorage()
  }

  // Add conversation to history
  addConversation(
    phone: string,
    messages: Array<{ role: "user" | "assistant"; content: string; timestamp: Date }>,
    intent: string,
    completed: boolean,
    appointment?: any,
    sentiment: "positive" | "neutral" | "negative" = "neutral",
  ): void {
    const conversation: ConversationHistory = {
      id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      messages,
      intent,
      completed,
      appointment,
      userSentiment: sentiment,
    }

    if (!this.conversationHistory.has(phone)) {
      this.conversationHistory.set(phone, [])
    }

    const history = this.conversationHistory.get(phone)!
    history.unshift(conversation) // Add to beginning

    // Keep only last 50 conversations per user
    if (history.length > 50) {
      history.splice(50)
    }

    this.saveToStorage()
  }

  // Get conversation history
  getConversationHistory(phone: string, limit = 10): ConversationHistory[] {
    return this.conversationHistory.get(phone)?.slice(0, limit) || []
  }

  // Get recent appointments
  getRecentAppointments(phone: string, limit = 5): any[] {
    const history = this.getConversationHistory(phone, 20)
    return history
      .filter((conv) => conv.appointment && conv.completed)
      .map((conv) => conv.appointment)
      .slice(0, limit)
  }

  // Analyze user patterns
  analyzeUserPatterns(phone: string): {
    mostUsedServices: string[]
    preferredTimes: string[]
    averageCallDuration: number
    satisfactionTrend: string
    commonIssues: string[]
  } {
    const history = this.getConversationHistory(phone, 30)
    const profile = this.getUserProfile(phone)

    // Most used services
    const serviceCount: Record<string, number> = {}
    const timeCount: Record<string, number> = {}
    const issues: string[] = []

    history.forEach((conv) => {
      if (conv.appointment?.service) {
        serviceCount[conv.appointment.service] = (serviceCount[conv.appointment.service] || 0) + 1
      }
      if (conv.appointment?.time) {
        const timeSlot = this.categorizeTime(conv.appointment.time)
        timeCount[timeSlot] = (timeCount[timeSlot] || 0) + 1
      }
      if (conv.userSentiment === "negative") {
        issues.push(conv.intent)
      }
    })

    const mostUsedServices = Object.entries(serviceCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([service]) => service)

    const preferredTimes = Object.entries(timeCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 2)
      .map(([time]) => time)

    const recentSentiments = history.slice(0, 5).map((conv) => conv.userSentiment)
    const satisfactionTrend = this.calculateSatisfactionTrend(recentSentiments)

    return {
      mostUsedServices,
      preferredTimes,
      averageCallDuration: 0, // Would need timing data
      satisfactionTrend,
      commonIssues: [...new Set(issues)],
    }
  }

  // Generate personalized greeting
  generatePersonalizedGreeting(phone: string): string {
    const profile = this.getUserProfile(phone)
    const preferences = this.getUserPreferences(phone)
    const recentHistory = this.getConversationHistory(phone, 3)

    if (!profile.name) {
      return "Hello! You've reached the Driving Licence Authority. This is Ava, your virtual assistant. How can I help you today?"
    }

    const name = profile.preferredName || profile.name.split(" ")[0]
    const timeOfDay = this.getTimeOfDay()

    // Check for recent incomplete appointments
    const incompleteBooking = recentHistory.find((conv) => conv.intent === "book_appointment" && !conv.completed)

    if (incompleteBooking) {
      return `${timeOfDay}, ${name}! Welcome back. I see we were working on booking an appointment earlier. Would you like to continue with that, or is there something else I can help you with today?`
    }

    // Check for recent appointments
    const recentAppointments = this.getRecentAppointments(phone, 1)
    if (recentAppointments.length > 0) {
      const lastAppointment = recentAppointments[0]
      return `${timeOfDay}, ${name}! Great to hear from you again. I hope your ${lastAppointment.service} appointment went well. How can I assist you today?`
    }

    // Regular returning user
    if (profile.totalAppointments > 0) {
      return `${timeOfDay}, ${name}! Welcome back to the Driving Licence Authority. How can I help you today?`
    }

    // First-time user with name
    return `${timeOfDay}, ${name}! Welcome to the Driving Licence Authority. I'm Ava, your virtual assistant. How can I help you today?`
  }

  // Generate contextual suggestions
  generateContextualSuggestions(phone: string): string[] {
    const profile = this.getUserProfile(phone)
    const patterns = this.analyzeUserPatterns(phone)
    const suggestions: string[] = []

    // Based on most used services
    if (patterns.mostUsedServices.length > 0) {
      suggestions.push(`Book another ${patterns.mostUsedServices[0]} appointment`)
    }

    // Based on profile completeness
    if (!profile.email) {
      suggestions.push("Update your contact information")
    }

    // Based on time since last visit
    if (profile.lastVisit) {
      const daysSinceLastVisit = Math.floor((Date.now() - profile.lastVisit.getTime()) / (1000 * 60 * 60 * 24))
      if (daysSinceLastVisit > 30) {
        suggestions.push("Check if your licence needs renewal")
      }
    }

    // Based on common patterns
    if (patterns.preferredTimes.includes("morning")) {
      suggestions.push("Book a morning appointment")
    }

    return suggestions.slice(0, 3)
  }

  // Get personalized responses
  getPersonalizedResponse(phone: string, context: string): string {
    const profile = this.getUserProfile(phone)
    const preferences = this.getUserPreferences(phone)

    // Adjust communication style
    const style = preferences.communicationStyle

    switch (context) {
      case "appointment_confirmation":
        if (style === "formal") {
          return `Thank you, ${profile.name}. Your appointment has been confirmed.`
        } else if (style === "casual") {
          return `All set! Your appointment is booked.`
        } else {
          return `Perfect, ${profile.preferredName || profile.name.split(" ")[0]}! Your appointment is all confirmed.`
        }

      case "service_suggestion":
        if (profile.totalAppointments > 3) {
          return "Based on your previous visits, I think this service would be perfect for you."
        } else {
          return "This service is quite popular and should meet your needs well."
        }

      default:
        return ""
    }
  }

  // Learn from user interactions
  learnFromInteraction(
    phone: string,
    userInput: string,
    assistantResponse: string,
    userSatisfaction?: "positive" | "negative",
  ): void {
    const profile = this.getUserProfile(phone)

    // Learn preferred communication patterns
    if (userInput.includes("please") || userInput.includes("thank you")) {
      const preferences = this.getUserPreferences(phone)
      if (preferences.communicationStyle === "casual") {
        preferences.communicationStyle = "formal"
        this.updateUserPreferences(phone, preferences)
      }
    }

    // Learn from corrections
    if (userInput.includes("no, I meant") || userInput.includes("actually")) {
      profile.notes.push(`Correction needed: ${userInput}`)
    }

    // Learn from satisfaction feedback
    if (userSatisfaction === "negative") {
      profile.notes.push(`Dissatisfaction: ${assistantResponse}`)
    }

    this.saveToStorage()
  }

  // Helper methods
  private categorizeTime(time: string): string {
    const hour = Number.parseInt(time.split(":")[0])
    const period = time.includes("PM") ? "PM" : "AM"

    if (period === "AM" || (period === "PM" && hour <= 12)) {
      if (hour >= 9 && hour < 12) return "morning"
      if (hour >= 12 && hour < 17) return "afternoon"
    }
    return "evening"
  }

  private getTimeOfDay(): string {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 17) return "Good afternoon"
    return "Good evening"
  }

  private calculateSatisfactionTrend(sentiments: string[]): string {
    const positive = sentiments.filter((s) => s === "positive").length
    const negative = sentiments.filter((s) => s === "negative").length

    if (positive > negative) return "improving"
    if (negative > positive) return "declining"
    return "stable"
  }

  // Storage methods
  private saveToStorage(): void {
    try {
      const data = {
        userProfiles: Array.from(this.userProfiles.entries()),
        conversationHistory: Array.from(this.conversationHistory.entries()),
        userPreferences: Array.from(this.userPreferences.entries()),
      }
      localStorage.setItem("ava_conversation_memory", JSON.stringify(data))
    } catch (error) {
      console.error("Failed to save conversation memory:", error)
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem("ava_conversation_memory")
      if (stored) {
        const data = JSON.parse(stored)
        this.userProfiles = new Map(data.userProfiles || [])
        this.conversationHistory = new Map(data.conversationHistory || [])
        this.userPreferences = new Map(data.userPreferences || [])

        // Convert date strings back to Date objects
        for (const [phone, history] of this.conversationHistory) {
          history.forEach((conv) => {
            conv.timestamp = new Date(conv.timestamp)
            conv.messages.forEach((msg) => {
              msg.timestamp = new Date(msg.timestamp)
            })
          })
        }

        for (const [phone, profile] of this.userProfiles) {
          if (profile.lastVisit) {
            profile.lastVisit = new Date(profile.lastVisit)
          }
        }
      }
    } catch (error) {
      console.error("Failed to load conversation memory:", error)
    }
  }

  // Export user data (for privacy compliance)
  exportUserData(phone: string): any {
    return {
      profile: this.userProfiles.get(phone),
      preferences: this.userPreferences.get(phone),
      conversationHistory: this.conversationHistory.get(phone),
    }
  }

  // Delete user data (for privacy compliance)
  deleteUserData(phone: string): void {
    this.userProfiles.delete(phone)
    this.userPreferences.delete(phone)
    this.conversationHistory.delete(phone)
    this.saveToStorage()
  }

  // Get current user phone
  getCurrentUserPhone(): string {
    return this.currentUserPhone
  }

  // Clear current session
  clearSession(): void {
    this.currentSessionId = ""
    this.currentUserPhone = ""
  }
}
