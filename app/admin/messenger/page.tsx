"use client";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import {
  MessagesSquare,
  ShieldCheck,
  UserCheck,
  UserX,
  Trash2,
  Loader2,
  RefreshCw,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Contact {
  id: number;
  psid: string;
  name: string | null;
  first_seen_at: string;
  last_seen_at: string;
  is_admin: boolean;
  approved_at: string | null;
  note: string | null;
}

const formatDateTime = (iso: string) =>
  format(new Date(iso), "d MMM yyyy, HH:mm", { locale: th });

export default function MessengerAdminPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/messenger-contacts");
      const data = await res.json();
      if (data.error) setError(data.error);
      setContacts(data.contacts ?? []);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const act = async (action: "approve" | "unapprove" | "delete", psid: string) => {
    if (action === "delete" && !confirm("ลบ PSID นี้ทิ้ง? (จะไม่สามารถส่งข้อความหาคนนี้จากระบบได้)")) return;
    setWorking(psid);
    try {
      const res = await fetch("/api/admin/messenger-contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, psid }),
      });
      const data = await res.json();
      if (!res.ok) alert("เกิดข้อผิดพลาด: " + (data.error || res.status));
      await fetchContacts();
    } catch (err) {
      alert("เกิดข้อผิดพลาด: " + String(err));
    } finally {
      setWorking(null);
    }
  };

  const adminCount = contacts.filter((c) => c.is_admin).length;

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-2">
          <MessagesSquare className="text-primary" size={28} />
          แอดมินแชท Messenger
        </h1>
        <p className="text-slate-500 mt-1">
          คนที่แชทกับเพจจะถูกบันทึกอัตโนมัติ — กดยืนยันเพื่อรับแจ้งเตือนคิวใหม่
        </p>
      </div>

      {/* How it works */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-6 flex items-start gap-3">
        <Info size={18} className="text-primary shrink-0 mt-0.5" />
        <p className="text-sm text-slate-500 leading-relaxed">
          <b className="text-slate-700">ทำงานยังไง:</b> ลูกค้าส่งข้อความหาเพจ Messenger
          (เช่น พิมพ์ “จอง”) → ระบบบันทึก PSID ของคนนั้นลงตาราง{" "}
          <code className="bg-slate-100 px-1 rounded text-xs">messenger_contacts</code>{" "}
          อัตโนมัติ แล้วตอบกลับไปว่า “ยินดีต้อนรับ” พร้อมลิงก์จอง
          แอดมินที่กด <b className="text-slate-700">ยืนยันเป็นแอดมิน</b> จะได้รับแจ้งเตือนคิวใหม่
          (ส่งคู่กับ <code className="bg-slate-100 px-1 rounded text-xs">FACEBOOK_MESSENGER_RECIPIENT_IDS</code> ใน env)
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6 max-w-md">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <p className="text-xs text-slate-400 font-medium uppercase">คนที่แชทแล้ว</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{contacts.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-primary/20">
          <p className="text-xs text-primary font-medium uppercase flex items-center gap-1">
            <ShieldCheck size={12} /> แอดมิน
          </p>
          <p className="text-2xl font-bold text-primary mt-1">{adminCount}</p>
        </div>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 text-sm text-amber-700">
          ⚠️ {error}
          <p className="text-xs mt-1 text-amber-600">
            รัน SQL จากไฟล์ <code className="bg-amber-100 px-1 rounded">migrations/2026-08-18_messenger_contacts.sql</code>{" "}
            ใน Supabase SQL Editor ก่อน แล้วกดรีเฟรช
          </p>
        </div>
      )}

      {/* List */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-slate-800">รายชื่อคนที่แชทกับเพจ</h2>
        <button
          onClick={fetchContacts}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={14} className={cn(loading && "animate-spin")} />
          รีเฟรช
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      ) : contacts.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 shadow-sm border border-slate-100 text-center">
          <MessagesSquare size={48} className="mx-auto mb-4 opacity-40 text-slate-300" />
          <p className="text-slate-500 font-medium">ยังไม่มีใครแชทกับเพจ</p>
          <p className="text-sm text-slate-400 mt-1">
            ให้ลูกค้าส่งข้อความหาเพจ Messenger ก่อน — PSID จะมาโผล่ที่นี่อัตโนมัติ
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-slate-800 truncate">
                    {contact.name || "ไม่ทราบชื่อ"}
                  </h3>
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold",
                      contact.is_admin
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-slate-100 text-slate-500"
                    )}
                  >
                    {contact.is_admin ? "แอดมิน" : "ลูกค้า"}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 font-mono break-all">{contact.psid}</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  แชทครั้งแรก: {formatDateTime(contact.first_seen_at)} · ล่าสุด: {formatDateTime(contact.last_seen_at)}
                  {contact.is_admin && contact.approved_at && ` · ยืนยันเมื่อ: ${formatDateTime(contact.approved_at)}`}
                </p>
              </div>

              <div className="flex gap-2 shrink-0">
                {contact.is_admin ? (
                  <button
                    onClick={() => act("unapprove", contact.psid)}
                    disabled={working === contact.psid}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200 disabled:opacity-50 transition-colors"
                  >
                    {working === contact.psid ? <Loader2 size={14} className="animate-spin" /> : <UserX size={14} />}
                    ยกเลิกแอดมิน
                  </button>
                ) : (
                  <button
                    onClick={() => act("approve", contact.psid)}
                    disabled={working === contact.psid}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-md shadow-primary/20"
                  >
                    {working === contact.psid ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />}
                    ยืนยันเป็นแอดมิน
                  </button>
                )}
                <button
                  onClick={() => act("delete", contact.psid)}
                  disabled={working === contact.psid}
                  className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 disabled:opacity-50 transition-colors"
                  title="ลบ"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
