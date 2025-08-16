import { groq } from "@ai-sdk/groq"
import { generateText } from "ai"

function isValidDate(dateString: string): boolean {
  const date = new Date(dateString)
  return date instanceof Date && !isNaN(date.getTime())
}

function isValidDOB(dobString: string): boolean {
  if (!isValidDate(dobString)) return false

  const dob = new Date(dobString)
  const today = new Date()
  const age = today.getFullYear() - dob.getFullYear()
  const monthDiff = today.getMonth() - dob.getMonth()

  // Check if person is at least 16 years old (minimum driving age)
  if (age < 16) return false
  if (age === 16 && monthDiff < 0) return false
  if (age === 16 && monthDiff === 0 && today.getDate() < dob.getDate()) return false

  // Check if DOB is not in the future
  return dob <= today
}

function isValidAppointmentDate(appointmentString: string): boolean {
  if (!isValidDate(appointmentString)) return false

  const appointment = new Date(appointmentString)
  const today = new Date()
  const maxFutureDate = new Date()
  maxFutureDate.setMonth(today.getMonth() + 6) // 6 months in advance

  // Appointment should be in the future but not more than 6 months ahead
  return appointment > today && appointment <= maxFutureDate
}

function verifyRecord(licenceNumber: string, dob: string): { valid: boolean; message: string } {
  // Simulate record verification (in real implementation, this would query a database)
  if (!licenceNumber || licenceNumber.length < 8) {
    return { valid: false, message: "Invalid licence number format. Please provide a valid licence number." }
  }

  if (!isValidDOB(dob)) {
    return {
      valid: false,
      message: "Invalid date of birth. Please provide a valid DOB (you must be at least 16 years old).",
    }
  }

  // Simulate successful verification
  return { valid: true, message: "Record verified successfully. Your licence is active and valid." }
}

function bookAppointment(
  serviceType: "new" | "lost" | "renew",
  preferredDate: string,
): { success: boolean; message: string } {
  if (!["new", "lost", "renew"].includes(serviceType)) {
    return { success: false, message: "Invalid service type. Please specify: New, Lost, or Renew." }
  }

  if (!isValidAppointmentDate(preferredDate)) {
    return { success: false, message: "Invalid appointment date. Please choose a date within the next 6 months." }
  }

  // Simulate appointment booking
  const appointmentId = `APT${Date.now().toString().slice(-6)}`
  return {
    success: true,
    message: `Appointment booked successfully! Your appointment ID is ${appointmentId} for ${serviceType} licence service on ${new Date(preferredDate).toLocaleDateString()}.`,
  }
}

export async function POST(request: Request) {
  try {
    console.log("[v0] Groq API request received")

    const { message, language, conversationHistory } = await request.json()

    console.log("[v0] Request data:", { message, language, historyLength: conversationHistory?.length })

    const systemPrompt =
      language === "ar"
        ? `أنت آفا، المساعد الافتراضي الذكي والودود لهيئة رخص القيادة. أنت خبيرة في جميع خدمات الرخص وتتحدثين بطريقة طبيعية ومفهومة.

      شخصيتك:
      - ودودة ومتفهمة ومساعدة
      - تتحدثين بطريقة طبيعية وغير رسمية
      - تفهمين السياق وتتذكرين المحادثة السابقة
      - تطرحين أسئلة توضيحية عند الحاجة
      - تقدمين إجابات مفصلة ومفيدة

      خدماتك الأساسية:
      1. التحقق من السجلات (رقم الرخصة + تاريخ الميلاد)
      2. حجز المواعيد (جديدة، مفقودة، تجديد)
      3. الإجابة على الأسئلة العامة حول الرخص والمرور
      4. توجيه المستخدمين خطوة بخطوة

      تذكري: أجيبي على أي سؤال بطريقة مفيدة، حتى لو لم يكن متعلقاً مباشرة بالرخص. كوني مرنة في المحادثة.`
        : `You are Ava, the intelligent and friendly virtual assistant for the Driving Licence Authority. You are an expert in all licensing services and speak in a natural, conversational way.

      Your Personality:
      - Friendly, understanding, and helpful
      - Speak naturally and conversationally, not formally
      - Understand context and remember previous conversation
      - Ask clarifying questions when needed
      - Provide detailed and useful answers
      - Think step by step when solving problems
      - Be flexible and adaptable in conversation

      Your Core Services:
      1. Record Verification (licence number + date of birth)
      2. Appointment Booking (New, Lost, Renew licences)
      3. Answer general questions about licensing and traffic
      4. Guide users step by step through processes
      5. Provide information about requirements, fees, and procedures

      Conversation Guidelines:
      - Always acknowledge what the user said
      - If unclear, ask for clarification
      - Break down complex processes into simple steps
      - Remember what we discussed earlier in the conversation
      - Be patient and thorough in explanations
      - Answer any question helpfully, even if not directly licence-related

      Remember: Be conversational and helpful. Think through problems logically and provide clear, actionable guidance.`

    let conversationContext = ""
    if (conversationHistory && conversationHistory.length > 0) {
      // Only include last 10 messages to avoid token overflow while maintaining context
      const recentHistory = conversationHistory.slice(-10)
      conversationContext = "Recent conversation context:\n"
      recentHistory.forEach((msg: any) => {
        conversationContext += `${msg.sender === "user" ? "User" : "Ava"}: ${msg.text}\n`
      })
      conversationContext += "\nUser's current message: "
    }

    const fullPrompt = conversationContext + message

    console.log("[v0] Calling Groq API with model: llama-3.3-70b-versatile")

    const { text } = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      system: systemPrompt,
      prompt: fullPrompt,
      maxTokens: 800, // Increased token limit for more detailed responses
      temperature: 0.8, // Increased temperature for more natural conversation
    })

    console.log("[v0] Groq API response received, length:", text.length)

    return Response.json({ response: text })
  } catch (error) {
    console.error("[v0] AI Chat Error:", error)
    if (error instanceof Error) {
      console.error("[v0] Error details:", error.message, error.stack)
    }
    return Response.json({ error: "Failed to process your request. Please try again." }, { status: 500 })
  }
}
