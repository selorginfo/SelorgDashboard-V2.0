import type { Badge } from "@/types/common";

export type WorkerKind = "rider" | "picker";

export interface ApprovalDocument {
  id: string;
  type: string;
  side: string | null;
  status: string;
  url: string | null;
  fileName: string | null;
  rejectionReason: string | null;
}

export interface ApprovalApplication {
  id: string;
  applicant: string;
  applied: string;
  /** Zone for riders, preferred dark store for pickers. */
  location: string;
  /** KYC for riders, identity verification for pickers. */
  verification: string;
  /** Vehicle check for riders, shift preference for pickers. */
  detail: string;
  reviewer: string;
  status: Badge;
  notes: string[];
  /** Uploaded verification documents for ops lead review. */
  documents: ApprovalDocument[];
}
