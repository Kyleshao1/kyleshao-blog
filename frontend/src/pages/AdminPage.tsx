import React, { useEffect, useState } from "react";
import { apiFetch } from "../api";
import { useAuth } from "../auth";

type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: "USER" | "ADMIN";
  isBanned: boolean;
  mutedUntil?: string | null;
  createdAt: string;
};

export function AdminPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [postId, setPostId] = useState("");
  const [commentId, setCommentId] = useState("");

  const load = async () => {
    setLoading(true);
    const data = await apiFetch<{ users: AdminUser[] }>("/api/admin/users");
    setUsers(data.users);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  if (!user || user.role !== "ADMIN") {
    return <main className="container">无权限</main>;
  }

  const toggleBan = async (target: AdminUser) => {
    await apiFetch(`/api/admin/users/${target.id}`, {
      method: "PATCH",
      body: JSON.stringify({ isBanned: !target.isBanned, mutedUntil: target.mutedUntil || null }),
    });
    load();
  };

  const mute = async (target: AdminUser, hours: number) => {
    const until = new Date(Date.now() + hours * 3600 * 1000).toISOString();
    await apiFetch(`/api/admin/users/${target.id}`, {
      method: "PATCH",
      body: JSON.stringify({ mutedUntil: until }),
    });
    load();
  };

  const unmute = async (target: AdminUser) => {
    await apiFetch(`/api/admin/users/${target.id}`, {
      method: "PATCH",
      body: JSON.stringify({ mutedUntil: null }),
    });
    load();
  };

  const deletePost = async () => {
    if (!postId.trim()) return;
    await apiFetch(`/api/admin/posts/${postId}`, { method: "DELETE" });
    setPostId("");
    alert("已删除文章");
  };

  const deleteComment = async () => {
    if (!commentId.trim()) return;
    await apiFetch(`/api/admin/comments/${commentId}`, { method: "DELETE" });
    setCommentId("");
    alert("已删除评论");
  };

  return (
    <main className="container">
      <h1>管理后台</h1>
      <section className="card">
        <h2>内容快速删除</h2>
        <div className="row">
          <input className="input" placeholder="文章 ID" value={postId} onChange={(e) => setPostId(e.target.value)} />
          <button className="btn btn--ghost" onClick={deletePost}>删除文章</button>
        </div>
        <div className="row">
          <input className="input" placeholder="评论 ID" value={commentId} onChange={(e) => setCommentId(e.target.value)} />
          <button className="btn btn--ghost" onClick={deleteComment}>删除评论</button>
        </div>
      </section>
      <section className="card">
        <h2>用户管理</h2>
        {loading ? (
          <div>加载中...</div>
        ) : (
          <div className="table">
            {users.map((u) => (
              <div key={u.id} className="table__row">
                <div>
                  <div><strong>{u.name}</strong> ({u.email})</div>
                  <div className="muted">注册于 {new Date(u.createdAt).toLocaleDateString()}</div>
                </div>
                <div className="row">
                  {u.role !== "ADMIN" && (
                    <>
                      <button className="btn btn--ghost" onClick={() => toggleBan(u)}>
                        {u.isBanned ? "解除封号" : "封号"}
                      </button>
                      <button className="btn btn--ghost" onClick={() => mute(u, 24)}>禁言 24h</button>
                      <button className="btn btn--ghost" onClick={() => unmute(u)}>解除禁言</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
