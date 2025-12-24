// AI Configuration
// Configure your backend endpoint here when ready

export const AI_CONFIG = {
  // Change this to your actual backend URL when deployed
  // Example: "https://your-project.supabase.co/functions/v1/ai-assistant"
  endpoint: import.meta.env.VITE_AI_ENDPOINT || "/api/ai-assistant",
  
  // Default model to use
  defaultModel: "google/gemini-2.5-flash",
  
  // Available AI actions
  actions: {
    GENERATE_KEYWORDS: "generate-keywords",
    CLASSIFY: "classify",
    COPYWRITING: "copywriting",
    ANALYZE_COMPETITOR: "analyze-competitor",
    CHAT: "chat",
  } as const,
};

export type AIAction = typeof AI_CONFIG.actions[keyof typeof AI_CONFIG.actions];

// Types for AI requests and responses
export interface AIRequest {
  action: AIAction;
  messages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }>;
  context?: {
    bookInfo?: {
      title?: string;
      subtitle?: string;
      description?: string;
      categories?: string[];
    };
    keywords?: Array<{
      keyword: string;
      volume?: number;
      competition?: string;
    }>;
    asins?: Array<{
      asin: string;
      title?: string;
    }>;
    marketplace?: string;
  };
}

export interface AIStreamOptions {
  onDelta: (chunk: string) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}
