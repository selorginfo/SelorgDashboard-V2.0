import type { ApprovalApplication, WorkerKind } from "@/types/approval";
import type { Tone } from "@/types/common";

const s = (label: string, tone: Tone) => ({ label, tone });

/** Verbatim from the approved design's Rider/Picker Approvals screens (dc.html ~5994-6036). */
export const SEED_RIDER_APPLICATIONS: ApprovalApplication[] = [
  { id: "APP-R-2041", applicant: "Arif Khan", applied: "Today 09:12", location: "Z-04 Indiranagar", verification: "Verified", detail: "Verified", reviewer: "Rider Ops · Arjun", status: s("Under review", "amber"), notes: [] },
  { id: "APP-R-2040", applicant: "Sunil Rathod", applied: "Today 08:40", location: "Z-02 Koramangala", verification: "Verified", detail: "Pending", reviewer: "Rider Ops · Arjun", status: s("Vehicle check", "amber"), notes: [] },
  { id: "APP-R-2039", applicant: "Prakash Bhat", applied: "Yesterday", location: "Z-11 Whitefield", verification: "Verified", detail: "Verified", reviewer: "—", status: s("Unassigned", "grey"), notes: [] },
  { id: "APP-R-2038", applicant: "Mohan Das", applied: "Yesterday", location: "Z-07 HSR S1", verification: "Verified", detail: "Verified", reviewer: "Rider Ops · Nisha", status: s("Under review", "amber"), notes: [] },
  { id: "APP-R-2036", applicant: "Jitendra Rao", applied: "2 days ago", location: "Z-14 Jayanagar", verification: "Verified", detail: "Verified", reviewer: "Rider Ops · Nisha", status: s("SLA breached", "red"), notes: [] },
  { id: "APP-R-2035", applicant: "Faisal Ahmed", applied: "2 days ago", location: "Z-04 Indiranagar", verification: "Verified", detail: "Verified", reviewer: "Rider Ops · Arjun", status: s("Under review", "amber"), notes: [] },
  { id: "APP-R-2037", applicant: "Ganesh Pillai", applied: "Yesterday", location: "Z-02 Koramangala", verification: "DL expired", detail: "Verified", reviewer: "Rider Ops · Arjun", status: s("Documents required", "red"), notes: [] },
  { id: "APP-R-2034", applicant: "Naseer Ali", applied: "3 days ago", location: "Z-11 Whitefield", verification: "Aadhaar unclear", detail: "Pending", reviewer: "Rider Ops · Nisha", status: s("Documents required", "red"), notes: [] },
  { id: "APP-R-2031", applicant: "Ramesh Yadav", applied: "4 days ago", location: "Z-07 HSR S1", verification: "Bank proof missing", detail: "Verified", reviewer: "Rider Ops · Arjun", status: s("Documents required", "red"), notes: [] },
  { id: "APP-R-2033", applicant: "Vikram Joshi", applied: "3 days ago", location: "Z-04 Indiranagar", verification: "Verified", detail: "Verified", reviewer: "Rider Ops · Arjun", status: s("Approved", "green"), notes: [] },
  { id: "APP-R-2030", applicant: "Naveen Reddy", applied: "5 days ago", location: "Z-11 Whitefield", verification: "Verified", detail: "Verified", reviewer: "Rider Ops · Nisha", status: s("Approved", "green"), notes: [] },
  { id: "APP-R-2032", applicant: "Anonymous applicant", applied: "3 days ago", location: "Z-02 Koramangala", verification: "Failed", detail: "Failed", reviewer: "Rider Ops · Arjun", status: s("Rejected", "grey"), notes: [] },
  { id: "APP-R-2029", applicant: "Duplicate entry", applied: "6 days ago", location: "Z-14 Jayanagar", verification: "Duplicate", detail: "—", reviewer: "Rider Ops · Nisha", status: s("Rejected", "grey"), notes: [] },
];

export const SEED_PICKER_APPLICATIONS: ApprovalApplication[] = [
  { id: "APP-P-1188", applicant: "Kavya Shetty", applied: "Today 08:22", location: "DS-01 Indiranagar", verification: "Verified", detail: "Shift 2", reviewer: "Store Ops · Nisha", status: s("Under review", "amber"), notes: [] },
  { id: "APP-P-1187", applicant: "Ramya Devi", applied: "Today 07:50", location: "DS-03 HSR Layout", verification: "Verified", detail: "Shift 1", reviewer: "Store Ops · Divya", status: s("Under review", "amber"), notes: [] },
  { id: "APP-P-1186", applicant: "Manju Nath", applied: "Yesterday", location: "DS-02 Koramangala", verification: "Verified", detail: "Shift 2", reviewer: "—", status: s("Unassigned", "grey"), notes: [] },
  { id: "APP-P-1184", applicant: "Shalini R.", applied: "2 days ago", location: "DS-04 Whitefield", verification: "Verified", detail: "Shift 3", reviewer: "Store Ops · Sanjay", status: s("Under review", "amber"), notes: [] },
  { id: "APP-P-1185", applicant: "Vinod Kumar", applied: "Yesterday", location: "DS-01 Indiranagar", verification: "Aadhaar mismatch", detail: "Shift 1", reviewer: "Store Ops · Nisha", status: s("Documents required", "red"), notes: [] },
  { id: "APP-P-1182", applicant: "Harish M.", applied: "3 days ago", location: "DS-05 Jayanagar", verification: "Address proof missing", detail: "Shift 2", reviewer: "Store Ops · Rekha", status: s("Documents required", "red"), notes: [] },
  { id: "APP-P-1183", applicant: "Bhavana S.", applied: "2 days ago", location: "DS-02 Koramangala", verification: "Verified", detail: "Shift 2", reviewer: "Store Ops · Arjun", status: s("Store full", "amber"), notes: [] },
  { id: "APP-P-1181", applicant: "Girish T.", applied: "4 days ago", location: "DS-01 Indiranagar", verification: "Verified", detail: "Shift 1", reviewer: "Store Ops · Nisha", status: s("Store full", "amber"), notes: [] },
  { id: "APP-P-1180", applicant: "Lakshmi N.", applied: "4 days ago", location: "DS-03 HSR Layout", verification: "Verified", detail: "Shift 3", reviewer: "Store Ops · Divya", status: s("Store full", "amber"), notes: [] },
  { id: "APP-P-1179", applicant: "Deepa Kulkarni", applied: "5 days ago", location: "DS-04 Whitefield", verification: "Verified", detail: "Shift 2", reviewer: "Store Ops · Sanjay", status: s("Approved", "green"), notes: [] },
  { id: "APP-P-1178", applicant: "Suresh Prabhu", applied: "6 days ago", location: "DS-03 HSR Layout", verification: "Verified", detail: "Shift 1", reviewer: "Store Ops · Divya", status: s("Approved", "green"), notes: [] },
];

export function seedFor(kind: WorkerKind): ApprovalApplication[] {
  return kind === "rider" ? SEED_RIDER_APPLICATIONS : SEED_PICKER_APPLICATIONS;
}
