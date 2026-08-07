export type UserRole = "Admin" | "Editor" | "Member";

export interface DemoUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  joinedAt: string;
  wishlistCount: number;
  comparisons: number;
  active: boolean;
}

/** Static seed data for the admin tables until a backend is connected. */
export const demoUsers: DemoUser[] = [
  { id: "u-001", name: "Aarav Menon", email: "aarav.menon@example.com", role: "Admin", joinedAt: "2024-01-18", wishlistCount: 12, comparisons: 34, active: true },
  { id: "u-002", name: "Priya Nair", email: "priya.nair@example.com", role: "Editor", joinedAt: "2024-02-03", wishlistCount: 8, comparisons: 21, active: true },
  { id: "u-003", name: "Rohit Bansal", email: "rohit.bansal@example.com", role: "Member", joinedAt: "2024-03-22", wishlistCount: 5, comparisons: 9, active: true },
  { id: "u-004", name: "Sneha Kulkarni", email: "sneha.k@example.com", role: "Member", joinedAt: "2024-04-11", wishlistCount: 17, comparisons: 42, active: true },
  { id: "u-005", name: "Imran Qureshi", email: "imran.q@example.com", role: "Editor", joinedAt: "2024-05-09", wishlistCount: 3, comparisons: 6, active: false },
  { id: "u-006", name: "Divya Raghavan", email: "divya.r@example.com", role: "Member", joinedAt: "2024-06-27", wishlistCount: 9, comparisons: 15, active: true },
  { id: "u-007", name: "Karthik Iyer", email: "karthik.iyer@example.com", role: "Member", joinedAt: "2024-08-14", wishlistCount: 2, comparisons: 3, active: false },
  { id: "u-008", name: "Meera Joshi", email: "meera.joshi@example.com", role: "Member", joinedAt: "2024-09-30", wishlistCount: 21, comparisons: 58, active: true },
  { id: "u-009", name: "Aditya Rane", email: "aditya.rane@example.com", role: "Member", joinedAt: "2024-11-05", wishlistCount: 6, comparisons: 11, active: true },
  { id: "u-010", name: "Fatima Sheikh", email: "fatima.s@example.com", role: "Member", joinedAt: "2025-01-19", wishlistCount: 14, comparisons: 27, active: true },
];

export const totalUsers = 4820;
