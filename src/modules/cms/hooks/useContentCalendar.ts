import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import type { ScheduledContent } from "@/types/scheduledContent";
import type { Tone } from "@/types/common";

function statusFromStage(stage?: string): { label: string; tone: Tone } {
  const s = (stage ?? "").toLowerCase();
  if (s.includes("publish") || s.includes("live")) return { label: "Goes live", tone: "green" };
  if (s.includes("scheduled")) return { label: "Scheduled", tone: "blue" };
  if (s.includes("approv")) return { label: "Approved", tone: "green" };
  if (s.includes("review")) return { label: "In review", tone: "amber" };
  if (s.includes("draft")) return { label: "Draft", tone: "grey" };
  if (s.includes("archiv") || s.includes("expir")) return { label: "Expires", tone: "red" };
  return { label: stage ?? "Draft", tone: "grey" };
}

function fmtDate(d?: string): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return d;
  }
}

function extract(res: unknown): unknown[] {
  if (Array.isArray(res)) return res;
  const r = res as Record<string, unknown>;
  return (r["data"] ?? r["list"] ?? r["pages"] ?? r["items"] ?? []) as unknown[];
}

export function useContentCalendar() {
  return useQuery({
    queryKey: ["cms-content-calendar"],
    queryFn: async (): Promise<ScheduledContent[]> => {
      const res = await api.get<unknown>("/api/v1/customer/admin/cms/pages");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return extract(res).map((item: any, i) => {
        const status = statusFromStage(item["stage"] ?? item["status"]);
        return {
          id: String(item["_id"] ?? item["id"] ?? `cc-${i}`),
          title: String(item["title"] ?? item["name"] ?? "Untitled"),
          type: String(item["type"] ?? item["pageType"] ?? item["contentType"] ?? "Page"),
          surface: String(item["surface"] ?? item["placement"] ?? item["section"] ?? "App"),
          placement: String(item["placement"] ?? item["position"] ?? "—"),
          date: fmtDate(item["scheduledAt"] ?? item["publishAt"] ?? item["updatedAt"] ?? item["createdAt"]),
          time: item["scheduledAt"] ?? item["publishAt"]
            ? new Date(String(item["scheduledAt"] ?? item["publishAt"])).toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "—",
          owner: String(item["author"] ?? item["createdBy"] ?? item["owner"] ?? "—"),
          status,
          hasConflict: Boolean(item["hasConflict"] ?? false),
        };
      });
    },
    staleTime: 60_000,
  });
}
