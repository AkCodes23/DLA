export interface EmotionData {
  name: string
  score: number
  color: string
}

export class EmotionAnalyzer {
  private emotionKeywords = {
    excitement: {
      keywords: ["excited", "amazing", "fantastic", "wonderful", "great", "awesome", "love", "perfect"],
      color: "#fbbf24", // yellow
    },
    interest: {
      keywords: ["interested", "curious", "want", "need", "tell", "know", "learn", "understand"],
      color: "#3b82f6", // blue
    },
    determination: {
      keywords: ["will", "must", "need", "have to", "important", "urgent", "definitely", "absolutely"],
      color: "#f97316", // orange
    },
    satisfaction: {
      keywords: ["good", "fine", "okay", "satisfied", "happy", "pleased", "thank", "thanks"],
      color: "#10b981", // green
    },
    concern: {
      keywords: ["worried", "concerned", "problem", "issue", "trouble", "difficult", "help", "confused"],
      color: "#ef4444", // red
    },
    politeness: {
      keywords: ["please", "thank you", "sorry", "excuse me", "could you", "would you", "may I"],
      color: "#8b5cf6", // purple
    },
  }

  analyzeText(text: string): EmotionData[] {
    const lowerText = text.toLowerCase()
    const emotions: EmotionData[] = []

    for (const [emotionName, emotionData] of Object.entries(this.emotionKeywords)) {
      let score = 0
      let matchCount = 0

      for (const keyword of emotionData.keywords) {
        if (lowerText.includes(keyword)) {
          matchCount++
          // Weight longer keywords more heavily
          score += keyword.length / 10
        }
      }

      if (matchCount > 0) {
        // Normalize score based on text length and keyword matches
        const normalizedScore = Math.min(1, (score * matchCount) / (text.split(" ").length * 0.5))

        emotions.push({
          name: emotionName.charAt(0).toUpperCase() + emotionName.slice(1),
          score: normalizedScore,
          color: emotionData.color,
        })
      }
    }

    // Sort by score and return top emotions
    return emotions.sort((a, b) => b.score - a.score).slice(0, 3)
  }

  // Simulate real-time emotion analysis from audio (placeholder)
  analyzeAudio(audioData: Float32Array): EmotionData[] {
    // This would integrate with actual emotion detection APIs like Hume AI
    // For now, return mock data based on audio intensity
    const intensity = audioData.reduce((sum, val) => sum + Math.abs(val), 0) / audioData.length

    const mockEmotions: EmotionData[] = []

    if (intensity > 0.1) {
      mockEmotions.push({
        name: "Engagement",
        score: Math.min(1, intensity * 2),
        color: "#3b82f6",
      })
    }

    if (intensity > 0.15) {
      mockEmotions.push({
        name: "Confidence",
        score: Math.min(1, intensity * 1.5),
        color: "#10b981",
      })
    }

    return mockEmotions
  }
}
