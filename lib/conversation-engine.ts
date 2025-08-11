import { ConversationMemory } from "./conversation-memory"

interface ConversationState {
  intent: string | null
  slots: Record<string, any>
  step: number
  context: Record<string, any>
}

interface ConversationResponse {
  message: string
  intent?: string
  completed?: boolean
  appointment?: any
  suggestions?: string[]
}

const infoKeywords = ["info", "information", "details", "know", "about"]

export class ConversationEngine {
  private state: ConversationState = {
    intent: null,
    slots: {},
    step: 0,
    context: {},
  }

  private memory: ConversationMemory
  private sessionMessages: Array<{ role: "user" | "assistant"; content: string; timestamp: Date }> = []

  private services = {
    "new licence": {
      documents: ["ID proof", "Address proof", "Passport photo", "Medical certificate"],
      fee: "₹500",
      duration: "30 minutes",
    },
    "licence renewal": {
      documents: ["Current licence", "ID proof", "Passport photo"],
      fee: "₹200",
      duration: "15 minutes",
    },
    replacement: {
      documents: ["Police report (if lost)", "ID proof", "Passport photo"],
      fee: "₹300",
      duration: "20 minutes",
    },
    "address change": {
      documents: ["Current licence", "New address proof", "Passport photo"],
      fee: "₹100",
      duration: "10 minutes",
    },
    "driving test": {
      documents: ["Learner's licence", "ID proof", "Passport photo"],
      fee: "₹300",
      duration: "45 minutes",
    },
  }

  private timeSlots = [
    "9:00 AM",
    "9:30 AM",
    "10:00 AM",
    "10:30 AM",
    "11:00 AM",
    "11:30 AM",
    "2:00 PM",
    "2:30 PM",
    "3:00 PM",
    "3:30 PM",
    "4:00 PM",
    "4:30 PM",
  ]

  constructor() {
    this.memory = new ConversationMemory()
    this.memory.initializeSession(`session_${Date.now()}`)
  }

  async processInput(input: string): Promise<ConversationResponse> {
    const normalizedInput = input.toLowerCase().trim()

    // Add to session messages
    this.sessionMessages.push({
      role: "user",
      content: input,
      timestamp: new Date(),
    })

    // Handle conversational responses - but only if we're in a confirmation context
    if (this.state.intent && this.state.step >= 5 && this.isConfirmation(normalizedInput)) {
      return this.handleConfirmation()
    }

    if (this.state.intent && this.isNegation(normalizedInput)) {
      return this.handleNegation()
    }

    // Intent recognition - allow re-recognition even if intent exists but we're early in flow
    if (!this.state.intent || (this.state.intent && this.state.step <= 2)) {
      const intentResult = this.recognizeIntent(normalizedInput)
      // If we found a new intent, use it
      if (intentResult.intent) {
        return intentResult
      }
      // If no new intent found and we have an existing intent, continue with existing flow
      if (this.state.intent) {
        return this.continueExistingFlow(normalizedInput)
      }
      // Otherwise return the default response
      return intentResult
    }

    // Continue with existing flow
    return this.continueExistingFlow(normalizedInput)
  }

  private continueExistingFlow(input: string): ConversationResponse {
    // Handle booking flow
    if (this.state.intent === "book_appointment") {
      return this.handleBookingFlow(input)
    }

    // Handle information requests
    if (this.state.intent === "get_info") {
      return this.handleInfoRequest(input)
    }

    const response = "I understand. Could you tell me more about what you need help with?"
    this.addAssistantMessage(response)
    return { message: response }
  }

  // Generate initial greeting with memory
  generateInitialGreeting(): string {
    const currentUserPhone = this.memory.getCurrentUserPhone()
    if (currentUserPhone) {
      return this.memory.generatePersonalizedGreeting(currentUserPhone)
    }

    return "Hello! You've reached the Driving Licence Authority. This is Ava, your virtual assistant. How can I help you today?"
  }

