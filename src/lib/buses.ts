export type BusType = "Sleeper (2+1)" | "Seater (2+2)" | "Seater/Sleeper (2+1)";

export type ACType = "AC" | "Non-AC";

export type BusStatus = "Active" | "Maintenance" | "Inactive";

export interface Bus {
  no: string;
  name: string;
  type: BusType;
  ac: ACType;
  seats: number;
  status: BusStatus;
  color: string;
}

export const busFleet: Bus[] = [
  { no: "TS 09 AB 1234", name: "KenRoute Volvo", type: "Sleeper (2+1)", ac: "AC", seats: 40, status: "Active", color: "text-emerald-500" },
  { no: "TS 09 CD 5678", name: "KenRoute Scania", type: "Seater (2+2)", ac: "AC", seats: 45, status: "Active", color: "text-slate-700" },
  { no: "TS 09 EF 9101", name: "KenRoute Benz", type: "Sleeper (2+1)", ac: "Non-AC", seats: 36, status: "Maintenance", color: "text-amber-500" },
  { no: "TS 09 GH 1122", name: "KenRoute Starz", type: "Seater/Sleeper (2+1)", ac: "AC", seats: 50, status: "Active", color: "text-sky-600" },
  { no: "TS 09 IJ 3344", name: "KenRoute Deluxe", type: "Seater (2+2)", ac: "AC", seats: 40, status: "Inactive", color: "text-rose-500" },
];

export function busByNo(no: string): Bus | undefined {
  return busFleet.find((b) => b.no === no);
}

export type FareKey = "seater" | "singleBed" | "doubleBed";

export interface FareField {
  key: FareKey;
  label: string;
}

export const fareFieldsForType: Record<BusType, FareField[]> = {
  "Seater (2+2)": [{ key: "seater", label: "Seater" }],
  "Sleeper (2+1)": [
    { key: "singleBed", label: "Single Bed" },
    { key: "doubleBed", label: "Double Bed" },
  ],
  "Seater/Sleeper (2+1)": [
    { key: "seater", label: "Seater" },
    { key: "singleBed", label: "Single Bed" },
    { key: "doubleBed", label: "Double Bed" },
  ],
};