import { cn } from "@/lib/utils";

export default function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-amber-50 text-amber-600",
    confirmed: "bg-primary/10 text-primary",
    done: "bg-green-100 text-green-600",
    cancelled: "bg-slate-100 text-slate-500",
  };

  const labels: Record<string, string> = {
    pending: "รอ",
    confirmed: "กำลังทำ",
    done: "เสร็จ",
    cancelled: "ยกเลิก",
  };

  const key = status.toLowerCase();

  return (
    <span className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide", styles[key] || styles.pending)}>
      {labels[key] || status}
    </span>
  );
}
