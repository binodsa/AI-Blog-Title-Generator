/**
 * Error handling utilities for API responses
 */

export interface ProviderError {
    status: number;
    message: string;
  }
  
  export function asProviderError(error: unknown): ProviderError {
    if (typeof error === "object" && error !== null) {
      const maybeStatus = (error as { status?: unknown }).status;
      if (typeof maybeStatus === "number" && Number.isFinite(maybeStatus)) {
        const maybeMessage = (error as { message?: unknown }).message;
        return {
          status: maybeStatus,
          message:
            typeof maybeMessage === "string" ? maybeMessage : "AI provider error",
        };
      }
    }
  
    return {
      status: 500,
      message: error instanceof Error ? error.message : "AI provider error",
    };
  }