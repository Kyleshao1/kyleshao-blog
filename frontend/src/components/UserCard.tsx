import React from "react";
import { Link } from "react-router-dom";
import { Markdown } from "./Markdown";

export type UserListItem = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  bio?: string;
  signature?: string;
  createdAt: string;
  _count?: { posts: number; followers: number };
};

export function UserCard({ user }: { user: UserListItem }) {
  return (
    <article className="card">
      <div className="card__header">
        <Link to={`/users/${user.id}`} className="card__title">{user.name}</Link>
        <div className="card__meta">
          <span>{new Date(user.createdAt).toLocaleDateString()}</span>
          {user.signature && <span>· {user.signature}</span>}
        </div>
      </div>
      {user.bio && (
        <div className="card__body">
          <Markdown content={user.bio} />
        </div>
      )}
      {user._count && (
        <div className="card__footer">
          <span>文章 {user._count.posts}</span>
          <span>关注者 {user._count.followers}</span>
        </div>
      )}
    </article>
  );
}
