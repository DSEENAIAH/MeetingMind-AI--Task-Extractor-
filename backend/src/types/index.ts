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
  matchedUser?: UserProfile; // User matched from assignee name
}

export interface ExtractRequest {
  notes: string;
  useMock?: boolean;
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
// Database Types (Supabase)
// ============================================================================

export interface UserProfile {
  id: string;
  username: string;
  full_name: string;
  role: string;
  created_at: string;
  updated_at: string;
  email?: string;
}

export interface Team {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  members?: TeamMember[];
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  name: string;
  role: string;
  added_by: string;
  added_at: string;
  username?: string; // Joined from user_profiles
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface CreateTeamRequest {
  name: string;
  userId: string; // ID of creator
}

export interface AddMemberRequest {
  userId: string; // User to add
  role?: string;
  addedBy: string; // User performing the action
}


declare module 'express-session' {
  interface SessionData {
    zohoTokens?: ZohoTokens;
    userId?: string;
  }
}
