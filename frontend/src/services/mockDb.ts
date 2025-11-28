/**
 * mockDb.ts
 * 
 * Purpose: A local storage-based mock database to unblock development when Supabase RLS is blocking.
 * This allows the user to test the full workflow (Officials -> Teams -> Tasks -> Employees).
 */

export interface MockUser {
    id: string;
    username: string;
    full_name: string;
    role: string;
    email?: string;
}

export interface MockTeam {
    id: string;
    name: string;
    created_by: string;
    members: MockUser[];
}

export interface MockTask {
    id: string;
    description: string;
    assignedTo: string | null; // username
    assignedBy: string; // username
    status: 'pending' | 'in-progress' | 'completed';
    priority: 'low' | 'medium' | 'high';
    createdAt: string;
    teamId: string;
}

const STORAGE_KEYS = {
    TEAMS: 'mm_mock_teams',
    TASKS: 'mm_mock_tasks',
    USERS: 'mm_mock_users',
};

// Initial mock users
const INITIAL_USERS: MockUser[] = [
    { id: 'user_1', username: 'sarah_lead', full_name: 'Sarah Jenkins', role: 'team_lead', email: 'sarah@example.com' },
    { id: 'user_2', username: 'mike_dev', full_name: 'Mike Chen', role: 'developer', email: 'mike@example.com' },
    { id: 'user_3', username: 'jess_qa', full_name: 'Jessica Lee', role: 'qa_engineer', email: 'jess@example.com' },
    { id: 'user_4', username: 'alex_design', full_name: 'Alex Rivera', role: 'designer', email: 'alex@example.com' },
];

class MockDbService {
    private get<T>(key: string, defaultValue: T): T {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.error(`Error reading ${key} from localStorage`, e);
            return defaultValue;
        }
    }

    private set(key: string, value: any) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error(`Error writing ${key} to localStorage`, e);
        }
    }

    // Users
    getUsers(): MockUser[] {
        const storedUsers = this.get<MockUser[]>(STORAGE_KEYS.USERS, []);
        // Merge with initial users, avoiding duplicates by ID
        const allUsers = [...INITIAL_USERS];
        storedUsers.forEach(u => {
            if (!allUsers.find(existing => existing.id === u.id)) {
                allUsers.push(u);
            }
        });
        return allUsers;
    }

    addUser(user: MockUser) {
        const users = this.get<MockUser[]>(STORAGE_KEYS.USERS, []);
        if (!users.find(u => u.id === user.id)) {
            users.push(user);
            this.set(STORAGE_KEYS.USERS, users);
        }
    }

    // Teams
    getTeams(userId: string): MockTeam[] {
        const allTeams = this.get<MockTeam[]>(STORAGE_KEYS.TEAMS, []);
        // Return teams created by user OR where user is a member
        return allTeams.filter(t =>
            t.created_by === userId ||
            t.members.some(m => m.id === userId)
        );
    }

    createTeam(name: string, creatorId: string): MockTeam {
        const teams = this.get<MockTeam[]>(STORAGE_KEYS.TEAMS, []);
        const newTeam: MockTeam = {
            id: `team_${Date.now()}`,
            name,
            created_by: creatorId,
            members: []
        };
        teams.push(newTeam);
        this.set(STORAGE_KEYS.TEAMS, teams);
        return newTeam;
    }

    addMember(teamId: string, user: MockUser) {
        const teams = this.get<MockTeam[]>(STORAGE_KEYS.TEAMS, []);
        const teamIndex = teams.findIndex(t => t.id === teamId);
        if (teamIndex >= 0) {
            const team = teams[teamIndex];
            if (!team.members.find(m => m.id === user.id)) {
                team.members.push(user);
                teams[teamIndex] = team;
                this.set(STORAGE_KEYS.TEAMS, teams);
            }
        }
    }

    removeMember(teamId: string, userId: string) {
        const teams = this.get<MockTeam[]>(STORAGE_KEYS.TEAMS, []);
        const teamIndex = teams.findIndex(t => t.id === teamId);
        if (teamIndex >= 0) {
            teams[teamIndex].members = teams[teamIndex].members.filter(m => m.id !== userId);
            this.set(STORAGE_KEYS.TEAMS, teams);
        }
    }

    // Tasks
    getTasks(username: string): MockTask[] {
        const allTasks = this.get<MockTask[]>(STORAGE_KEYS.TASKS, []);
        return allTasks.filter(t => t.assignedTo === username);
    }

    getAllTasksForTeam(teamId: string): MockTask[] {
        const allTasks = this.get<MockTask[]>(STORAGE_KEYS.TASKS, []);
        return allTasks.filter(t => t.teamId === teamId);
    }

    createTask(task: Omit<MockTask, 'id' | 'createdAt' | 'status' | 'priority'>): MockTask {
        const tasks = this.get<MockTask[]>(STORAGE_KEYS.TASKS, []);
        const newTask: MockTask = {
            ...task,
            id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            status: 'pending',
            priority: 'medium',
            createdAt: new Date().toISOString()
        };
        tasks.push(newTask);
        this.set(STORAGE_KEYS.TASKS, tasks);
        return newTask;
    }

    updateTaskStatus(taskId: string, status: MockTask['status']) {
        const tasks = this.get<MockTask[]>(STORAGE_KEYS.TASKS, []);
        const taskIndex = tasks.findIndex(t => t.id === taskId);
        if (taskIndex >= 0) {
            tasks[taskIndex].status = status;
            this.set(STORAGE_KEYS.TASKS, tasks);
        }
    }
}

export const mockDb = new MockDbService();