  private isConfirmation(input: string): boolean {
    const confirmWords = [
      "yes",
      "yeah",
      "yep",
      "yup",
      "correct",
      "right",
      "okay",
      "ok",
      "sure",
      "absolutely",
      "definitely",
      "confirm",
      "confirmed",
      "good",
      "fine",
      "perfect",
      "sounds good",
      "looks good",
      "that's right",
      "that works",
    ]
    return confirmWords.some((word) => input.includes(word)) || (input.trim().length > 0 && !this.isNegation(input))
  }

  private isNegation(input: string): boolean {
    const negWords = ["no", "nope", "not", "incorrect", "wrong", "cancel"]
    return negWords.some((word) => input.includes(word))
  }

  private handleConfirmation(): ConversationResponse {
    if (this.state.intent === "book_appointment" && this.state.step >= 5) {
      return this.finalizeBooking()
    }
    const response = "Perfect! Let's continue."
    this.addAssistantMessage(response)
    return { message: response }
  }

  private handleNegation(): ConversationResponse {
    if (this.state.intent === "book_appointment") {
      this.state.step = Math.max(1, this.state.step - 1)
      const response = "No worries. Let me help you with that again. What would you like to change?"
      this.addAssistantMessage(response)
      return { message: response }
    }
    const response = "I understand. How else can I help you today?"
    this.addAssistantMessage(response)
    return { message: response }
  }

