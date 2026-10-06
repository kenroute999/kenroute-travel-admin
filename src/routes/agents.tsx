import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Eye, EyeOff, Pencil, Plus, Search, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusPill } from "@/components/ui/status-pill";
import { Field } from "@/components/ui/field";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/agents")({
  head: () => ({
    meta: [
      { title: "Agent Management — KenRoute" },
      { name: "description", content: "Manage booking agents, balances, commissions and status." },
    ],
  }),
  component: AgentsPage,
});

type Status = "Active" | "Inactive";

interface AgentRow {
  id: string;
  name: string;
  phone: string;
  email: string;
  commission: number;
  status: Status;
  // Comes from the agent's commission ledger, never from the form.
  balance?: string;
}

const initialRows: AgentRow[] = [
  { id: "1", name: "Ravi Travels", phone: "9988776655", email: "ravi@example.com", balance: "₹25,480", commission: 8, status: "Active" },
  { id: "2", name: "Sai Tour & Travels", phone: "9123456780", email: "sai@example.com", balance: "₹18,450", commission: 10, status: "Active" },
  { id: "3", name: "Prasad Tours", phone: "9900112233", email: "prasad@example.com", balance: "₹12,350", commission: 8, status: "Active" },
  { id: "4", name: "Balaji Travels", phone: "9345678901", email: "balaji@example.com", balance: "₹8,900", commission: 12, status: "Inactive" },
];

function AgentsPage() {
  // Rows live in memory until the staff API is wired in.
  const [rows, setRows] = useState<AgentRow[]>(initialRows);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AgentRow | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.phone.includes(q) ||
        r.email.toLowerCase().includes(q),
    );
  }, [rows, query]);

  const openAdd = () => {
    setEditing(null);
    setShowPassword(false);
    setOpen(true);
  };

  const openEdit = (row: AgentRow) => {
    setEditing(row);
    setShowPassword(false);
    setOpen(true);
  };

  const handleDelete = (row: AgentRow) => {
    if (!window.confirm(`Delete agent "${row.name}"?`)) return;
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    toast.success("Agent deleted");
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email")).trim().toLowerCase();

    if (rows.some((r) => r.email === email && r.id !== editing?.id)) {
      toast.error("An agent with this email already exists");
      return;
    }

    // The password is not kept in the table; it goes to the API with this save.
    const row: AgentRow = {
      id: editing?.id ?? crypto.randomUUID(),
      name: String(fd.get("name")).trim(),
      phone: String(fd.get("phone")).trim(),
      email,
      commission: Number(fd.get("commission")),
      status: (fd.get("status") as Status) || "Active",
      balance: editing?.balance,
    };

    setRows((prev) =>
      editing ? prev.map((r) => (r.id === editing.id ? row : r)) : [row, ...prev],
    );
    setOpen(false);
    toast.success(editing ? "Agent updated" : "Agent added");
  };

  return (
    <>
      <PageHeader
        title="Agent Management"
        breadcrumb="Agents"
        actions={
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand text-brand-foreground font-medium text-sm hover:opacity-90"
          >
            <Plus className="size-4" /> Add Agent
          </button>
        }
      />
      <div className="bg-card rounded-2xl border border-border shadow-sm">
        <div className="p-4 border-b border-border">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search agents..."
              className="w-full h-10 pl-10 pr-4 rounded-lg border border-border bg-background text-sm outline-none focus:border-brand"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left text-muted-foreground">
                <th className="px-6 py-3 font-medium">Agent Name</th>
                <th className="px-6 py-3 font-medium">Phone</th>
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium">Balance</th>
                <th className="px-6 py-3 font-medium">Commission</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-6 py-4 font-medium">{r.name}</td>
                  <td className="px-6 py-4">{r.phone}</td>
                  <td className="px-6 py-4">{r.email}</td>
                  <td className="px-6 py-4 font-medium">{r.balance ?? "—"}</td>
                  <td className="px-6 py-4">{r.commission}%</td>
                  <td className="px-6 py-4"><StatusPill status={r.status} /></td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        aria-label="Edit"
                        onClick={() => openEdit(r)}
                        className="size-8 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-brand"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        aria-label="Delete"
                        onClick={() => handleDelete(r)}
                        className="size-8 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-danger"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-muted-foreground">
                    <Users className="size-10 mx-auto mb-2 opacity-40" />
                    {rows.length === 0
                      ? "No agents yet. Use Add Agent to create the first one."
                      : "No agents match your search."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
          <SheetHeader className="p-6 border-b border-border">
            <SheetTitle className="text-xl">{editing ? "Edit Agent" : "Add New Agent"}</SheetTitle>
            <SheetDescription>
              {editing
                ? "Update the agent's details"
                : "Create the agent's login and share the password with them"}
            </SheetDescription>
          </SheetHeader>

          <form
            key={editing?.id ?? "new"}
            id="agent-form"
            className="flex-1 overflow-y-auto p-6 space-y-5"
            onSubmit={handleSubmit}
          >
            <Field label="Agent Name" required>
              <Input
                name="name"
                defaultValue={editing?.name}
                placeholder="Enter agent name"
                required
                minLength={2}
                maxLength={60}
                className="h-11 rounded-xl"
              />
            </Field>
            <Field label="Mobile Number" required>
              <Input
                name="phone"
                defaultValue={editing?.phone}
                placeholder="10-digit mobile number"
                required
                inputMode="numeric"
                pattern="[6-9][0-9]{9}"
                title="Enter a 10-digit mobile number"
                maxLength={10}
                className="h-11 rounded-xl"
              />
            </Field>
            <Field label="Email" required hint="The agent signs in with this email.">
              <Input
                name="email"
                type="email"
                defaultValue={editing?.email}
                placeholder="agent@example.com"
                required
                className="h-11 rounded-xl"
              />
            </Field>
            <Field
              label={editing ? "New Password" : "Password"}
              required={!editing}
              hint={
                editing
                  ? "Leave blank to keep the current password."
                  : "At least 8 characters. Share it with the agent."
              }
            >
              <div className="relative">
                <Input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={editing ? "Enter a new password" : "Create a password"}
                  required={!editing}
                  minLength={8}
                  autoComplete="new-password"
                  className="h-11 rounded-xl pr-11"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 size-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Commission (%)" required>
                <Input
                  name="commission"
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  defaultValue={editing?.commission}
                  placeholder="e.g. 8"
                  required
                  className="h-11 rounded-xl"
                />
              </Field>
              <Field label="Status" required>
                <Select name="status" defaultValue={editing?.status ?? "Active"}>
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </form>

          <SheetFooter className="p-6 border-t border-border bg-muted/20 flex-row gap-3 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="h-11 rounded-xl px-5 flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="agent-form"
              className="h-11 rounded-xl px-5 bg-brand text-brand-foreground hover:bg-brand/90 flex-1 sm:flex-none shadow-sm hover:shadow-md transition-all"
            >
              {!editing && <Plus className="size-4" />}
              {editing ? "Save Changes" : "Save Agent"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
