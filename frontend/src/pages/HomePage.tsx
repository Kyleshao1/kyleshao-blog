import React, { useEffect, useState } from "react";
import { apiFetch } from "../api";
import { UserCard, UserListItem } from "../components/UserCard";

export function HomePage() {
  const [items, setItems] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = async (q = "") => {
    setLoading(true);
    const data = await apiFetch<{ users: UserListItem[] }>(`/api/users`);
    const filtered = q
      ? data.users.filter((u) =>
          (u.name || "").toLowerCase().includes(q.toLowerCase()) ||
          (u.bio || "").toLowerCase().includes(q.toLowerCase())
        )
      : data.users;
    setItems(filtered);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="container">
      <div className="toolbar">
        <input
          className="input"
          placeholder="搜索用户或简介"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn" onClick={() => load(search)}>搜索</button>
      </div>
      {loading ? (
        <div>加载中...</div>
      ) : (
        <div className="list">
          {items.map((user) => (
            <UserCard key={user.id} user={user} />
          ))}
        </div>
      )}
    </main>
  );
}
