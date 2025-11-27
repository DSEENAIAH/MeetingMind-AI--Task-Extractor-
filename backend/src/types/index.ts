/**
 * types/index.ts
 * 
 * Purpose: Shared TypeScript interfaces for type safety across the backend.
 * 
 * Why centralize types:
 * - Single source of truth for data shapes
 * - Easy to update when API contracts change
 * - Better IDE autocomplete and error checking
 * - Matches frontend types for consistency
 */

// ============================================================================
// Task Extraction Types
// ============================================================================

export interface ExtractedTask {
  title: string;
  description: string;
  assignee?: string;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string; // ISO 8601 format
  confidence?: number | 'low' | 'medium' | 'high'; // 0-1 score from AI OR string label
  tags?: string[]; // Labels like bug, feature, etc.
  optional?: boolean; // Whether this is a non-blocking / nice-to-have task
  inferred?: boolean; // Whether this task was implied/inferred vs explicitly stated
  sourceText?: string; // Original text that led to task extraction
  evidenceContext?: string; // Surrounding context used for inference
}

export interface ExtractRequest {
  notes: string;
}

export interface ExtractResponse {
  tasks: ExtractedTask[];
  metadata: {
    processedAt: string;
    model: string;
    totalTokens?: number;
    transcriptLength?: number;
  };
}

// ============================================================================
// Zoho Task Creation Types
// ============================================================================

export interface CreateTasksRequest {
  tasks: ExtractedTask[];
  projectId?: string; // Zoho project ID
  portalId?: string;  // Zoho portal ID
}

export interface CreateTasksResponse {
  created: {
    taskId: string;
    title: string;
    url: string;
  }[];
  errors?: {
    title: string;
    error: string;
  }[];
}

// ============================================================================
// Zoho OAuth Types
// ============================================================================

export interface ZohoTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp
}

export interface ZohoAuthState {
  userId?: string;
  tokens?: ZohoTokens;
}

// ============================================================================
// Zoho API Response Types
// ============================================================================

export interface ZohoProject {
  id: string;
  name: string;
  description?: string;
}

export interface ZohoTaskResponse {
  tasks: {
    id: string;
    name: string;
    link?: {
      self?: {
        url: string;
      };
    };
  }[];
}

// ============================================================================
// Cliq Webhook Types
// ============================================================================

export interface CliqWebhookRequest {
  text: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  channel?: {
    id: string;
    name: string;
  };
}

export interface CliqWebhookResponse {
  text: string;
  card?: {
    theme?: string;
    title?: string;
    data?: any;
  };
}

// ============================================================================
// Error Types
// ============================================================================

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

// ============================================================================
// Session Types
// ============================================================================

declare module 'express-session' {
  interface SessionData {
    zohoTokens?: ZohoTokens;
    userId?: string;
  }
}
