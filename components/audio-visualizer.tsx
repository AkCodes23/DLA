"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

interface AudioVisualizerProps {
  audioLevel: number
  isListening: boolean
  isSpeaking: boolean
}

export function AudioVisualizer({ audioLevel, isListening, isSpeaking }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const centerX = canvas.width / 2
      const centerY = canvas.height / 2
      const baseRadius = 60
      const time = Date.now() * 0.003

      // Main circle with pulsing effect
      const mainRadius = baseRadius + (isListening ? audioLevel * 40 : 0) + Math.sin(time) * 5

      // Create gradient based on state
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, mainRadius)

      if (isSpeaking) {
        gradient.addColorStop(0, "rgba(59, 130, 246, 0.9)")
        gradient.addColorStop(0.7, "rgba(147, 51, 234, 0.6)")
        gradient.addColorStop(1, "rgba(147, 51, 234, 0.1)")
      } else if (isListening) {
        gradient.addColorStop(0, "rgba(34, 197, 94, 0.9)")
        gradient.addColorStop(0.7, "rgba(59, 130, 246, 0.6)")
        gradient.addColorStop(1, "rgba(59, 130, 246, 0.1)")
      } else {
        gradient.addColorStop(0, "rgba(156, 163, 175, 0.7)")
        gradient.addColorStop(0.7, "rgba(107, 114, 128, 0.4)")
        gradient.addColorStop(1, "rgba(107, 114, 128, 0.1)")
      }

      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(centerX, centerY, mainRadius, 0, 2 * Math.PI)
      ctx.fill()

      // Outer ripple rings
      if (isListening || isSpeaking) {
        for (let i = 1; i <= 4; i++) {
          const ringRadius = mainRadius + i * 20 + Math.sin(time + i) * 10
          const opacity = Math.max(0, 0.4 - i * 0.1 - audioLevel * 0.3)

          ctx.strokeStyle = isSpeaking ? `rgba(147, 51, 234, ${opacity})` : `rgba(34, 197, 94, ${opacity})`
          ctx.lineWidth = 3
          ctx.beginPath()
          ctx.arc(centerX, centerY, ringRadius, 0, 2 * Math.PI)
          ctx.stroke()
        }
      }

      // Inner core
      const coreRadius = 25 + (isListening ? audioLevel * 10 : 0)
      const coreGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, coreRadius)

      if (isSpeaking) {
        coreGradient.addColorStop(0, "rgba(255, 255, 255, 1)")
        coreGradient.addColorStop(1, "rgba(59, 130, 246, 0.8)")
      } else if (isListening) {
        coreGradient.addColorStop(0, "rgba(255, 255, 255, 1)")
        coreGradient.addColorStop(1, "rgba(34, 197, 94, 0.8)")
      } else {
        coreGradient.addColorStop(0, "rgba(255, 255, 255, 0.9)")
        coreGradient.addColorStop(1, "rgba(156, 163, 175, 0.6)")
      }

      ctx.fillStyle = coreGradient
      ctx.beginPath()
      ctx.arc(centerX, centerY, coreRadius, 0, 2 * Math.PI)
      ctx.fill()

      // Microphone icon
      ctx.fillStyle = isListening || isSpeaking ? "#000000" : "#374151"
      ctx.font = "32px Arial"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText("🎤", centerX, centerY)

      animationRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [audioLevel, isListening, isSpeaking])

  return (
    <div className="relative">
      <canvas ref={canvasRef} width={300} height={300} className="rounded-full" />

      {/* Status text overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center mt-32">
          <p
            className={cn(
              "text-lg font-semibold transition-colors duration-200",
              isSpeaking ? "text-blue-300" : isListening ? "text-green-300" : "text-gray-300",
            )}
          >
            {isSpeaking ? "Ava is speaking..." : isListening ? "Listening..." : "Ready"}
          </p>
          {isListening && <p className="text-sm text-gray-400 mt-1">Speak naturally, I'm listening</p>}
        </div>
      </div>
    </div>
  )
}
