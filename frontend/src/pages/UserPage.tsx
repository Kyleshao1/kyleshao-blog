import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { apiFetch } from "../api";
import { useAuth } from "../auth";
import { Markdown } from "../components/Markdown";

export function UserPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const data = await apiFetch<{ user: any; posts: any[]; comments: any[] }>(`/api/users/${id}`);
    setProfile(data.user);
    setPosts(data.posts);
    setComments(data.comments);
    setLoading(false);
  };

  const loadFollowing = async () => {
    if (!user) return;
    const data = await apiFetch<{ following: boolean }>(`/api/users/${id}/following`);
    setFollowing(data.following);
  };

  useEffect(() => {
    load();
    if (user) {
      loadFollowing();
    }
  }, [id, user]);

  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    posts.forEach((post) => {
      const key = post.group?.name || "未分组";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(post);
    });
    return Array.from(map.entries());
  }, [posts]);

  const toggleFollow = async () => {
    const data = await apiFetch<{ following: boolean }>(`/api/users/${id}/follow`, { method: "POST" });
    setFollowing(data.following);
    load();
  };

  if (loading) {
    return <main className="container">加载中...</main>;
  }

  if (!profile) {
    return <main className="container">用户不存在</main>;
  }

  return (
    <main className="container">
      <section className="card">
        <h1>{profile.name}</h1>
        {profile.signature && <div className="muted">{profile.signature}</div>}
        {profile.bio && <Markdown content={profile.bio} />}
        <div className="row">
          <span>文章 {profile._count.posts}</span>
          <span>关注者 {profile._count.followers}</span>
          <span>关注中 {profile._count.following}</span>
        </div>
        {user && user.id !== profile.id && (
          <button className="btn btn--ghost" onClick={toggleFollow}>
            {following ? "取消关注" : "关注"}
          </button>
        )}
      </section>

      <section className="card">
        <h2>文章分组</h2>
        {grouped.length === 0 ? (
          <div className="muted">暂无文章</div>
        ) : (
          grouped.map(([groupName, items]) => (
            <div key={groupName} className="group">
              <h3>{groupName}</h3>
              <div className="list">
                {items.map((post) => (
                  <div key={post.id} className="card">
                    <a className="card__title" href={`/posts/${post.id}`}>{post.title}</a>
                    <div className="card__meta">
                      <span>{new Date(post.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="card__body">
                      <Markdown content={post.contentMd.slice(0, 200)} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </section>

      <section className="card">
        <h2>最新评论</h2>
        {comments.length === 0 ? (
          <div className="muted">暂无评论</div>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="comment">
              <div className="comment__meta">
                <span>于《{c.post.title}》</span>
                <span>{new Date(c.createdAt).toLocaleString()}</span>
              </div>
              <div className="comment__body">
                <Markdown content={c.contentMd} />
              </div>
            </div>
          ))
        )}
      </section>
    </main>
  );
}
