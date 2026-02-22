import React from "react";
import { Link } from "react-router-dom";
import { Markdown } from "./Markdown";

export type PostListItem = {
  id: string;
  title: string;
  contentMd: string;
  createdAt: string;
  author: { id: string; name: string; avatarUrl?: string | null; signature?: string };
  counts: { comments: number; likes: number; dislikes: number };
  viewerReaction: number;
};

export function PostCard({ post }: { post: PostListItem }) {
  const preview = post.contentMd.length > 200 ? post.contentMd.slice(0, 200) + "..." : post.contentMd;
  return (
    <article className="card">
      <div className="card__header">
        <Link to={`/posts/${post.id}`} className="card__title">{post.title}</Link>
        <div className="card__meta">
          <span>{new Date(post.createdAt).toLocaleString()}</span>
          <span>·</span>
          <span>{post.author.name}</span>
          {post.author.signature && <span>· {post.author.signature}</span>}
        </div>
      </div>
      <div className="card__body">
        <Markdown content={preview} />
      </div>
      <div className="card__footer">
        <span>👍 {post.counts.likes}</span>
        <span>👎 {post.counts.dislikes}</span>
        <span>💬 {post.counts.comments}</span>
      </div>
    </article>
  );
}
