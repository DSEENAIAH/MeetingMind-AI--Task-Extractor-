import { UserProfile } from '../types/index.js';

/**
 * Matches an assignee name string to a user profile from the database.
 * 
 * Strategy:
 * 1. Exact match on email
 * 2. Exact match on username
 * 3. Exact match on full name
 * 4. Case-insensitive match on any of the above
 * 5. Partial match (name contains assignee or assignee contains name) - handled with care
 * 
 * @param assigneeName The name extracted from the text (e.g. "John", "john@example.com", "John Doe")
 * @param users List of available users to match against
 * @returns The matched UserProfile or undefined if no confident match found
 */
export function matchUser(assigneeName: string, users: UserProfile[]): UserProfile | undefined {
    if (!assigneeName || !users || users.length === 0) {
        return undefined;
    }

    const normalizedAssignee = assigneeName.trim().toLowerCase();

    // 1. Exact Email Match (Case-insensitive)
    const emailMatch = users.find(u => u.email && u.email.toLowerCase() === normalizedAssignee);
    if (emailMatch) return emailMatch;

    // 2. Exact Username Match (Case-insensitive)
    const usernameMatch = users.find(u => u.username && u.username.toLowerCase() === normalizedAssignee);
    if (usernameMatch) return usernameMatch;

    // 3. Exact Full Name Match (Case-insensitive)
    const fullNameMatch = users.find(u => u.full_name && u.full_name.toLowerCase() === normalizedAssignee);
    if (fullNameMatch) return fullNameMatch;

    // 4. First Name Match (if assignee is just a first name like "John")
    // Only match if there's exactly one "John" in the team to avoid ambiguity
    const firstNameMatches = users.filter(u => {
        const firstName = u.full_name.split(' ')[0].toLowerCase();
        return firstName === normalizedAssignee;
    });

    if (firstNameMatches.length === 1) {
        return firstNameMatches[0];
    }

    // 5. Partial Match (Assignee is part of full name, e.g. "John" in "John Doe")
    // This is riskier, so we only do it if we haven't found a match yet AND it's unique
    const partialMatches = users.filter(u => {
        return u.full_name.toLowerCase().includes(normalizedAssignee) ||
            (u.username && u.username.toLowerCase().includes(normalizedAssignee));
    });

    if (partialMatches.length === 1) {
        return partialMatches[0];
    }

    return undefined;
}
