import React, { useEffect, useState } from "react";
import { apiFetch } from "../api";
import { useAuth } from "../auth";

export function ProfilePage() {
  const { user, refresh } = useAuth();
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [signature, setSignature] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setAvatarUrl(user.avatarUrl || "");
    setBio(user.bio || "");
    setSignature(user.signature || "");
  }, [user]);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    await apiFetch("/api/me", {
      method: "PUT",
      body: JSON.stringify({ name, avatarUrl, bio, signature }),
    });
    await refresh();
    setSaving(false);
    setMessage("已保存");
  };

  return (
    <main className="container narrow">
      <h1>个人资料</h1>
      <div className="form">
        <input className="input" placeholder="昵称" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="input" placeholder="头像 URL" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} />
        <textarea className="textarea" placeholder="简介" value={bio} onChange={(e) => setBio(e.target.value)} />
        <input className="input" placeholder="个人签名" value={signature} onChange={(e) => setSignature(e.target.value)} />
        {message && <div className="hint">{message}</div>}
        <button className="btn" onClick={save} disabled={saving}>保存</button>
      </div>
    </main>
  );
}
