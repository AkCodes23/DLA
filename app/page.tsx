"use client"

import { useState, useEffect, useRef, useCallback } from "react"

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

const translations = {
  en: {
    title: "Driving Licence Authority",
    subtitle: "AI Voice Assistant - Ava",
    callActive: "Call Active",
    listening: "Listening",
    speaking: "Speaking",
    ready: "Ready",
    browserNotice: "Browser Compatibility Notice",
    browserMessage: "Voice recognition requires Chrome, Edge, or Safari for optimal experience.",
    microphoneRequired: "Microphone Access Required",
    microphoneMessage: "Please enable microphone permissions and refresh the page to use voice features.",
    readyTitle: "Ready to Assist You",
    readyMessage:
      "Start a natural conversation with Ava for all your driving licence needs. Get instant help with applications, renewals, and more.",
    startConversation: "Start Conversation",
    you: "You",
    ava: "Ava",
    speakingStatus: "Speaking...",
    endCall: "End Call",
    avaIsSpeaking: "Ava is speaking...",
    listeningPrompt: "Listening... speak naturally",
    clickMicrophone: "Microphone is active - speak anytime",
    greeting:
      "Hello! Welcome to the Driving Licence Authority. I'm Ava, your virtual assistant. How can I help you today?",
    language: "Language",
    micOn: "Microphone On",
    micOff: "Microphone Off",
  },
  ar: {
    title: "هيئة رخص القيادة",
    subtitle: "المساعد الصوتي الذكي - آفا",
    callActive: "المكالمة نشطة",
    listening: "أستمع",
    speaking: "أتحدث",
    ready: "جاهز",
    browserNotice: "إشعار توافق المتصفح",
    browserMessage: "يتطلب التعرف على الصوت متصفح Chrome أو Edge أو Safari للحصول على أفضل تجربة.",
    microphoneRequired: "مطلوب الوصول للميكروفون",
    microphoneMessage: "يرجى تمكين أذونات الميكروفون وإعادة تحديث الصفحة لاستخدام ميزات الصوت.",
    readyTitle: "جاهز لمساعدتك",
    readyMessage:
      "ابدأ محادثة طبيعية مع آفا لجميع احتياجات رخصة القيادة الخاصة بك. احصل على مساعدة فورية في الطلبات والتجديدات والمزيد.",
    startConversation: "بدء المحادثة",
    you: "أنت",
    ava: "آفا",
    speakingStatus: "يتحدث...",
    endCall: "إنهاء المكالمة",
    avaIsSpeaking: "آفا تتحدث...",
    listeningPrompt: "أستمع... تحدث بشكل طبيعي",
    clickMicrophone: "الميكروفون نشط - تحدث في أي وقت",
    greeting: "مرحباً! أهلاً بك في هيئة رخص القيادة. أنا آفا، مساعدتك الافتراضية. كيف يمكنني مساعدتك اليوم؟",
    language: "اللغة",
    micOn: "الميكروفون مفتوح",
    micOff: "الميكروفون مغلق",
  },
}

