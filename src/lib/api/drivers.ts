import { api } from "./client";

export interface Driver {
  id: string;
  name: string;
  phone: string;
  licenseNo: string;
  experienceYears: number;
  isActive: boolean;
  createdAt: string;
}

export type DriverInput = Omit<Driver, "id" | "createdAt">;

export const driverKeys = { list: ["drivers"] as const };

// ponytail: one page of 100 and search in the browser; move to server search + paging when an operator has more drivers than that.
export const listDrivers = () =>
  api<{ items: Driver[] }>("/drivers?limit=100").then((r) => r.items);

export const createDriver = (body: DriverInput) =>
  api<Driver>("/drivers", { method: "POST", body });

export const updateDriver = (id: string, body: Partial<DriverInput>) =>
  api<Driver>(`/drivers/${id}`, { method: "PATCH", body });

export const deleteDriver = (id: string) => api<void>(`/drivers/${id}`, { method: "DELETE" });
