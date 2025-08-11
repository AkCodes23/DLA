"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Mic, MicOff, Send, Volume2 } from "lucide-react"
import { AudioVisualizer } from "@/components/audio-visualizer"
import { ConversationEngine } from "@/lib/conversation-engine"
import { useConversation } from "@/hooks/use-conversation"

// Define speech recognition types inline to avoid any import issues
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

interface VoiceAssistantProps {
  isVoiceSupported: boolean
}

export function VoiceAssistant({ isVoiceSupported }: VoiceAssistantProps) {
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [textInput, setTextInput] = useState("")
  const [audioLevel, setAudioLevel] = useState(0)
  const [mode, setMode] = useState<"voice" | "text">("voice")

  const recognitionRef = useRef<SpeechRecognitionInline | null>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null)

  const { messages, addMessage, currentAppointment } = useConversation()
  const conversationEngine = useRef(new ConversationEngine())

  useEffect(() => {
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis

      if (isVoiceSupported) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        if (SpeechRecognition) {
          recognitionRef.current = new SpeechRecognition()
          recognitionRef.current!.continuous = true
          recognitionRef.current!.interimResults = true
          recognitionRef.current!.lang = "en-IN"
        }
      } else {
        setMode("text")
      }
    }

    // Initial greeting
    const greeting =
      "Hello! You've reached the Driving Licence Authority. This is Ava, your virtual assistant. How can I help you today?"
    addMessage("assistant", greeting)
    speak(greeting)

    return () => {
      stopListening()
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [isVoiceSupported])

  const setupAudioVisualization = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioContextRef.current = new AudioContext()
      analyserRef.current = audioContextRef.current.createAnalyser()
      microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream)

      microphoneRef.current.connect(analyserRef.current)
      analyserRef.current.fftSize = 256

      const updateAudioLevel = () => {
        if (analyserRef.current && isListening) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
          analyserRef.current.getByteFrequencyData(dataArray)
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length
          setAudioLevel(average / 255)
          requestAnimationFrame(updateAudioLevel)
        }
      }
      updateAudioLevel()
    } catch (error) {
      console.error("Error setting up audio visualization:", error)
    }
  }, [isListening])

  const speak = useCallback((text: string) => {
    if (!synthRef.current) return

    synthRef.current.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    const voices = synthRef.current.getVoices()
    const indianVoice = voices.find((voice) => voice.lang.includes("en-IN") || voice.name.includes("Indian"))
    const femaleVoice = voices.find(
      (voice) => voice.name.toLowerCase().includes("female") || voice.name.toLowerCase().includes("woman"),
    )

    utterance.voice = indianVoice || femaleVoice || voices[0]
    utterance.rate = 0.9
    utterance.pitch = 1.1

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)

    synthRef.current.speak(utterance)
  }, [])

  const startListening = useCallback(async () => {
    if (!recognitionRef.current || isListening) return

    try {
      await setupAudioVisualization()
      setIsListening(true)

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = ""
        let interimTranscript = ""

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript
          } else {
            interimTranscript += transcript
          }
        }

        if (finalTranscript) {
          handleUserInput(finalTranscript.trim())
          resetSilenceTimer()
        }
      }

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error)
        setIsListening(false)
        if (event.error === "not-allowed") {
          setMode("text")
        }
      }

      recognitionRef.current.onend = () => {
        setIsListening(false)
        setAudioLevel(0)
      }

      recognitionRef.current.start()
      resetSilenceTimer()
    } catch (error) {
      console.error("Error starting speech recognition:", error)
      setMode("text")
    }
  }, [isListening])

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
    }
    setIsListening(false)
    setAudioLevel(0)
    clearSilenceTimer()
  }, [isListening])

  const resetSilenceTimer = useCallback(() => {
    clearSilenceTimer()
    silenceTimerRef.current = setTimeout(() => {
      if (isListening) {
        stopListening()
      }
    }, 4000)
  }, [isListening, stopListening])

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
  }, [])

  const handleUserInput = useCallback(
    async (input: string) => {
      if (!input.trim()) return

      addMessage("user", input)

      const response = await conversationEngine.current.processInput(input)
      addMessage("assistant", response.message)

      speak(response.message)

      if (mode === "text") {
        setTextInput("")
      }
    },
    [addMessage, speak, mode],
  )

  const handleTextSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (textInput.trim()) {
        handleUserInput(textInput)
      }
    },
    [textInput, handleUserInput],
  )

  const toggleMode = useCallback(() => {
    setMode((prev) => (prev === "voice" ? "text" : "voice"))
    if (isListening) {
      stopListening()
    }
  }, [isListening, stopListening])

  return (
    <div className="space-y-6">
      <div className="flex justify-center space-x-4">
        <Button
          variant={mode === "voice" ? "default" : "outline"}
          onClick={() => setMode("voice")}
          disabled={!isVoiceSupported}
        >
          <Mic className="w-4 h-4 mr-2" />
          Voice Mode
        </Button>
        <Button variant={mode === "text" ? "default" : "outline"} onClick={() => setMode("text")}>
          <Send className="w-4 h-4 mr-2" />
          Text Mode
        </Button>
      </div>

      {mode === "voice" && (
        <div className="flex justify-center">
          <AudioVisualizer audioLevel={audioLevel} isListening={isListening} isSpeaking={isSpeaking} />
        </div>
      )}

      {mode === "voice" && (
        <div className="flex justify-center space-x-4">
          <Button
            size="lg"
            onClick={isListening ? stopListening : startListening}
            disabled={isSpeaking}
            className={isListening ? "bg-red-500 hover:bg-red-600" : "bg-blue-500 hover:bg-blue-600"}
          >
            {isListening ? (
              <>
                <MicOff className="w-5 h-5 mr-2" />
                Stop Listening
              </>
            ) : (
              <>
                <Mic className="w-5 h-5 mr-2" />
                Start Listening
              </>
            )}
          </Button>

          {isSpeaking && (
            <Button size="lg" variant="outline" onClick={() => synthRef.current?.cancel()}>
              <Volume2 className="w-5 h-5 mr-2" />
              Stop Speaking
            </Button>
          )}
        </div>
      )}

      {mode === "text" && (
        <form onSubmit={handleTextSubmit} className="flex space-x-2">
          <Input
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Type your message here..."
            className="flex-1"
            disabled={isSpeaking}
          />
          <Button type="submit" disabled={!textInput.trim() || isSpeaking}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      )}

      <div className="flex justify-center space-x-4 text-sm text-gray-600">
        {isListening && (
          <span className="flex items-center text-green-600">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2" />
            Listening...
          </span>
        )}
        {isSpeaking && (
          <span className="flex items-center text-blue-600">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mr-2" />
            Ava is speaking...
          </span>
        )}
      </div>

      {currentAppointment && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <h3 className="font-semibold text-green-800 mb-2">Current Booking</h3>
            <div className="text-sm text-green-700">
              <p>
                <strong>Service:</strong> {currentAppointment.service}
              </p>
              <p>
                <strong>Name:</strong> {currentAppointment.name}
              </p>
              <p>
                <strong>Date:</strong> {currentAppointment.date}
              </p>
              <p>
                <strong>Time:</strong> {currentAppointment.time}
              </p>
              <p>
                <strong>Contact:</strong> {currentAppointment.contact}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
