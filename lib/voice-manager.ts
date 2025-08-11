export interface VoiceOptions {
  onStart?: () => void
  onEnd?: () => void
  onError?: (error: Error) => void
}

export class VoiceManager {
  private synthesis: SpeechSynthesis | null = null
  private currentUtterance: SpeechSynthesisUtterance | null = null
  private voices: SpeechSynthesisVoice[] = []
  private isInitialized = false
  private isSpeaking = false

  initialize() {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      this.synthesis = window.speechSynthesis
      this.isInitialized = true

      // Load voices with retry mechanism
      const loadVoices = () => {
        this.voices = this.synthesis?.getVoices() || []

        // If no voices loaded yet, try again
        if (this.voices.length === 0) {
          setTimeout(loadVoices, 100)
        }
      }

      loadVoices()

      if (this.synthesis.onvoiceschanged !== undefined) {
        this.synthesis.onvoiceschanged = loadVoices
      }

      // Handle browser tab visibility changes
      document.addEventListener("visibilitychange", () => {
        if (document.hidden && this.isSpeaking) {
          this.stop()
        }
      })
    }
  }

  private selectBestVoice(): SpeechSynthesisVoice | null {
    if (!this.voices.length) {
      // Force reload voices if empty
      this.voices = this.synthesis?.getVoices() || []
    }

    if (!this.voices.length) return null

    // Priority order for voice selection
    const priorities = [
      // Indian English voices
      (voice: SpeechSynthesisVoice) => voice.lang.includes("en-IN") && voice.name.toLowerCase().includes("female"),
      (voice: SpeechSynthesisVoice) => voice.lang.includes("en-IN"),

      // High-quality English voices
      (voice: SpeechSynthesisVoice) =>
        voice.lang.includes("en-") &&
        (voice.name.toLowerCase().includes("neural") ||
          voice.name.toLowerCase().includes("premium") ||
          voice.name.toLowerCase().includes("enhanced")),

      // Female English voices
      (voice: SpeechSynthesisVoice) =>
        voice.lang.includes("en-") &&
        (voice.name.toLowerCase().includes("female") ||
          voice.name.toLowerCase().includes("woman") ||
          voice.name.toLowerCase().includes("zira") ||
          voice.name.toLowerCase().includes("hazel") ||
          voice.name.toLowerCase().includes("samantha")),

      // Any English voice
      (voice: SpeechSynthesisVoice) => voice.lang.includes("en-"),

      // Fallback to any voice
      () => true,
    ]

    for (const priority of priorities) {
      const voice = this.voices.find(priority)
      if (voice) return voice
    }

    return this.voices[0] || null
  }

  async speak(text: string, options: VoiceOptions = {}): Promise<void> {
    if (!this.synthesis || !this.isInitialized) {
      const error = new Error("Speech synthesis not available")
      options.onError?.(error)
      return Promise.reject(error)
    }

    // Clean stop any ongoing speech
    this.stop()

    return new Promise((resolve, reject) => {
      try {
        const utterance = new SpeechSynthesisUtterance(text)
        this.currentUtterance = utterance
        this.isSpeaking = true

        // Select the best available voice
        const selectedVoice = this.selectBestVoice()
        if (selectedVoice) {
          utterance.voice = selectedVoice
        }

        // Configure speech parameters for natural sound
        utterance.rate = 0.9
        utterance.pitch = 1.1
        utterance.volume = 0.8

        // Event handlers with error protection
        utterance.onstart = () => {
          try {
            options.onStart?.()
          } catch (error) {
            console.warn("Error in onStart callback:", error)
          }
        }

        utterance.onend = () => {
          this.currentUtterance = null
          this.isSpeaking = false
          try {
            options.onEnd?.()
          } catch (error) {
            console.warn("Error in onEnd callback:", error)
          }
          resolve()
        }

        utterance.onerror = (event) => {
          this.currentUtterance = null
          this.isSpeaking = false

          // Handle different error types
          let errorMessage = `Speech synthesis error: ${event.error}`

          if (event.error === "interrupted") {
            // Don't treat interruption as a real error
            console.log("Speech was interrupted (normal behavior)")
            resolve() // Resolve instead of reject for interruptions
            return
          }

          if (event.error === "network") {
            errorMessage = "Network error during speech synthesis"
          } else if (event.error === "synthesis-failed") {
            errorMessage = "Speech synthesis failed"
          }

          const error = new Error(errorMessage)
          try {
            options.onError?.(error)
          } catch (callbackError) {
            console.warn("Error in onError callback:", callbackError)
          }
          reject(error)
        }

        // Add natural pauses for better flow
        const processedText = this.addNaturalPauses(text)
        utterance.text = processedText

        // Ensure synthesis is ready before speaking
        if (this.synthesis.paused) {
          this.synthesis.resume()
        }

        this.synthesis.speak(utterance)

        // Fallback timeout to prevent hanging
        setTimeout(
          () => {
            if (this.currentUtterance === utterance && this.isSpeaking) {
              console.warn("Speech synthesis timeout, resolving")
              this.stop()
              resolve()
            }
          },
          text.length * 100 + 5000,
        ) // Estimate based on text length + buffer
      } catch (error) {
        this.currentUtterance = null
        this.isSpeaking = false
        const synthError = new Error(`Failed to start speech synthesis: ${error}`)
        options.onError?.(synthError)
        reject(synthError)
      }
    })
  }

  stop() {
    if (this.synthesis) {
      try {
        this.synthesis.cancel()
      } catch (error) {
        console.warn("Error canceling speech:", error)
      }
    }
    this.currentUtterance = null
    this.isSpeaking = false
  }

  private addNaturalPauses(text: string): string {
    return (
      text
        // Add slight pause after commas
        .replace(/,/g, ", ")
        // Add pause after periods
        .replace(/\./g, ". ")
        // Add pause after question marks
        .replace(/\?/g, "? ")
        // Add pause after exclamation marks
        .replace(/!/g, "! ")
        // Add pause after colons
        .replace(/:/g, ": ")
        // Clean up multiple spaces
        .replace(/\s+/g, " ")
        .trim()
    )
  }

  getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.voices
  }

  isSpeakingNow(): boolean {
    return this.isSpeaking && (this.synthesis?.speaking || false)
  }

  // Get synthesis status
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isSpeaking: this.isSpeaking,
      voicesCount: this.voices.length,
      synthesisPaused: this.synthesis?.paused || false,
      synthesisSpeaking: this.synthesis?.speaking || false,
    }
  }
}
