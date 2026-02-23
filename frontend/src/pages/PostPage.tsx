import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "../api";
import { useAuth } from "../auth";
import { Markdown } from "../components/Markdown";
import { CommentThread, CommentItem } from "../components/CommentThread";

export function PostPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentText, setCommentText] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const data = await apiFetch<{ post: any }>(`/api/posts/${id}`);
    const commentData = await apiFetch<{ items: CommentItem[] }>(`/api/comments/post/${id}`);
    setPost(data.post);
    setComments(commentData.items);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [id]);

  const react = async (value: 1 | -1) => {
    await apiFetch(`/api/posts/${id}/reaction`, {
      method: "POST",
      body: JSON.stringify({ value }),
    });
    load();
  };

  const submitComment = async () => {
    if (!commentText.trim()) return;
    await apiFetch(`/api/comments/post/${id}`, {
      method: "POST",
      body: JSON.stringify({ contentMd: commentText }),
    });
    setCommentText("");
    load();
  };

  const removePost = async () => {
    await apiFetch(`/api/posts/${id}`, { method: "DELETE" });
    window.location.href = "/";
  };

  if (loading) {
    return <main className="container">加载中...</main>;
  }

  if (!post) {
    return <main className="container">文章不存在</main>;
  }

  const canEdit = user && (user.id === post.author.id || user.role === "ADMIN");

  return (
    <main className="container">
      <article className="post">
        <div className="post__header">
          <h1>{post.title}</h1>
          <div className="post__meta">
            <span>{post.author.name}</span>
            {post.author.signature && <span>· {post.author.signature}</span>}
            {post.group && <span>· 分组 {post.group.name}</span>}
            <span>· {new Date(post.createdAt).toLocaleString()}</span>
          </div>
          {canEdit && (
            <div className="row">
              <Link className="btn btn--ghost" to={`/editor/${post.id}`}>编辑</Link>
              <button className="btn btn--ghost" onClick={removePost}>删除</button>
            </div>
          )}
        </div>
        <div className="post__content">
          <Markdown content={post.contentMd} />
        </div>
        <div className="post__actions">
          <button className="btn btn--ghost" onClick={() => react(1)}>赞 {post.counts.likes}</button>
          <button className="btn btn--ghost" onClick={() => react(-1)}>踩 {post.counts.dislikes}</button>
          <span>评论 {post.counts.comments}</span>
        </div>
      </article>

      <section className="comments">
        <h2>评论</h2>
        {user ? (
          <div className="comment-form">
            <textarea className="textarea" value={commentText} onChange={(e) => setCommentText(e.target.value)} />
            <div className="row">
              <button className="btn btn--ghost" onClick={() => setShowPreview((v) => !v)}>
                {showPreview ? "关闭预览" : "预览评论"}
              </button>
              <button className="btn" onClick={submitComment}>发表评论</button>
            </div>
            {showPreview && (
              <div className="card">
                <Markdown content={commentText || "预览内容"} />
              </div>
            )}
          </div>
        ) : (
          <div className="hint">登录后可评论</div>
        )}
        <CommentThread comments={comments} onChanged={load} />
      </section>
    </main>
  );
}
