import { beforeEach, describe, expect, it } from "vitest";
import { mockApprovalService } from "@/services/approvals/approvalService.mock";

describe("mockApprovalService", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("approves a rider application and records the reviewer note", async () => {
    const applications = await mockApprovalService.list("rider");
    const pending = applications.find((a) => a.status.label === "Interview")!;

    const updated = await mockApprovalService.decide("rider", pending.id, "Approve", "KYC and vehicle both verified");
    expect(updated.status.label).toBe("Approved");
    expect(updated.notes).toContain("KYC and vehicle both verified");
  });

  it("moves a picker application to documents required on request-information", async () => {
    const applications = await mockApprovalService.list("picker");
    const pending = applications.find((a) => a.status.label === "Interview")!;

    const updated = await mockApprovalService.decide("picker", pending.id, "Request information", "Address proof unclear");
    expect(updated.status.label).toBe("Documents required");
  });

  it("assigns a reviewer and moves the application back to interview", async () => {
    const applications = await mockApprovalService.list("rider");
    const unassigned = applications.find((a) => a.reviewer === "—")!;

    const updated = await mockApprovalService.assignReviewer("rider", unassigned.id, "Rider Ops · Arjun");
    expect(updated.reviewer).toBe("Rider Ops · Arjun");
    expect(updated.status.label).toBe("Interview");
  });

  it("requires a rejection reason", async () => {
    const applications = await mockApprovalService.list("rider");
    const pending = applications.find((a) => a.status.label === "Interview")!;
    await expect(mockApprovalService.decide("rider", pending.id, "Reject", "")).rejects.toThrow(
      /rejection reason/i,
    );
  });
});
