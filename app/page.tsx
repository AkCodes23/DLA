"use client"

import { useState, useEffect, useRef, useCallback } from "react"

// Define speech recognition types inline
interface SpeechRecognitionInline extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: any) => void) | null
  onerror: ((event: any) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
}

interface Message {
  id: string
  text: string
  sender: "user" | "assistant"
  timestamp: Date
}

export default function Home() {
  const [isCallActive, setIsCallActive] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [currentTranscript, setCurrentTranscript] = useState("")
  const [isVoiceSupported, setIsVoiceSupported] = useState(false)
  const [microphonePermission, setMicrophonePermission] = useState<"granted" | "denied" | "prompt">("prompt")

  const recognitionRef = useRef<SpeechRecognitionInline | null>(null)

  const addMessage = useCallback((sender: "user" | "assistant", text: string) => {
    const message: Message = {
      id: `${sender}-${Date.now()}`,
      text,
      sender,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, message])
  }, [])

  const speak = useCallback((text: string) => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.9
      utterance.pitch = 1.1
      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)
      window.speechSynthesis.speak(utterance)
    }
  }, [])

  const processUserInput = useCallback(
    (input: string) => {
      if (!input.trim()) return

      addMessage("user", input)

      let response = "I understand you said: " + input + ". "

      if (input.toLowerCase().includes("appointment") || input.toLowerCase().includes("book")) {
        response += "I can help you book an appointment. What service do you need?"
      } else if (input.toLowerCase().includes("licence") || input.toLowerCase().includes("license")) {
        response += "I can help with driving licence services. Do you need a new licence, renewal, or replacement?"
      } else if (input.toLowerCase().includes("hello") || input.toLowerCase().includes("hi")) {
        response = "Hello! I'm Ava, your virtual assistant for the Driving Licence Authority. How can I help you today?"
      } else {
        response += "How can I assist you with your driving licence needs today?"
      }

      addMessage("assistant", response)
      speak(response)
    },
    [addMessage, speak],
  )

  const initializeSpeechRecognition = useCallback(() => {
    if (typeof window === "undefined") return false

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) return false

    try {
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = "en-US"

      recognition.onstart = () => {
        setIsListening(true)
        setCurrentTranscript("")
      }

      recognition.onend = () => {
        setIsListening(false)
        setCurrentTranscript("")
      }

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error)
        setIsListening(false)
        setCurrentTranscript("")
        if (event.error === "not-allowed") {
          setMicrophonePermission("denied")
        }
      }

      recognition.onresult = (event: any) => {
        let interimTranscript = ""
        let finalTranscript = ""

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript
          } else {
            interimTranscript += transcript
          }
        }

        setCurrentTranscript(interimTranscript)

        if (finalTranscript.trim()) {
          processUserInput(finalTranscript.trim())
        }
      }

      recognitionRef.current = recognition
      return true
    } catch (error) {
      console.error("Speech recognition initialization failed:", error)
      return false
    }
  }, [processUserInput])

  const startCall = useCallback(async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
      setMicrophonePermission("granted")
    } catch (error) {
      setMicrophonePermission("denied")
      console.error("Microphone access denied:", error)
    }

    setIsCallActive(true)
    setMessages([])

    const speechInitialized = initializeSpeechRecognition()
    setIsVoiceSupported(speechInitialized)

    const greeting =
      "Hello! Welcome to the Driving Licence Authority. I'm Ava, your virtual assistant. How can I help you today?"
    addMessage("assistant", greeting)
    speak(greeting)

    if (speechInitialized && recognitionRef.current) {
      setTimeout(() => {
        try {
          recognitionRef.current?.start()
        } catch (error) {
          console.error("Failed to start recognition:", error)
        }
      }, 3000)
    }
  }, [initializeSpeechRecognition, addMessage, speak])

  const endCall = useCallback(() => {
    setIsCallActive(false)
    setIsListening(false)
    setIsSpeaking(false)
    setMessages([])
    setCurrentTranscript("")

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch (error) {
        console.error("Failed to stop recognition:", error)
      }
    }

    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
  }, [])

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return

    if (isListening) {
      try {
        recognitionRef.current.stop()
      } catch (error) {
        console.error("Failed to stop recognition:", error)
      }
    } else {
      try {
        recognitionRef.current.start()
      } catch (error) {
        console.error("Failed to start recognition:", error)
      }
    }
  }, [isListening])

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      setIsVoiceSupported(!!SpeechRecognition)
    }
  }, [])

  return (
    <div
      style={{ minHeight: "100vh", backgroundColor: "#000", color: "#fff", display: "flex", flexDirection: "column" }}
    >
      <div style={{ padding: "1rem", borderBottom: "1px solid #374151" }}>
        <div
          style={{
            maxWidth: "56rem",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h1 style={{ fontSize: "1.25rem", fontWeight: "600", margin: 0 }}>Driving Licence Authority</h1>
            <p style={{ fontSize: "0.875rem", color: "#9ca3af", margin: "0.25rem 0 0 0" }}>AI Voice Assistant - Ava</p>
          </div>
          {isCallActive && (
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div
                  style={{
                    width: "0.5rem",
                    height: "0.5rem",
                    backgroundColor: "#10b981",
                    borderRadius: "50%",
                    animation: "pulse 2s infinite",
                  }}
                />
                <span style={{ fontSize: "0.875rem", color: "#4ade80" }}>Call Active</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div
                  style={{
                    width: "0.5rem",
                    height: "0.5rem",
                    backgroundColor: isListening ? "#10b981" : isSpeaking ? "#3b82f6" : "#6b7280",
                    borderRadius: "50%",
                  }}
                />
                <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                  {isListening ? "Listening" : isSpeaking ? "Speaking" : "Ready"}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {!isVoiceSupported && (
        <div
          style={{
            backgroundColor: "#451a03",
            border: "1px solid #eab308",
            padding: "0.75rem",
            margin: "1rem",
            borderRadius: "0.5rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ color: "#facc15" }}>⚠️</span>
            <p style={{ color: "#fef08a", margin: 0 }}>
              Voice recognition is not supported in your browser. Please use Chrome, Edge, or Safari for the best
              experience.
            </p>
          </div>
        </div>
      )}

      {microphonePermission === "denied" && (
        <div
          style={{
            backgroundColor: "#450a0a",
            border: "1px solid #ef4444",
            padding: "0.75rem",
            margin: "1rem",
            borderRadius: "0.5rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ color: "#f87171" }}>⚠️</span>
            <p style={{ color: "#fecaca", margin: 0 }}>
              Microphone access is required for voice functionality. Please enable microphone permissions and refresh
              the page.
            </p>
          </div>
        </div>
      )}

      <div style={{ flex: 1, display: "flex", maxWidth: "56rem", margin: "0 auto", width: "100%" }}>
        {!isCallActive ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  width: "6rem",
                  height: "6rem",
                  margin: "0 auto 2rem auto",
                  background: "linear-gradient(to right, #3b82f6, #8b5cf6)",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span style={{ fontSize: "3rem" }}>📞</span>
              </div>
              <div>
                <h2 style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "1rem" }}>Ready to Assist You</h2>
                <p style={{ color: "#9ca3af", marginBottom: "2rem", maxWidth: "28rem" }}>
                  Start a natural conversation with Ava for all your driving licence needs.
                </p>
                <button
                  onClick={startCall}
                  style={{
                    background: "linear-gradient(to right, #3b82f6, #8b5cf6)",
                    color: "#fff",
                    padding: "0.75rem 2rem",
                    borderRadius: "0.375rem",
                    border: "none",
                    fontSize: "1rem",
                    fontWeight: "500",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  📞 Start Call
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ flex: 1, overflowY: "auto", padding: "1rem" }}>
              {messages.map((message) => (
                <div key={message.id} style={{ marginBottom: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                    <span style={{ fontSize: "0.875rem", color: "#9ca3af", textTransform: "capitalize" }}>
                      {message.sender}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                      {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div
                    style={{
                      padding: "1rem",
                      borderRadius: "1rem",
                      maxWidth: "48rem",
                      backgroundColor: message.sender === "user" ? "#1f2937" : "#111827",
                      border: message.sender === "user" ? "1px solid #374151" : "1px solid #1f2937",
                    }}
                  >
                    <p style={{ color: "#fff", lineHeight: "1.625", margin: 0 }}>{message.text}</p>
                  </div>
                </div>
              ))}

              {currentTranscript && (
                <div style={{ marginBottom: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                    <span style={{ fontSize: "0.875rem", color: "#9ca3af" }}>User</span>
                    <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>Speaking...</span>
                  </div>
                  <div
                    style={{
                      padding: "1rem",
                      borderRadius: "1rem",
                      maxWidth: "48rem",
                      backgroundColor: "#1f2937",
                      border: "1px solid #3b82f6",
                    }}
                  >
                    <p style={{ color: "#bfdbfe", margin: 0 }}>{currentTranscript}</p>
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: "1rem", borderTop: "1px solid #1f2937" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1rem" }}>
                <button
                  onClick={toggleListening}
                  disabled={!isVoiceSupported || microphonePermission === "denied"}
                  style={{
                    width: "3.5rem",
                    height: "3.5rem",
                    borderRadius: "50%",
                    border: "none",
                    backgroundColor: isListening ? "#ef4444" : "#10b981",
                    color: "#fff",
                    cursor: "pointer",
                    fontSize: "1.5rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: !isVoiceSupported || microphonePermission === "denied" ? 0.5 : 1,
                  }}
                >
                  {isListening ? "🔇" : "🎤"}
                </button>

                <button
                  onClick={endCall}
                  style={{
                    backgroundColor: "#dc2626",
                    color: "#fff",
                    padding: "0.75rem 1.5rem",
                    borderRadius: "9999px",
                    border: "none",
                    fontSize: "1rem",
                    fontWeight: "500",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  📞 End Call
                </button>
              </div>

              <div style={{ textAlign: "center", marginTop: "1rem" }}>
                <p style={{ fontSize: "0.875rem", color: "#9ca3af", margin: 0 }}>
                  {isSpeaking
                    ? "Ava is speaking..."
                    : isListening
                      ? "Listening... speak naturally"
                      : "Click the microphone to start listening"}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        * {
          box-sizing: border-box;
        }
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        }
      `}</style>
    </div>
  )
}