  private recognizeIntent(input: string): ConversationResponse {
    // Check if user is providing their phone number for identification
    const phoneMatch = input.match(/(\d{10}|\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/)
    if (phoneMatch) {
      const phone = phoneMatch[0].replace(/\D/g, "")
      const userProfile = this.memory.identifyUser(phone)

      if (userProfile && userProfile.name) {
        const greeting = this.memory.generatePersonalizedGreeting(phone)
        const suggestions = this.memory.generateContextualSuggestions(phone)
        this.addAssistantMessage(greeting)

        return {
          message: greeting,
          suggestions,
        }
      }
    }

    // More flexible booking keywords
    const bookingKeywords = [
      "book",
      "appointment",
      "schedule",
      "reserve",
      "set up",
      "new licence",
      "new license",
      "apply",
      "application",
      "renew",
      "renewal",
      "extend",
      "replace",
      "replacement",
      "lost",
      "damaged",
      "duplicate",
      "address change",
      "change address",
      "update address",
      "driving test",
      "test",
      "exam",
      "practical test",
      "want to book",
      "need to book",
      "i want",
      "i need",
    ]

    // Check for booking intent with more flexibility
    if (bookingKeywords.some((keyword) => input.includes(keyword))) {
      this.state.intent = "book_appointment"
      this.state.step = 1

      const serviceType = this.extractServiceType(input)
      if (serviceType) {
        this.state.slots.service = serviceType
        this.state.step = 2

        // Check if we know this user
        const currentUserPhone = this.memory.getCurrentUserPhone()
        if (currentUserPhone) {
          const profile = this.memory.getUserProfile(currentUserPhone)
          if (profile.name) {
            // Pre-fill known information
            this.state.slots.name = profile.name
            this.state.slots.contact = profile.phone
            this.state.step = 3

            const response = `Great! I'll help you book an appointment for ${serviceType}. I have your details as ${profile.name}. What date would work best for your appointment?`
            this.addAssistantMessage(response)
            return {
              message: response,
              intent: "book_appointment",
            }
          }
        }

        const response = `Great! I'll help you book an appointment for ${serviceType}. Could I have your full name, please? Please speak clearly and I'll wait for you to finish.`
        this.addAssistantMessage(response)
        return {
          message: response,
          intent: "book_appointment",
        }
      }

      // If no specific service detected, ask for service selection
      const currentUserPhone = this.memory.getCurrentUserPhone()
      let servicesSuggestion = `I'd be happy to help you book an appointment. What service do you need? We offer:
    • New licence applications
    • Licence renewals  
    • Licence replacements
    • Address changes
    • Driving tests`

      if (currentUserPhone) {
        const patterns = this.memory.analyzeUserPatterns(currentUserPhone)
        if (patterns.mostUsedServices.length > 0) {
          servicesSuggestion += `\n\nBased on your previous visits, you might be interested in ${patterns.mostUsedServices[0]}.`
        }
      }

      servicesSuggestion += "\n\nWhich one interests you?"

      this.addAssistantMessage(servicesSuggestion)
      return {
        message: servicesSuggestion,
        intent: "book_appointment",
      }
    }

    // Check for information intent
    if (infoKeywords.some((keyword) => input.includes(keyword))) {
      this.state.intent = "get_info"
      return this.handleInfoRequest(input)
    }

    // Handle greetings more naturally
    const greetings = ["hello", "hi", "hey", "good morning", "good afternoon", "good evening"]
    if (greetings.some((greeting) => input.includes(greeting))) {
      const response =
        "Hello! I'm Ava, your virtual assistant for the Driving Licence Authority. I'm here to help you with appointments and information. What can I do for you today?"
      this.addAssistantMessage(response)
      return { message: response }
    }

    // Default response with personalized suggestions
    const currentUserPhone = this.memory.getCurrentUserPhone()
    let defaultResponse = `I'm here to help you with driving licence services. I can:
  • Book appointments for various services
  • Provide information about fees and requirements
  • Tell you about office hours and location`

    if (currentUserPhone) {
      const suggestions = this.memory.generateContextualSuggestions(currentUserPhone)
      if (suggestions.length > 0) {
        defaultResponse += `\n\nBased on your history, you might want to:\n• ${suggestions.join("\n• ")}`
      }
    }

    defaultResponse += "\n\nWhat would you like to do today?"

    this.addAssistantMessage(defaultResponse)
    return { message: defaultResponse }
  }

  private extractServiceType(input: string): string | null {
    // More comprehensive service detection
    if (
      input.includes("new licence") ||
      input.includes("new license") ||
      (input.includes("new") && input.includes("apply"))
    )
      return "new licence"
    if (input.includes("renew") || input.includes("renewal") || input.includes("extend")) return "licence renewal"
    if (
      input.includes("replace") ||
      input.includes("replacement") ||
      input.includes("lost") ||
      input.includes("damaged") ||
      input.includes("duplicate")
    )
      return "replacement"
    if (input.includes("address change") || input.includes("change address") || input.includes("update address"))
      return "address change"
    if (input.includes("driving test") || input.includes("test") || input.includes("exam")) return "driving test"

    // Handle more natural language patterns
    if (input.includes("driving licence renewal") || input.includes("license renewal")) return "licence renewal"

    return null
  }

  private handleBookingFlow(input: string): ConversationResponse {
    switch (this.state.step) {
      case 1: // Service selection
        const serviceType = this.extractServiceType(input)
        if (serviceType) {
          this.state.slots.service = serviceType
          this.state.step = 2

          // Check for existing user
          const currentUserPhone = this.memory.getCurrentUserPhone()
          if (currentUserPhone) {
            const profile = this.memory.getUserProfile(currentUserPhone)
            if (profile.name) {
              this.state.slots.name = profile.name
              this.state.slots.contact = profile.phone
              this.state.step = 3

              const response = `Excellent choice! I'll help you book an appointment for ${serviceType}. I have your details as ${profile.name}. What date would work best for your appointment?`
              this.addAssistantMessage(response)
              return { message: response }
            }
          }

          const response = `Excellent choice! I'll help you book an appointment for ${serviceType}. Could I have your full name, please? Take your time, I'll wait for you to finish speaking.`
          this.addAssistantMessage(response)
          return { message: response }
        }

        const response =
          "Which service would you like to book? Please tell me if you need a new licence, licence renewal, replacement, address change, or driving test."
        this.addAssistantMessage(response)
        return { message: response }

      case 2: // Name collection - Enhanced to handle better recognition
        if (input.length > 2) {
          // Clean up the name input
          const cleanedName = input
            .replace(/my name is|i'm|this is|i am|call me/gi, "")
            .replace(/[^\w\s]/g, "") // Remove special characters
            .trim()

          if (cleanedName.length > 1) {
            this.state.slots.name = this.formatName(cleanedName)
            this.state.step = 3

            const response = `Thank you, ${this.state.slots.name}! What date would work best for your ${this.state.slots.service} appointment? You can say something like "August 15th" or "next Monday".`
            this.addAssistantMessage(response)
            return { message: response }
          }
        }

        const responseName =
          "I didn't catch your name clearly. Could you please tell me your full name again? Speak slowly and clearly."
        this.addAssistantMessage(responseName)
        return { message: responseName }

      case 3: // Date selection
        const date = this.parseDate(input)
        if (date) {
          this.state.slots.date = date
          this.state.step = 4

          // Suggest preferred times based on history
          const currentUserPhone = this.memory.getCurrentUserPhone()
          let availableSlots = this.getAvailableSlots(date)

          if (currentUserPhone) {
            const patterns = this.memory.analyzeUserPatterns(currentUserPhone)
            if (patterns.preferredTimes.includes("morning")) {
              availableSlots = availableSlots.filter((slot) => slot.includes("AM"))
            } else if (patterns.preferredTimes.includes("afternoon")) {
              availableSlots = availableSlots.filter((slot) => slot.includes("PM"))
            }
          }

          const responseDate = `Perfect! I've got you down for ${date}. Here are the available time slots: ${availableSlots.slice(0, 4).join(", ")}. What time works best for you?`
          this.addAssistantMessage(responseDate)
          return { message: responseDate }
        }

        // More helpful error message
        const responseDateError = `I didn't catch that date clearly. Could you try saying it like "August 15th", "15th of August", "tomorrow", or "next Monday"? What date would work for you?`
        this.addAssistantMessage(responseDateError)
        return { message: responseDateError }

      case 4: // Time selection
        const time = this.parseTime(input)
        if (time) {
          this.state.slots.time = time
          this.state.step = 5

          // Check if we already have contact info
          const currentUserPhone = this.memory.getCurrentUserPhone()
          if (currentUserPhone) {
            this.state.slots.contact = currentUserPhone
            this.state.step = 6

            const service = this.services[this.state.slots.service as keyof typeof this.services]
            const responseTime = `Perfect! I have you scheduled for ${this.state.slots.date} at ${time}. Let me confirm your appointment details: ${this.state.slots.service} for ${this.state.slots.name} on ${this.state.slots.date} at ${this.state.slots.time}. Contact: ${currentUserPhone}. Fee: ${service.fee}. Please bring: ${service.documents.join(", ")}. Does everything look correct?`
            this.addAssistantMessage(responseTime)
            return { message: responseTime }
          }

          const responseTimeContact = `Perfect! I have you scheduled for ${this.state.slots.date} at ${time}. Could I get your contact number for confirmation? Please speak the digits clearly.`
          this.addAssistantMessage(responseTimeContact)
          return { message: responseTimeContact }
        }

        const responseTimeSelection =
          "What time would you prefer? You can choose from the slots I mentioned, or just say 'morning' or 'afternoon'."
        this.addAssistantMessage(responseTimeSelection)
        return { message: responseTimeSelection }

      case 5: // Contact information - Enhanced for better number recognition
        const contact = this.parseContact(input)
        if (contact) {
          this.state.slots.contact = contact
          this.state.step = 6

          // Update user profile with this contact
          this.memory.identifyUser(contact, this.state.slots.name)

          const service = this.services[this.state.slots.service as keyof typeof this.services]
          const responseContact = `Excellent! Let me confirm your appointment details: ${this.state.slots.service} for ${this.state.slots.name} on ${this.state.slots.date} at ${this.state.slots.time}. Contact: ${contact}. Fee: ${service.fee}. Please bring: ${service.documents.join(", ")}. Does everything look correct?`
          this.addAssistantMessage(responseContact)
          return { message: responseContact }
        }

        const responseContactError =
          "I didn't catch your phone number clearly. Could you please say your 10-digit contact number again? Speak each digit clearly with small pauses."
        this.addAssistantMessage(responseContactError)
        return { message: responseContactError }

      case 6: // Final confirmation
        if (this.isConfirmation(input)) {
          return this.finalizeBooking()
        }

        // Handle "no" or corrections
        if (this.isNegation(input)) {
          this.state.step = 5 // Go back to contact collection
          const responseCorrection =
            "No problem! What would you like to change? You can tell me a different date, time, or contact number."
          this.addAssistantMessage(responseCorrection)
          return { message: responseCorrection }
        }

        // If user says anything else, treat as confirmation
        if (input.trim().length > 0) {
          return this.finalizeBooking()
        }

        const responseFinalConfirmation =
          "Please say 'yes' to confirm your appointment, or tell me what you'd like to change."
        this.addAssistantMessage(responseFinalConfirmation)
        return { message: responseFinalConfirmation }

      default:
        const responseDefault = "Let me help you start over. What service do you need today?"
        this.addAssistantMessage(responseDefault)
        return { message: responseDefault }
    }
  }

  private handleInfoRequest(input: string): ConversationResponse {
    if (
      input.includes("documents") ||
      input.includes("required") ||
      input.includes("need") ||
      input.includes("bring")
    ) {
      const serviceType = this.extractServiceType(input)
      if (serviceType && this.services[serviceType as keyof typeof this.services]) {
        const service = this.services[serviceType as keyof typeof this.services]
        const responseInfo = `For ${serviceType}, you'll need to bring: ${service.documents.join(", ")}. The fee is ${service.fee} and the process takes about ${service.duration}. Would you like me to book an appointment for you?`
        this.addAssistantMessage(responseInfo)
        return { message: responseInfo }
      }

      const responseInfoService =
        "I can tell you the required documents for any service. Which service are you interested in? New licence, licence renewal, replacement, address change, or driving test?"
      this.addAssistantMessage(responseInfoService)
      return { message: responseInfoService }
    }

    if (input.includes("fee") || input.includes("cost") || input.includes("price")) {
      const responseInfoFee =
        "Here are our service fees: New licence - ₹500, Licence renewal - ₹200, Replacement - ₹300, Address change - ₹100, Driving test - ₹300. Which service would you like to know more about?"
      this.addAssistantMessage(responseInfoFee)
      return { message: responseInfoFee }
    }

    if (input.includes("location") || input.includes("address") || input.includes("where")) {
      const responseInfoLocation =
        "We're located at 123 Government Complex, Main Road, City Center. Our office hours are 9 AM to 5 PM, Monday to Saturday. We're closed on Sundays and public holidays. Would you like to book an appointment?"
      this.addAssistantMessage(responseInfoLocation)
      return { message: responseInfoLocation }
    }

    if (input.includes("hours") || input.includes("time") || input.includes("open")) {
      const responseInfoHours =
        "Our office hours are 9 AM to 5 PM, Monday to Saturday. We're closed on Sundays and public holidays. You can reach us at 1800-123-4567. How can I help you today?"
      this.addAssistantMessage(responseInfoHours)
      return { message: responseInfoHours }
    }

    const responseInfoGeneral =
      "I can provide information about required documents, fees, office location, hours, and contact details. I can also help you book appointments. What would you like to know?"
    this.addAssistantMessage(responseInfoGeneral)
    return { message: responseInfoGeneral }
  }

  private formatName(input: string): string {
    return input
      .trim()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ")
  }

  private parseDate(input: string): string | null {
    const today = new Date()
    const currentYear = today.getFullYear()

    // Handle "today"
    if (input.includes("today")) {
      return today.toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric" })
    }

    // Handle "tomorrow"
    if (input.includes("tomorrow")) {
      const tomorrow = new Date(today)
      tomorrow.setDate(today.getDate() + 1)
      return tomorrow.toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric" })
    }

    // Handle specific dates like "12th August", "15th", "12th of August", "August 12th"
    const datePatterns = [
      // "12th August", "12th of August"
      /(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(january|february|march|april|may|june|july|august|september|october|november|december)/i,
      // "August 12th", "August 12"
      /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?/i,
      // Just numbers like "15th", "12"
      /^(\d{1,2})(?:st|nd|rd|th)?$/,
      // "12/8", "12-8", "12.8"
      /(\d{1,2})[/\-.](\d{1,2})/,
    ]

    for (const pattern of datePatterns) {
      const match = input.match(pattern)
      if (match) {
        let day: number
        let month: number

        if (pattern.source.includes("january|february")) {
          // Month name patterns
          if (match[2]) {
            // "12th August" format
            day = Number.parseInt(match[1])
            month = this.getMonthNumber(match[2])
          } else {
            // "August 12th" format
            month = this.getMonthNumber(match[1])
            day = Number.parseInt(match[2])
          }
        } else if (pattern.source.includes("[/\\-\\.]")) {
          // "12/8" format - assume day/month
          day = Number.parseInt(match[1])
          month = Number.parseInt(match[2])
        } else {
          // Just day number - use next occurrence of that day
          day = Number.parseInt(match[1])
          month = today.getMonth() + 1 // Current month

          // If the day has passed this month, use next month
          if (day < today.getDate()) {
            month = month === 12 ? 1 : month + 1
          }
        }

        // Validate day and month
        if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
          try {
            const targetDate = new Date(currentYear, month - 1, day)

            // If the date is in the past, assume next year
            if (targetDate < today) {
              targetDate.setFullYear(currentYear + 1)
            }

            return targetDate.toLocaleDateString("en-IN", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })
          } catch (error) {
            console.error("Invalid date:", error)
          }
        }
      }
    }

    // Handle day names
    const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
    for (const day of days) {
      if (input.includes(day)) {
        const targetDay = days.indexOf(day) + 1
        const nextDate = new Date(today)
        const daysUntilTarget = (targetDay + 7 - today.getDay()) % 7 || 7
        nextDate.setDate(today.getDate() + daysUntilTarget)
        return nextDate.toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric" })
      }
    }

    return null
  }

  private getMonthNumber(monthName: string): number {
    const months = [
      "january",
      "february",
      "march",
      "april",
      "may",
      "june",
      "july",
      "august",
      "september",
      "october",
      "november",
      "december",
    ]
    return months.indexOf(monthName.toLowerCase()) + 1
  }

  private parseTime(input: string): string | null {
    const normalizedInput = input.toLowerCase().trim()

    // Handle "10 o'clock", "ten o'clock" patterns first
    const oclockMatch = normalizedInput.match(
      /(\d{1,2}|ten|eleven|twelve|one|two|three|four|five|six|seven|eight|nine)\s*o'?clock/i,
    )
    if (oclockMatch) {
      const hourWords: { [key: string]: number } = {
        one: 1,
        two: 2,
        three: 3,
        four: 4,
        five: 5,
        six: 6,
        seven: 7,
        eight: 8,
        nine: 9,
        ten: 10,
        eleven: 11,
        twelve: 12,
      }

      let hour = Number.parseInt(oclockMatch[1]) || hourWords[oclockMatch[1].toLowerCase()] || 10

      // Determine AM/PM based on context
      let period = "AM"
      if (hour >= 1 && hour <= 5 && (normalizedInput.includes("afternoon") || normalizedInput.includes("pm"))) {
        period = "PM"
        if (hour !== 12) hour += 12
      } else if (hour >= 6 && hour <= 11) {
        period = "AM"
      }

      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
      const time = `${displayHour}:00 ${period}`

      if (this.timeSlots.includes(time)) {
        return time
      }
      return this.findClosestTimeSlot(time)
    }

    // Handle explicit time formats
    const timeMatch = normalizedInput.match(/(\d{1,2}):?(\d{2})?\s*(am|pm|a\.m\.|p\.m\.)/i)
    if (timeMatch) {
      let hour = Number.parseInt(timeMatch[1])
      const minute = timeMatch[2] ? Number.parseInt(timeMatch[2]) : 0
      const period = timeMatch[3].toLowerCase().replace(/\./g, "")

      // Convert to 12-hour format
      if (period.includes("pm") && hour !== 12) {
        hour += 12
      } else if (period.includes("am") && hour === 12) {
        hour = 0
      }

      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
      const displayPeriod = hour >= 12 ? "PM" : "AM"
      const time = `${displayHour}:${minute.toString().padStart(2, "0")} ${displayPeriod}`

      if (this.timeSlots.includes(time)) {
        return time
      }
      return this.findClosestTimeSlot(time)
    }

    // Handle "10:30", "1030" patterns
    const numericMatch = normalizedInput.match(/(\d{1,2}):?(\d{2})?/)
    if (numericMatch) {
      let hour = Number.parseInt(numericMatch[1])
      const minute = numericMatch[2] ? Number.parseInt(numericMatch[2]) : 0

      // Smart AM/PM detection
      let period = "AM"
      if (hour >= 1 && hour <= 5) {
        period = normalizedInput.includes("afternoon") || normalizedInput.includes("pm") ? "PM" : "AM"
      } else if (hour >= 6 && hour <= 11) {
        period = "AM"
      } else if (hour >= 12) {
        period = "PM"
      }

      if (period === "PM" && hour !== 12) hour += 12
      else if (period === "AM" && hour === 12) hour = 0

      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
      const time = `${displayHour}:${minute.toString().padStart(2, "0")} ${period}`

      if (this.timeSlots.includes(time)) {
        return time
      }
      return this.findClosestTimeSlot(time)
    }

    // Handle general preferences
    if (normalizedInput.includes("morning") || normalizedInput.includes("am")) {
      return "10:00 AM"
    }
    if (normalizedInput.includes("afternoon") || normalizedInput.includes("pm")) {
      return "2:00 PM"
    }
    if (normalizedInput.includes("early")) {
      return "9:00 AM"
    }
    if (normalizedInput.includes("late")) {
      return "4:00 PM"
    }

    return null
  }

  // Add this new helper method:
  private findClosestTimeSlot(targetTime: string): string {
    // Convert target time to minutes for comparison
    const [time, period] = targetTime.split(" ")
    const [hourStr, minuteStr] = time.split(":")
    let targetHour = Number.parseInt(hourStr)
    const targetMinute = Number.parseInt(minuteStr)

    if (period === "PM" && targetHour !== 12) {
      targetHour += 12
    } else if (period === "AM" && targetHour === 12) {
      targetHour = 0
    }

    const targetMinutes = targetHour * 60 + targetMinute

    // Find closest available slot
    let closestSlot = this.timeSlots[0]
    let closestDiff = Number.POSITIVE_INFINITY

    for (const slot of this.timeSlots) {
      const [slotTime, slotPeriod] = slot.split(" ")
      const [slotHourStr, slotMinuteStr] = slotTime.split(":")
      let slotHour = Number.parseInt(slotHourStr)
      const slotMinute = Number.parseInt(slotMinuteStr)

      if (slotPeriod === "PM" && slotHour !== 12) {
        slotHour += 12
      } else if (slotPeriod === "AM" && slotHour === 12) {
        slotHour = 0
      }

      const slotMinutes = slotHour * 60 + slotMinute
      const diff = Math.abs(targetMinutes - slotMinutes)

      if (diff < closestDiff) {
        closestDiff = diff
        closestSlot = slot
      }
    }

    return closestSlot
  }

  private parseContact(input: string): string | null {
    // Remove all non-digit characters and extract numbers
    const digitsOnly = input.replace(/\D/g, "")

    // Look for 10-digit phone numbers
    if (digitsOnly.length === 10) {
      return digitsOnly
    }

    // Look for 11-digit numbers (with country code)
    if (digitsOnly.length === 11 && digitsOnly.startsWith("91")) {
      return digitsOnly.substring(2) // Remove country code
    }

    // Try to extract from speech patterns like "nine eight seven six five four three two one zero"
    const numberWords = {
      zero: "0",
      oh: "0",
      one: "1",
      won: "1",
      two: "2",
      to: "2",
      too: "2",
      three: "3",
      tree: "3",
      four: "4",
      for: "4",
      fore: "4",
      five: "5",
      six: "6",
      sex: "6",
      seven: "7",
      eight: "8",
      ate: "8",
      nine: "9",
      niner: "9",
    }

    let phoneFromWords = ""
    const words = input.toLowerCase().split(/\s+/)

    for (const word of words) {
      if (numberWords[word]) {
        phoneFromWords += numberWords[word]
      }
    }

    if (phoneFromWords.length === 10) {
      return phoneFromWords
    }

    return null
  }

  private getAvailableSlots(date: string): string[] {
    return this.timeSlots.slice(0, 8)
  }

  private finalizeBooking(): ConversationResponse {
    const service = this.services[this.state.slots.service as keyof typeof this.services]
    const appointment = {
      service: this.state.slots.service,
      name: this.state.slots.name,
      date: this.state.slots.date,
      time: this.state.slots.time,
      contact: this.state.slots.contact,
      documents: service.documents,
    }

    // Update user profile and save conversation
    if (this.state.slots.contact) {
      this.memory.updateUserProfile(this.state.slots.contact, {
        name: this.state.slots.name,
        phone: this.state.slots.contact,
        lastVisit: new Date(),
        totalAppointments: this.memory.getUserProfile(this.state.slots.contact).totalAppointments + 1,
      })

      // Update preferred services and times
      const profile = this.memory.getUserProfile(this.state.slots.contact)
      if (!profile.preferredServices.includes(this.state.slots.service)) {
        profile.preferredServices.push(this.state.slots.service)
      }

      const timeCategory = this.categorizeTime(this.state.slots.time)
      if (!profile.preferredTimeSlots.includes(timeCategory)) {
        profile.preferredTimeSlots.push(timeCategory)
      }

      // Save conversation to memory
      this.memory.addConversation(
        this.state.slots.contact,
        this.sessionMessages,
        "book_appointment",
        true,
        appointment,
        "positive",
      )
    }

    // Generate personalized confirmation
    const currentUserPhone = this.memory.getCurrentUserPhone()
    let confirmationMessage = `Wonderful! Your appointment is confirmed, ${appointment.name}. You're all set for ${appointment.service} on ${appointment.date} at ${appointment.time}. You'll receive a confirmation SMS at ${appointment.contact}. Please remember to bring: ${service.documents.join(", ")}.`

    if (currentUserPhone) {
      const profile = this.memory.getUserProfile(currentUserPhone)
      if (profile.totalAppointments > 1) {
        confirmationMessage += ` Thank you for choosing us again!`
      }
    }

    confirmationMessage += ` Is there anything else I can help you with today?`

    // Reset state for next conversation - THIS IS IMPORTANT TO PREVENT FREEZING
    this.state = {
      intent: null,
      slots: {},
      step: 0,
      context: {},
    }

    this.addAssistantMessage(confirmationMessage)
    return {
      message: confirmationMessage,
      completed: true,
      appointment,
    }
  }

  private categorizeTime(time: string): string {
    const hour = Number.parseInt(time.split(":")[0])
    const period = time.includes("PM") ? "PM" : "AM"

    if (period === "AM" || (period === "PM" && hour <= 12)) {
      if (hour >= 9 && hour < 12) return "morning"
      if (hour >= 12 && hour < 17) return "afternoon"
    }
    return "evening"
  }

  private addAssistantMessage(content: string): void {
    this.sessionMessages.push({
      role: "assistant",
      content,
      timestamp: new Date(),
    })
  }

  // Get conversation memory instance
  getMemory(): ConversationMemory {
    return this.memory
  }

  // End session and save conversation
  endSession(): void {
    const currentUserPhone = this.memory.getCurrentUserPhone()
    if (currentUserPhone && this.sessionMessages.length > 0) {
      this.memory.addConversation(
        currentUserPhone,
        this.sessionMessages,
        this.state.intent || "general",
        this.state.intent === "book_appointment" && this.state.step >= 6,
        undefined,
        "neutral",
      )
    }
    this.memory.clearSession()
    this.sessionMessages = []
  }
}