export default function Home() {
  const [isCallActive, setIsCallActive] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [currentTranscript, setCurrentTranscript] = useState("")
  const [isVoiceSupported, setIsVoiceSupported] = useState(false)
  const [microphonePermission, setMicrophonePermission] = useState<"granted" | "denied" | "prompt">("prompt")
  const [language, setLanguage] = useState<"en" | "ar">("en")
  const [microphoneEnabled, setMicrophoneEnabled] = useState(true) // Added microphone toggle state

  const recognitionRef = useRef<SpeechRecognitionInline | null>(null)
  const isCallActiveRef = useRef(false)
  const isSpeakingRef = useRef(false)
  const microphoneEnabledRef = useRef(true)
  const lastProcessedResultRef = useRef(0) // Added ref to track last processed result index to prevent duplicate processing

  useEffect(() => {
    isCallActiveRef.current = isCallActive
  }, [isCallActive])

  useEffect(() => {
    isSpeakingRef.current = isSpeaking
  }, [isSpeaking])

  useEffect(() => {
    microphoneEnabledRef.current = microphoneEnabled
  }, [microphoneEnabled])

  const t = translations[language]

  const addMessage = useCallback((sender: "user" | "assistant", text: string) => {
    const message: Message = {
      id: `${sender}-${Date.now()}`,
      text,
      sender,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, message])
  }, [])

  const speak = useCallback(
    (text: string) => {
      console.log("[v0] Starting speech synthesis:", { text, language })

      if (recognitionRef.current && isListening) {
        try {
          recognitionRef.current.stop()
          console.log("[v0] Pausing speech recognition during AI speech")
        } catch (error) {
          console.error("[v0] Failed to pause speech recognition:", error)
        }
      }

      if (typeof window !== "undefined" && window.speechSynthesis) {
        const speakWithVoice = () => {
          const utterance = new SpeechSynthesisUtterance(text)
          utterance.rate = 0.9
          utterance.pitch = 1.1

          const voices = window.speechSynthesis.getVoices()
          console.log("[v0] Available voices:", voices.length)

          if (language === "ar") {
            const arabicFemaleVoice =
              voices.find(
                (voice) =>
                  (voice.lang.startsWith("ar") || voice.name.toLowerCase().includes("arabic")) &&
                  (voice.name.toLowerCase().includes("female") ||
                    voice.name.toLowerCase().includes("woman") ||
                    voice.name.toLowerCase().includes("zira") ||
                    voice.name.toLowerCase().includes("hoda")),
              ) ||
              voices.find((voice) => voice.lang.startsWith("ar") && voice.name.toLowerCase().includes("female")) ||
              voices.find((voice) => voice.lang.startsWith("ar"))

            if (arabicFemaleVoice) {
              utterance.voice = arabicFemaleVoice
              console.log("[v0] Selected Arabic voice:", arabicFemaleVoice.name)
            } else {
              console.log("[v0] No Arabic voice found, using default")
            }
            utterance.lang = "ar-SA"
          } else {
            const englishFemaleVoice =
              voices.find(
                (voice) =>
                  voice.lang.startsWith("en") &&
                  (voice.name.toLowerCase().includes("female") ||
                    voice.name.toLowerCase().includes("woman") ||
                    voice.name.toLowerCase().includes("samantha") ||
                    voice.name.toLowerCase().includes("karen") ||
                    voice.name.toLowerCase().includes("susan") ||
                    voice.name.toLowerCase().includes("victoria") ||
                    voice.name.toLowerCase().includes("allison") ||
                    voice.name.toLowerCase().includes("ava") ||
                    voice.name.toLowerCase().includes("serena") ||
                    voice.name.toLowerCase().includes("zira")),
              ) ||
              voices.find((voice) => voice.lang.startsWith("en") && voice.name.toLowerCase().includes("female")) ||
              voices.find((voice) => voice.lang.startsWith("en") && !voice.name.toLowerCase().includes("male")) ||
              voices.find((voice) => voice.lang.startsWith("en"))

            if (englishFemaleVoice) {
              utterance.voice = englishFemaleVoice
              console.log("[v0] Selected English voice:", englishFemaleVoice.name)
            } else {
              console.log("[v0] No English female voice found, using default")
            }
            utterance.lang = "en-US"
          }

          utterance.onstart = () => {
            console.log("[v0] Speech started")
            setIsSpeaking(true)
          }
          utterance.onend = () => {
            console.log("[v0] Speech ended")
            setIsSpeaking(false)
          }
          utterance.onerror = (error) => {
            console.log("[v0] Speech synthesis error details:", {
              error: error.error,
              type: error.type,
              target: error.target,
              timeStamp: error.timeStamp,
            })

            // Handle specific error types
            if (error.error === "network") {
              console.log("[v0] Network error during speech synthesis - will retry")
              // Retry after a short delay
              setTimeout(() => {
                try {
                  window.speechSynthesis.cancel()
                  window.speechSynthesis.speak(utterance)
                } catch (retryError) {
                  console.error("[v0] Speech synthesis retry failed:", retryError)
                  setIsSpeaking(false)
                }
              }, 1000)
            } else if (error.error === "synthesis-failed") {
              console.log("[v0] Speech synthesis failed - text may be too long or invalid")
              setIsSpeaking(false)
            } else if (error.error === "synthesis-unavailable") {
              console.log("[v0] Speech synthesis unavailable - using fallback")
              setIsSpeaking(false)
            } else {
              console.log("[v0] Speech synthesis error:", error.error || "Unknown error")
              setIsSpeaking(false)
            }
          }

          utterance.onboundary = null

          try {
            window.speechSynthesis.speak(utterance)
          } catch (speakError) {
            console.error("[v0] Failed to start speech synthesis:", speakError)
            setIsSpeaking(false)
          }
        }

        const voices = window.speechSynthesis.getVoices()
        if (voices.length === 0) {
          console.log("[v0] Waiting for voices to load...")
          window.speechSynthesis.onvoiceschanged = () => {
            console.log("[v0] Voices loaded, proceeding with speech")
            speakWithVoice()
            window.speechSynthesis.onvoiceschanged = null // Remove listener after use
          }
        } else {
          speakWithVoice()
        }
      } else {
        console.error("[v0] Speech synthesis not supported")
      }
    },
    [language], // Removed isListening dependency to simplify
  )

  const processUserInput = useCallback(
    async (input: string) => {
      if (!input.trim()) return

      console.log("[v0] Processing user input:", input)

      const userMessage: Message = {
        id: `user-${Date.now()}`,
        text: input,
        sender: "user" as const,
        timestamp: new Date(),
      }

      // Update messages with user input
      setMessages((prev) => {
        const updatedMessages = [...prev, userMessage]
        console.log("[v0] Updated conversation history:", updatedMessages.length, "messages")

        const processAIResponse = async () => {
          try {
            console.log("[v0] Calling AI API...")
            setIsSpeaking(true)

            const response = await fetch("/api/chat", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                message: input,
                language: language,
                conversationHistory: updatedMessages, // Use updated messages for context
              }),
            })

            console.log("[v0] API response status:", response.status)

            if (!response.ok) {
              throw new Error(`API request failed with status ${response.status}`)
            }

            const data = await response.json()
            console.log("[v0] AI response received:", data)

            if (data.error) {
              throw new Error(data.error)
            }

            const aiResponse = data.response
            const assistantMessage: Message = {
              id: `assistant-${Date.now()}`,
              text: aiResponse,
              sender: "assistant" as const,
              timestamp: new Date(),
            }

            console.log("[v0] Adding AI response to conversation")
            setMessages((prevMessages) => [...prevMessages, assistantMessage])
            speak(aiResponse)
          } catch (error) {
            console.error("[v0] AI processing error:", error)

            const fallbackResponse =
              language === "ar"
                ? "عذراً، أواجه مشكلة تقنية. كيف يمكنني مساعدتك في خدمات رخصة القيادة؟"
                : "I'm experiencing a technical issue. How can I help you with driving licence services?"

            const errorMessage: Message = {
              id: `assistant-error-${Date.now()}`,
              text: fallbackResponse,
              sender: "assistant" as const,
              timestamp: new Date(),
            }

            console.log("[v0] Using fallback response due to error")
            setMessages((prevMessages) => [...prevMessages, errorMessage])
            speak(fallbackResponse)
          } finally {
            setIsSpeaking(false)
          }
        }

        processAIResponse()
        return updatedMessages
      })
    },
    [speak, language], // Removed messages dependency to avoid circular dependency
  )

  const initializeSpeechRecognition = useCallback(() => {
    console.log("[v0] Initializing speech recognition for language:", language)

    if (typeof window === "undefined") {
      console.log("[v0] Window undefined, cannot initialize speech recognition")
      return false
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      console.log("[v0] Speech recognition not supported in this browser")
      return false
    }

    try {
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = language === "ar" ? "ar-SA" : "en-US"

      console.log("[v0] Speech recognition configured for:", recognition.lang)

      recognition.onstart = () => {
        console.log("[v0] Speech recognition started")
        setIsListening(true)
        setCurrentTranscript("")
        lastProcessedResultRef.current = 0
      }

      recognition.onend = () => {
        console.log("[v0] Speech recognition ended")
        setIsListening(false)
        setCurrentTranscript("")
        lastProcessedResultRef.current = 0

        if (isCallActiveRef.current && microphoneEnabledRef.current && !isSpeakingRef.current) {
          console.log("[v0] Auto-restarting speech recognition...")
          setTimeout(() => {
            try {
              if (
                recognitionRef.current &&
                isCallActiveRef.current &&
                microphoneEnabledRef.current &&
                !isSpeakingRef.current
              ) {
                recognitionRef.current.start()
              }
            } catch (error) {
              console.error("[v0] Failed to restart recognition:", error)
            }
          }, 500)
        }
      }

      recognition.onerror = (event: any) => {
        if (event.error === "not-allowed") {
          console.log("[v0] Microphone permission denied")
          setMicrophonePermission("denied")
          setIsListening(false)
          setCurrentTranscript("")
        } else if (event.error === "no-speech") {
          setCurrentTranscript("")
        } else if (event.error === "audio-capture") {
          console.error("[v0] Audio capture error - microphone may be unavailable")
          setMicrophonePermission("denied")
          setIsListening(false)
          setCurrentTranscript("")
        } else if (event.error === "network") {
          console.error("[v0] Network error - will retry automatically")
          setIsListening(false)
          setCurrentTranscript("")
        } else {
          console.error("[v0] Speech recognition error:", event.error)
          setIsListening(false)
          setCurrentTranscript("")
        }
      }

      recognition.onresult = (event: any) => {
        if (isSpeakingRef.current) {
          console.log("[v0] Ignoring speech input while AI is speaking")
          return
        }

        let interimTranscript = ""
        let finalTranscript = ""

        for (let i = lastProcessedResultRef.current; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript
            lastProcessedResultRef.current = i + 1
          } else {
            interimTranscript += transcript
          }
        }

        setCurrentTranscript(interimTranscript)

        if (finalTranscript.trim()) {
          console.log("[v0] Final transcript received:", finalTranscript.trim())
          setCurrentTranscript("")
          processUserInput(finalTranscript.trim())
        }
      }

      recognitionRef.current = recognition
      console.log("[v0] Speech recognition initialized successfully")
      return true
    } catch (error) {
      console.error("[v0] Speech recognition initialization failed:", error)
      return false
    }
  }, [processUserInput, language])

  const startCall = useCallback(async () => {
    console.log("[v0] Starting call...")

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
      console.log("[v0] Microphone access granted")
      setMicrophonePermission("granted")
    } catch (error) {
      console.error("[v0] Microphone access denied:", error)
      setMicrophonePermission("denied")
    }

    setIsCallActive(true)
    setMessages([])
    setMicrophoneEnabled(true) // Enable microphone by default when starting call

    const speechInitialized = initializeSpeechRecognition()
    setIsVoiceSupported(speechInitialized)
    console.log("[v0] Voice support:", speechInitialized)

    const greeting = t.greeting
    console.log("[v0] Playing greeting:", greeting)
    addMessage("assistant", greeting)
    speak(greeting)

    if (speechInitialized && recognitionRef.current) {
      setTimeout(() => {
        console.log("[v0] Starting speech recognition after greeting...")
        try {
          recognitionRef.current?.start()
        } catch (error) {
          console.error("Failed to start recognition:", error)
        }
      }, 3000)
    }
  }, [initializeSpeechRecognition, addMessage, speak, t])

  const endCall = useCallback(() => {
    setIsCallActive(false)
    setIsListening(false)
    setIsSpeaking(false)
    setMessages([])
    setCurrentTranscript("")
    setMicrophoneEnabled(false) // Disable microphone when ending call

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

  const toggleMicrophone = useCallback(() => {
    const newMicState = !microphoneEnabled
    setMicrophoneEnabled(newMicState)

    console.log("[v0] Toggling microphone:", newMicState ? "ON" : "OFF")

    if (recognitionRef.current) {
      try {
        if (newMicState) {
          if (!isSpeakingRef.current) {
            recognitionRef.current.start()
          }
        } else {
          recognitionRef.current.stop()
        }
      } catch (error) {
        console.error("Failed to toggle microphone:", error)
      }
    }
  }, [microphoneEnabled])

  const handleLanguageChange = useCallback(
    (newLanguage: "en" | "ar") => {
      setLanguage(newLanguage)
      if (isCallActive && recognitionRef.current) {
        try {
          recognitionRef.current.stop()
          setTimeout(() => {
            initializeSpeechRecognition()
          }, 500)
        } catch (error) {
          console.error("Failed to restart recognition with new language:", error)
        }
      }
    },
    [isCallActive, initializeSpeechRecognition],
  )

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      const isSupported = !!SpeechRecognition
      console.log("[v0] Browser voice support check:", isSupported)
      setIsVoiceSupported(isSupported)
    }
  }, [])

  return (
    <div
      className={`min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900 text-foreground flex flex-col ${language === "ar" ? "rtl" : "ltr"}`}
      dir={language === "ar" ? "rtl" : "ltr"}
    >
      <header className="glass-effect border-b border-border/50 backdrop-blur-xl bg-white/80 dark:bg-slate-900/80">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent">
                  {t.title}
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">{t.subtitle}</p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{t.language}:</span>
                <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
                  <button
                    onClick={() => handleLanguageChange("en")}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${
                      language === "en"
                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                    }`}
                  >
                    EN
                  </button>
                  <button
                    onClick={() => handleLanguageChange("ar")}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${
                      language === "ar"
                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                    }`}
                  >
                    العربية
                  </button>
                </div>
              </div>

              {isCallActive && (
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50" />
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">{t.callActive}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-3 h-3 rounded-full transition-all duration-300 ${
                        isListening && microphoneEnabled
                          ? "bg-blue-500 shadow-lg shadow-blue-500/50 listening"
                          : isSpeaking
                            ? "bg-indigo-500 shadow-lg shadow-indigo-500/50 speaking"
                            : "bg-slate-400 dark:bg-slate-500"
                      }`}
                    />
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      {isListening && microphoneEnabled ? t.listening : isSpeaking ? t.speaking : t.ready}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {!isVoiceSupported && (
        <div className="mx-6 mt-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5">
              <svg fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-amber-800 dark:text-amber-200">{t.browserNotice}</h3>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">{t.browserMessage}</p>
            </div>
          </div>
        </div>
      )}

      {microphonePermission === "denied" && (
        <div className="mx-6 mt-4 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5">
              <svg fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 001.414 1.414l2 2a1 1 0 001.414 0l4-4a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-red-800 dark:text-red-200">{t.microphoneRequired}</h3>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">{t.microphoneMessage}</p>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 flex max-w-7xl mx-auto w-full">
        {!isCallActive && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-lg">
              <div className="relative mb-8">
                <div className="w-36 h-36 mx-auto rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 flex items-center justify-center shadow-2xl shadow-blue-500/25">
                  <div className="w-20 h-20 text-white">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.75 6a3.75 3.75 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
                      />
                    </svg>
                  </div>
                </div>
                <div className="absolute -inset-6 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-full blur-2xl -z-10"></div>
              </div>

              <div className="space-y-6">
                <div>
                  <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent mb-3">
                    {t.readyTitle}
                  </h2>
                  <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">{t.readyMessage}</p>
                </div>

                <button
                  onClick={startCall}
                  className="group relative inline-flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-2xl text-lg font-semibold shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300 hover:scale-105"
                >
                  <div className="w-6 h-6">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
                      />
                    </svg>
                  </div>
                  {t.startConversation}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-white/20 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </button>
              </div>
            </div>
          </div>
        )}

        {isCallActive && (
          <div className="flex-1 flex flex-col">
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center space-y-8">
                {/* Voice status indicator */}
                <div className="relative">
                  <div
                    className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center transition-all duration-300 ${
                      isListening && microphoneEnabled
                        ? "bg-blue-600 shadow-2xl shadow-blue-500/50"
                        : isSpeaking
                          ? "bg-indigo-600 shadow-2xl shadow-indigo-500/50"
                          : "bg-slate-600 shadow-xl shadow-slate-500/25"
                    }`}
                  >
                    <div className="w-16 h-16 text-white">
                      {isListening && microphoneEnabled ? (
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"
                          />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 01-14 0v-2" />
                          <line x1="12" y1="19" x2="12" y2="23" />
                          <line x1="8" y1="23" x2="16" y2="23" />
                        </svg>
                      ) : isSpeaking ? (
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                          />
                        </svg>
                      ) : (
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                          />
                        </svg>
                      )}
                    </div>
                    {isListening && microphoneEnabled && (
                      <div className="absolute inset-0 rounded-full bg-blue-400/30 animate-ping"></div>
                    )}
                  </div>
                </div>

                {/* Status text */}
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                    {isSpeaking
                      ? t.avaIsSpeaking
                      : isListening && microphoneEnabled
                        ? t.listeningPrompt
                        : microphoneEnabled
                          ? t.clickMicrophone
                          : `${t.micOff}`}
                  </h3>

                  {/* Current transcript display */}
                  {currentTranscript && (
                    <div className="max-w-2xl mx-auto p-4 rounded-2xl bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700">
                      <p className="text-blue-800 dark:text-blue-200 font-medium text-lg">{currentTranscript}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="glass-effect border-t border-border/50 p-6 bg-white/80 dark:bg-slate-900/80">
              <div className="flex items-center justify-center gap-6">
                <button
                  onClick={toggleMicrophone}
                  disabled={!isVoiceSupported || microphonePermission === "denied"}
                  className={`relative w-16 h-16 rounded-full border-none text-white cursor-pointer text-2xl flex items-center justify-center transition-all duration-300 shadow-lg ${
                    microphoneEnabled
                      ? "bg-blue-600 hover:bg-blue-700 shadow-blue-500/25"
                      : "bg-slate-500 hover:bg-slate-600 shadow-slate-500/25"
                  } ${!isVoiceSupported || microphonePermission === "denied" ? "opacity-50 cursor-not-allowed" : "hover:scale-105"}`}
                >
                  <div className="w-6 h-6">
                    {microphoneEnabled ? (
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"
                        />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 01-14 0v-2" />
                        <line x1="12" y1="19" x2="12" y2="23" />
                        <line x1="8" y1="23" x2="16" y2="23" />
                      </svg>
                    ) : (
                      <svg fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                  {isListening && microphoneEnabled && (
                    <div className="absolute inset-0 rounded-full bg-blue-400/30 animate-ping"></div>
                  )}
                </button>

                <button
                  onClick={endCall}
                  className="group relative bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 shadow-lg shadow-red-500/25 flex items-center gap-2"
                >
                  <div className="w-5 h-5">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                  </div>
                  {t.endCall}
                </button>
              </div>

              <div className="text-center mt-4">
                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                  {isSpeaking
                    ? t.avaIsSpeaking
                    : isListening && microphoneEnabled
                      ? t.listeningPrompt
                      : microphoneEnabled
                        ? t.clickMicrophone
                        : `${t.micOff} - ${language === "ar" ? "انقر لتشغيل الميكروفون" : "Click to enable microphone"}`}
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
