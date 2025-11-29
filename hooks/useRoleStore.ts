import { create } from "zustand";
import { persist } from "zustand/middleware";

type UserRole = "patient" | "doctor" | "hospital" | "other" | null;

interface RoleState {
  role: UserRole;
  setRole: (role: UserRole) => void;
  clearRole: () => void;
}

export const useRoleStore = create<RoleState>()(
  persist(
    (set) => ({
      role: null,
      setRole: (role) => set({ role }),
      clearRole: () => set({ role: null }),
    }),
    {
      name: "medledger-role",
    }
  )
);

