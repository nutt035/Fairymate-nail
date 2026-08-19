"use client";
import { useEffect, useState } from "react";
import {
  MessageCircle,
  MessagesSquare,
  Copy,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Link2,
  Play,
  ShieldCheck,
  TriangleAlert,
  Webhook,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusData {
  publicBaseUrl: string;
  metaGraphApiVersion: string;
  line: {
    channelSecret: boolean;
    channelAccessToken: boolean;
    recipientIds: boolean;
  };
  messenger: {
    appSecret: boolean;
    pageAccessToken: boolean;
    verifyToken: string;
    recipientIds: boolean;
    approvedAdmins: number;
  };
}

type TestResult = {
  passed: boolean;
  status?: number;
  body?: string;
  error?: string;
};

export default function WebhooksPage() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);

  // copy state
  const [copied, setCopied] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);

  // test state
  const [testing, setTesting] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [regenerating, setRegenerating] = useState(false);

  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const baseUrl = status?.publicBaseUrl || origin;

  const lineUrl = `${baseUrl}/api/webhooks/line`;
  const messengerUrl = `${baseUrl}/api/webhooks/messenger`;

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/webhooks/status");
      if (res.ok) setStatus(await res.json());
    } catch (error) {
      console.error("Error fetching webhook status:", error);
    } finally {
      setLoading(false);
    }
  };

  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // fallback สำหรับ browser ที่ไม่อนุญาต clipboard
      const ta = document.createElement("textarea");
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    }
  };

  const regenerateToken = async () => {
    if (!confirm("สร้าง verify token ใหม่?\n\nToken เดิมจะใช้ไม่ได้ทันที — ต้องวางค่าใหม่ใน Meta Developer Console ด้วย")) return;
    setRegenerating(true);
    try {
      const res = await fetch("/api/admin/webhooks/regenerate-token", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.ok) {
        alert("สร้าง verify token ใหม่แล้ว!\n\nวางค่านี้ใน Meta Developer Console → Webhooks → Verify Token\n\n" + data.verifyToken);
        await fetchStatus();
      } else {
        alert("สร้างไม่สำเร็จ: " + (data.error || "unknown error"));
      }
    } catch (error) {
      alert("สร้างไม่สำเร็จ: " + String(error));
    } finally {
      setRegenerating(false);
    }
  };

  const runTest = async (platform: "line" | "messenger", test: string) => {
    const key = `${platform}_${test}`;
    setTesting(key);
    setResults((prev) => ({ ...prev, [key]: { passed: false } as TestResult }));
    try {
      const res = await fetch("/api/admin/webhooks/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, test }),
      });
      const data = (await res.json()) as TestResult;
      setResults((prev) => ({ ...prev, [key]: data }));
    } catch (error) {
      setResults((prev) => ({
        ...prev,
        [key]: { passed: false, error: String(error) },
      }));
    } finally {
      setTesting(null);
    }
  };

  const allLineSet = status
    ? status.line.channelSecret && status.line.channelAccessToken && status.line.recipientIds
    : false;
  const allMessengerSet = status
    ? status.messenger.appSecret &&
      status.messenger.pageAccessToken &&
      status.messenger.verifyToken &&
      (status.messenger.recipientIds || status.messenger.approvedAdmins > 0)
    : false;

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-2">
          <Webhook className="text-primary" size={28} />
          เชื่อมต่อ LINE / Messenger
        </h1>
        <p className="text-slate-500 mt-1">
          ตั้งค่า Webhook URL และ verify token เพื่อให้ลูกค้าจองคิวผ่านแชทได้
        </p>
      </div>

      {/* Warning banner */}
      {(!allLineSet || !allMessengerSet) && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
          <TriangleAlert className="text-amber-500 shrink-0 mt-0.5" size={20} />
          <div className="text-sm text-amber-700">
            <p className="font-bold mb-1">ยังตั้งค่าไม่ครบ — ใส่ค่าในไฟล์ .env (หรือ env บน Vercel/เซิร์ฟเวอร์) แล้ว restart</p>
            <ul className="list-disc list-inside space-y-0.5">
              {!status?.line.channelSecret && <li>LINE: ยังขาด <code className="bg-amber-100 px-1 rounded">LINE_CHANNEL_SECRET</code> (ก๊อปจาก LINE Developers Console)</li>}
              {!status?.line.channelAccessToken && <li>LINE: ยังขาด <code className="bg-amber-100 px-1 rounded">LINE_CHANNEL_ACCESS_TOKEN</code></li>}
              {!status?.line.recipientIds && <li>LINE: ยังขาด <code className="bg-amber-100 px-1 rounded">LINE_RECIPIENT_IDS</code> สำหรับแจ้งเตือนคิวใหม่</li>}
              {!status?.messenger.appSecret && <li>Messenger: ยังขาด <code className="bg-amber-100 px-1 rounded">FACEBOOK_APP_SECRET</code> (จาก Meta Developer)</li>}
              {!status?.messenger.pageAccessToken && <li>Messenger: ยังขาด <code className="bg-amber-100 px-1 rounded">FACEBOOK_PAGE_ACCESS_TOKEN</code></li>}
              {!status?.messenger.recipientIds && status?.messenger.approvedAdmins === 0 && (
                <li>
                  Messenger: ยังไม่มีผู้รับแจ้งเตือน — ตั้ง{" "}
                  <code className="bg-amber-100 px-1 rounded">FACEBOOK_MESSENGER_RECIPIENT_IDS</code> หรือไปกด{" "}
                  <a href="/admin/messenger" className="underline font-medium">ยืนยันเป็นแอดมิน</a> ในหน้าแอดมินแชท
                </li>
              )}
              {!status?.publicBaseUrl && (
                <li>
                  ยังไม่ได้ตั้ง <code className="bg-amber-100 px-1 rounded">PUBLIC_BASE_URL</code> (domain จริงของเว็บ) —
                  ตอนนี้ใช้ <code className="bg-amber-100 px-1 rounded">{origin}</code> ชั่วคราว ลิงก์จองในแชทจะชี้มาที่นี่
                </li>
              )}
            </ul>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ─── LINE Card ─────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#06C755]/10 flex items-center justify-center">
                <MessageCircle size={20} className="text-[#06C755]" />
              </div>
              <div>
                <h2 className="font-bold text-slate-800">LINE Official Account</h2>
                <p className="text-xs text-slate-400">Messaging API</p>
              </div>
            </div>
            <span className={cn(
              "px-2.5 py-1 rounded-full text-[11px] font-bold",
              allLineSet ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
            )}>
              {allLineSet ? "พร้อมใช้" : "ตั้งค่าไม่ครบ"}
            </span>
          </div>

          <div className="p-5 space-y-4">
            {/* Webhook URL */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Webhook URL (วางใน LINE Developers Console)</label>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5">
                <Link2 size={16} className="text-slate-400 shrink-0" />
                <code className="text-xs text-slate-600 flex-1 break-all">{lineUrl}</code>
                <button
                  onClick={() => copy("line", lineUrl)}
                  className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors shrink-0"
                  title="คัดลอก"
                >
                  {copied === "line" ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                </button>
              </div>
            </div>

            {/* Env status */}
            <div className="space-y-1.5 text-sm">
              <EnvRow label="LINE_CHANNEL_SECRET" ok={status?.line.channelSecret} />
              <EnvRow label="LINE_CHANNEL_ACCESS_TOKEN" ok={status?.line.channelAccessToken} />
              <EnvRow label="LINE_RECIPIENT_IDS" ok={status?.line.recipientIds} />
            </div>

            {/* Test button */}
            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={() => runTest("line", "post")}
                disabled={testing !== null}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#06C755] text-white font-bold hover:bg-[#06C755]/90 disabled:opacity-60 transition-colors"
              >
                {testing === "line_post" ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
                ทดสอบ LINE webhook
              </button>
              <TestResultView result={results.line_post} />
              <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                จะส่ง POST พร้อม x-line-signature (HMAC-SHA256) ไปที่ {lineUrl} เหมือนที่ LINE ยิงจริง
                {!status?.line.channelSecret && " — ต้องใส่ LINE_CHANNEL_SECRET ก่อนจึงจะทดสอบได้"}
              </p>
            </div>
          </div>
        </div>

        {/* ─── Messenger Card ────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0084FF]/10 flex items-center justify-center">
                <MessagesSquare size={20} className="text-[#0084FF]" />
              </div>
              <div>
                <h2 className="font-bold text-slate-800">Facebook Messenger</h2>
                <p className="text-xs text-slate-400">Meta Graph API {status?.metaGraphApiVersion}</p>
              </div>
            </div>
            <span className={cn(
              "px-2.5 py-1 rounded-full text-[11px] font-bold",
              allMessengerSet ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
            )}>
              {allMessengerSet ? "พร้อมใช้" : "ตั้งค่าไม่ครบ"}
            </span>
          </div>

          <div className="p-5 space-y-4">
            {/* Webhook URL */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Webhook URL (วางใน Meta Developer Console)</label>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5">
                <Link2 size={16} className="text-slate-400 shrink-0" />
                <code className="text-xs text-slate-600 flex-1 break-all">{messengerUrl}</code>
                <button
                  onClick={() => copy("messenger", messengerUrl)}
                  className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors shrink-0"
                  title="คัดลอก"
                >
                  {copied === "messenger" ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                </button>
              </div>
            </div>

            {/* Verify token */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">
                Verify Token (ใส่ในช่อง Verify Token ของ Meta)
              </label>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5">
                <ShieldCheck size={16} className="text-slate-400 shrink-0" />
                <code className="text-xs text-slate-600 flex-1 break-all">
                  {showToken ? status?.messenger.verifyToken : maskToken(status?.messenger.verifyToken || "")}
                </code>
                <button
                  onClick={() => setShowToken((v) => !v)}
                  className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors shrink-0"
                  title={showToken ? "ซ่อน" : "แสดง"}
                >
                  {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button
                  onClick={() => copy("verify", status?.messenger.verifyToken || "")}
                  className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors shrink-0"
                  title="คัดลอก"
                >
                  {copied === "verify" ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                </button>
              </div>
              <button
                onClick={regenerateToken}
                disabled={regenerating}
                className="mt-1.5 text-[11px] text-primary font-medium hover:underline disabled:opacity-50 flex items-center gap-1"
              >
                {regenerating ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                สร้าง verify token ใหม่
              </button>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                หลังสร้างใหม่ อย่าลืมวางค่าใหม่ใน Meta Developer Console ด้วย
              </p>
            </div>

            {/* Env status */}
            <div className="space-y-1.5 text-sm">
              <EnvRow label="FACEBOOK_APP_SECRET" ok={status?.messenger.appSecret} />
              <EnvRow label="FACEBOOK_PAGE_ACCESS_TOKEN" ok={status?.messenger.pageAccessToken} />
              <EnvRow label="FACEBOOK_WEBHOOK_VERIFY_TOKEN" ok={Boolean(status?.messenger.verifyToken)} />
              <EnvRow label="FACEBOOK_MESSENGER_RECIPIENT_IDS" ok={status?.messenger.recipientIds} />
              <EnvRow
                label="แอดมินที่ approve แล้ว"
                ok={(status?.messenger.approvedAdmins ?? 0) > 0}
                detail={
                  status && status.messenger.approvedAdmins > 0
                    ? `${status.messenger.approvedAdmins} คน`
                    : undefined
                }
              />
            </div>

            {/* Test buttons */}
            <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
              <button
                onClick={() => runTest("messenger", "verify")}
                disabled={testing !== null}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#0084FF] text-white font-bold hover:bg-[#0084FF]/90 disabled:opacity-60 transition-colors"
              >
                {testing === "messenger_verify" ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
                ทดสอบ Verify
              </button>
              <button
                onClick={() => runTest("messenger", "post")}
                disabled={testing !== null}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#0084FF]/90 text-white font-bold hover:bg-[#0084FF]/80 disabled:opacity-60 transition-colors"
              >
                {testing === "messenger_post" ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
                ทดสอบ POST
              </button>
            </div>
            <TestResultView result={results.messenger_verify} label="Verify (เหมือน Meta กด Verify)" />
            <TestResultView result={results.messenger_post} label="POST (เหมือน Meta ส่งข้อความ)" />
          </div>
        </div>
      </div>

      {/* ─── คำแนะนำการตั้งค่า ─────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mt-6">
        <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
          <ShieldCheck size={18} className="text-primary" />
          ขั้นตอนการตั้งค่า (ทำครั้งเดียว)
        </h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600">
          <li>
            <b>LINE:</b> เปิด{" "}
            <a href="https://developers.line.biz/console/" target="_blank" rel="noreferrer" className="text-primary underline">
              LINE Developers Console
            </a>{" "}
            → เลือก Channel → Messaging API → วาง Webhook URL ด้านบนในช่อง “Webhook URL” → เปิดสวิตช์ “Use webhook” →
            ก๊อป <code className="bg-slate-100 px-1 rounded">Channel secret</code> และ{" "}
            <code className="bg-slate-100 px-1 rounded">Channel access token</code> ไปใส่ใน env
          </li>
          <li>
            <b>Messenger:</b> เปิด{" "}
            <a href="https://developers.facebook.com/apps/" target="_blank" rel="noreferrer" className="text-primary underline">
              Meta Developer Console
            </a>{" "}
            → App → Messenger → Webhooks → วาง Webhook URL + Verify Token ด้านบน → Subscribe ไปที่ field{" "}
            <code className="bg-slate-100 px-1 rounded">messages</code> → ก๊อป App Secret (App Settings) และ Page Access Token
            (Messenger → Settings → Access Tokens) ไปใส่ใน env
          </li>
          <li>
            ตั้ง <code className="bg-slate-100 px-1 rounded">PUBLIC_BASE_URL</code> เป็น domain จริงของเว็บ (เช่น{" "}
            <code className="bg-slate-100 px-1 rounded">https://fairymatenail.vercel.app</code>) เพื่อให้ลิงก์จองที่ส่งเข้าแชทถูกต้อง
          </li>
          <li>ใส่ค่า env แล้ว restart เซิร์ฟเวอร์ → กดปุ่ม “ทดสอบ” ด้านบนให้ผ่านทั้ง 2 แพลตฟอร์ม → กด “Verify” ในคอนโซล LINE/Meta</li>
        </ol>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function EnvRow({ label, ok, detail }: { label: string; ok?: boolean; detail?: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <code className="text-xs text-slate-500">{label}</code>
      <span className="flex items-center gap-1.5 shrink-0">
        {detail && <span className="text-[11px] text-slate-400">{detail}</span>}
        <span
          className={cn(
            "px-2 py-0.5 rounded-full text-[10px] font-bold",
            ok ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
          )}
        >
          {ok ? "ตั้งแล้ว" : "ยังไม่ตั้ง"}
        </span>
      </span>
    </div>
  );
}

function TestResultView({ result, label }: { result?: TestResult; label?: string }) {
  if (!result) return null;
  return (
    <div
      className={cn(
        "mt-2 rounded-xl p-3 text-xs",
        result.passed ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
      )}
    >
      <p className="font-bold mb-1">
        {result.passed ? "✅ ผ่าน" : "❌ ไม่ผ่าน"}
        {label ? ` — ${label}` : ""}
        {result.status ? ` (HTTP ${result.status})` : ""}
      </p>
      {result.error && <p className="break-words">{result.error}</p>}
      {result.body && <p className="break-words opacity-80">{result.body}</p>}
    </div>
  );
}

function maskToken(token: string) {
  if (!token) return "(ยังไม่ได้สร้าง — กดแสดง/คัดลอกเพื่อดู)";
  if (token.length <= 10) return "•".repeat(token.length);
  return `${token.slice(0, 4)}${"•".repeat(Math.min(token.length - 8, 20))}${token.slice(-4)}`;
}
