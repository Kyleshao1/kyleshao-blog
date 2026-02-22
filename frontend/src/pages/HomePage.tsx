import React, { useEffect, useState } from "react";
import { apiFetch } from "../api";
import { PostCard, PostListItem } from "../components/PostCard";

export function HomePage() {
  const [items, setItems] = useState<PostListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = async (q = "") => {
    setLoading(true);
    const data = await apiFetch<{ items: PostListItem[] }>(`/api/posts?search=${encodeURIComponent(q)}`);
    setItems(data.items);
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
          placeholder="搜索标题或内容"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn" onClick={() => load(search)}>搜索</button>
      </div>
      {loading ? (
        <div>加载中...</div>
      ) : (
        <div className="list">
          {items.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </main>
  );
}
