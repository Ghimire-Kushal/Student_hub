"use client";

import { useState, useTransition } from "react";
import { updateName, updateEmail, updatePassword } from "@/app/actions/profile";

interface Props {
  name: string | null;
  email: string;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-ink mb-1">{label}</label>
      {children}
    </div>
  );
}

function StatusMsg({ ok, msg }: { ok: boolean; msg: string }) {
  return (
    <p className={`text-sm mt-1 ${ok ? "text-green-600" : "text-red-500"}`}>{msg}</p>
  );
}

export function ProfileForm({ name, email }: Props) {
  // Name
  const [nameVal, setNameVal] = useState(name ?? "");
  const [nameStatus, setNameStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [namePending, startNameTransition] = useTransition();

  // Email
  const [emailVal, setEmailVal] = useState(email);
  const [emailPwd, setEmailPwd] = useState("");
  const [emailStatus, setEmailStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [emailPending, startEmailTransition] = useTransition();

  // Password
  const [curPwd, setCurPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdStatus, setPwdStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [pwdPending, startPwdTransition] = useTransition();

  function handleName(e: React.FormEvent) {
    e.preventDefault();
    setNameStatus(null);
    startNameTransition(async () => {
      try {
        await updateName(nameVal);
        setNameStatus({ ok: true, msg: "Name updated." });
      } catch (err) {
        setNameStatus({ ok: false, msg: err instanceof Error ? err.message : "Failed." });
      }
    });
  }

  function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setEmailStatus(null);
    startEmailTransition(async () => {
      try {
        await updateEmail(emailVal, emailPwd);
        setEmailPwd("");
        setEmailStatus({ ok: true, msg: "Email updated. Sign out and back in to refresh your session." });
      } catch (err) {
        setEmailStatus({ ok: false, msg: err instanceof Error ? err.message : "Failed." });
      }
    });
  }

  function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwdStatus(null);
    if (newPwd !== confirmPwd) {
      setPwdStatus({ ok: false, msg: "New passwords don't match." });
      return;
    }
    startPwdTransition(async () => {
      try {
        await updatePassword(curPwd, newPwd);
        setCurPwd(""); setNewPwd(""); setConfirmPwd("");
        setPwdStatus({ ok: true, msg: "Password changed successfully." });
      } catch (err) {
        setPwdStatus({ ok: false, msg: err instanceof Error ? err.message : "Failed." });
      }
    });
  }

  const inputCls = "w-full px-3 py-2 border border-border rounded-lg text-sm text-ink bg-white focus:outline-none focus:ring-2 focus:ring-accent";
  const btnCls = "px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent/90 disabled:opacity-50";

  return (
    <div className="space-y-8">
      {/* Name */}
      <section className="bg-white border border-border rounded-xl p-6">
        <h2 className="text-base font-semibold text-ink mb-4">Display name</h2>
        <form onSubmit={handleName} className="space-y-3">
          <Field label="Name">
            <input
              value={nameVal}
              onChange={(e) => setNameVal(e.target.value)}
              placeholder="Your name"
              className={inputCls}
            />
          </Field>
          {nameStatus && <StatusMsg {...nameStatus} />}
          <button type="submit" disabled={namePending} className={btnCls}>
            {namePending ? "Saving…" : "Save name"}
          </button>
        </form>
      </section>

      {/* Email */}
      <section className="bg-white border border-border rounded-xl p-6">
        <h2 className="text-base font-semibold text-ink mb-4">Email address</h2>
        <form onSubmit={handleEmail} className="space-y-3">
          <Field label="New email">
            <input
              type="email"
              value={emailVal}
              onChange={(e) => setEmailVal(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Current password (to confirm)">
            <input
              type="password"
              value={emailPwd}
              onChange={(e) => setEmailPwd(e.target.value)}
              placeholder="Enter your password"
              className={inputCls}
            />
          </Field>
          {emailStatus && <StatusMsg {...emailStatus} />}
          <button type="submit" disabled={emailPending} className={btnCls}>
            {emailPending ? "Saving…" : "Save email"}
          </button>
        </form>
      </section>

      {/* Password */}
      <section className="bg-white border border-border rounded-xl p-6">
        <h2 className="text-base font-semibold text-ink mb-4">Change password</h2>
        <form onSubmit={handlePassword} className="space-y-3">
          <Field label="Current password">
            <input
              type="password"
              value={curPwd}
              onChange={(e) => setCurPwd(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="New password">
            <input
              type="password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              placeholder="At least 8 characters"
              className={inputCls}
            />
          </Field>
          <Field label="Confirm new password">
            <input
              type="password"
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              className={inputCls}
            />
          </Field>
          {pwdStatus && <StatusMsg {...pwdStatus} />}
          <button type="submit" disabled={pwdPending} className={btnCls}>
            {pwdPending ? "Saving…" : "Change password"}
          </button>
        </form>
      </section>
    </div>
  );
}
