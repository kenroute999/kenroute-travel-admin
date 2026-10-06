import { api } from "./client";

export interface Agent {
  id: string;
  name: string;
  phone: string;
  email: string;
  isActive: boolean;
  agentCode: string;
  /** Decimal string, e.g. "8" or "12.5". */
  commissionPct: string;
  createdAt: string;
}

export interface AgentInput {
  name: string;
  phone: string;
  email: string;
  password: string;
  commissionPct: number;
  isActive: boolean;
}

export const agentKeys = { list: ["agents"] as const };

// ponytail: one page of 100 and search in the browser; move to server search + paging when an operator has more agents than that.
export const listAgents = () => api<{ items: Agent[] }>("/agents?limit=100").then((r) => r.items);

export const createAgent = (body: AgentInput) => api<Agent>("/agents", { method: "POST", body });

export const updateAgent = (id: string, body: Partial<AgentInput>) =>
  api<Agent>(`/agents/${id}`, { method: "PATCH", body });

export const deleteAgent = (id: string) => api<void>(`/agents/${id}`, { method: "DELETE" });
