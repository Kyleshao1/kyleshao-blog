import React, { useEffect, useState } from "react";
import { apiFetch } from "../api";
import { useAuth } from "../auth";
import { Markdown } from "../components/Markdown";

export function ProfilePage() {
  const { user, refresh } = useAuth();
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [signature, setSignature] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [newGroup, setNewGroup] = useState("");

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setAvatarUrl(user.avatarUrl || "");
    setBio(user.bio || "");
    setSignature(user.signature || "");
  }, [user]);

  const loadGroups = async () => {
    const data = await apiFetch<{ groups: { id: string; name: string }[] }>("/api/groups");
    setGroups(data.groups);
  };

  useEffect(() => {
    if (user) loadGroups();
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

  const createGroup = async () => {
    if (!newGroup.trim()) return;
    await apiFetch("/api/groups", {
      method: "POST",
      body: JSON.stringify({ name: newGroup.trim() }),
    });
    setNewGroup("");
    loadGroups();
  };

  const removeGroup = async (id: string) => {
    await apiFetch(`/api/groups/${id}`, { method: "DELETE" });
    loadGroups();
  };

  return (
    <main className="container narrow">
      <h1>个人资料</h1>
      <div className="form">
        <input className="input" placeholder="昵称" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="input" placeholder="头像 URL" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} />
        <textarea className="textarea" placeholder="简介（支持 Markdown）" value={bio} onChange={(e) => setBio(e.target.value)} />
        <input className="input" placeholder="个人签名（支持 Markdown）" value={signature} onChange={(e) => setSignature(e.target.value)} />
        {message && <div className="hint">{message}</div>}
        <button className="btn btn--ghost" onClick={() => setShowPreview((v) => !v)}>
          {showPreview ? "关闭预览" : "预览资料"}
        </button>
        <button className="btn" onClick={save} disabled={saving}>保存</button>
      </div>

      {showPreview && (
        <section className="card">
          <h2>资料预览</h2>
          <div className="muted">{name}</div>
          {signature && <Markdown content={signature} />}
          {bio && <Markdown content={bio} />}
        </section>
      )}

      <section className="card">
        <h2>博客分组</h2>
        <div className="row">
          <input className="input" placeholder="新分组名称" value={newGroup} onChange={(e) => setNewGroup(e.target.value)} />
          <button className="btn btn--ghost" onClick={createGroup}>创建</button>
        </div>
        {groups.length === 0 ? (
          <div className="muted">暂无分组</div>
        ) : (
          <div className="table">
            {groups.map((g) => (
              <div key={g.id} className="table__row">
                <div>{g.name}</div>
                <button className="btn btn--ghost" onClick={() => removeGroup(g.id)}>删除</button>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
