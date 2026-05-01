// App Configuration Constants
export const APP_CONFIG = {
    MAX_TOPIC_LENGTH: 200,
    FALLBACK_TITLES_COUNT: 5,
    STYLE_CONSTRAINTS_COUNT: 4,
    DEFAULT_TITLE: "AI Blog Title Generator",
    DEFAULT_DESCRIPTION:
      "Generate AI-powered blog titles with advanced customization and history tracking.",
  };
  
  // API Routes
  export const API_ROUTES = {
    GENERATE: "/api/generate",
  };
  
  // Storage Keys
  export const STORAGE_KEYS = {
    GENERATOR_DRAFT: "blog-generator-draft",
    SECURED_HISTORY: "blog-secured-history",
  };
  
  // UI Messages
  export const UI_MESSAGES = {
    DEFAULT_ERROR: "Could not generate titles. Please try again.",
    NETWORK_ERROR: "Network error while generating titles.",
    SUCCESS: "Titles generated successfully!",
  };