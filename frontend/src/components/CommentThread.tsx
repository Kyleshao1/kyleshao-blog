import React, { useState } from "react";
import { Markdown } from "./Markdown";
import { apiFetch } from "../api";
import { useAuth } from "../auth";

export type CommentItem = {
  id: string;
  postId: string;
  parentId?: string | null;
  contentMd: string;
  createdAt: string;
  updatedAt: string;
  author: { id: string; name: string; avatarUrl?: string | null; signature?: string };
  counts: { likes: number; dislikes: number };
  viewerReaction: number;
  replies: CommentItem[];
};

export function CommentThread({
  comments,
  onChanged,
}: {
  comments: CommentItem[];
  onChanged: () => void;
}) {
  return (
    <div className="comment-list">
      {comments.map((c) => (
        <CommentNode key={c.id} comment={c} onChanged={onChanged} />
      ))}
    </div>
  );
}

function CommentNode({ comment, onChanged }: { comment: CommentItem; onChanged: () => void }) {
  const { user } = useAuth();
  const [replying, setReplying] = useState(false);
  const [text, setText] = useState("");
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.contentMd);
  const [showReplyPreview, setShowReplyPreview] = useState(false);
  const [showEditPreview, setShowEditPreview] = useState(false);

  const react = async (value: 1 | -1) => {
    await apiFetch(`/api/comments/${comment.id}/reaction`, {
      method: "POST",
      body: JSON.stringify({ value }),
    });
    onChanged();
  };

  const reply = async () => {
    if (!text.trim()) return;
    await apiFetch(`/api/comments/post/${comment.postId}`, {
      method: "POST",
      body: JSON.stringify({ contentMd: text, parentId: comment.id }),
    });
    setText("");
    setReplying(false);
    onChanged();
  };

  const saveEdit = async () => {
    if (!editText.trim()) return;
    await apiFetch(`/api/comments/${comment.id}`, {
      method: "PUT",
      body: JSON.stringify({ contentMd: editText }),
    });
    setEditing(false);
    onChanged();
  };

  const remove = async () => {
    await apiFetch(`/api/comments/${comment.id}`, { method: "DELETE" });
    onChanged();
  };

  return (
    <div className="comment">
      <div className="comment__meta">
        <strong>{comment.author.name}</strong>
        {comment.author.signature && <span>· {comment.author.signature}</span>}
        <span className="muted">{new Date(comment.createdAt).toLocaleString()}</span>
      </div>
      {editing ? (
        <div className="comment__edit">
          <textarea className="textarea" value={editText} onChange={(e) => setEditText(e.target.value)} />
          <div className="row">
            <button className="btn" onClick={saveEdit}>保存</button>
            <button className="btn btn--ghost" onClick={() => setShowEditPreview((v) => !v)}>
              {showEditPreview ? "关闭预览" : "预览"}
            </button>
            <button className="btn btn--ghost" onClick={() => setEditing(false)}>取消</button>
          </div>
          {showEditPreview && (
            <div className="card">
              <Markdown content={editText || "预览内容"} />
            </div>
          )}
        </div>
      ) : (
        <div className="comment__body">
          <Markdown content={comment.contentMd} />
        </div>
      )}
      <div className="comment__actions">
        <button className="btn btn--ghost" onClick={() => react(1)}>赞 {comment.counts.likes}</button>
        <button className="btn btn--ghost" onClick={() => react(-1)}>踩 {comment.counts.dislikes}</button>
        {user && (
          <button className="btn btn--ghost" onClick={() => setReplying((v) => !v)}>回复</button>
        )}
        {user && (user.id === comment.author.id || user.role === "ADMIN") && (
          <>
            <button className="btn btn--ghost" onClick={() => setEditing(true)}>编辑</button>
            <button className="btn btn--ghost" onClick={remove}>删除</button>
          </>
        )}
      </div>
      {replying && (
        <div className="comment__reply">
          <textarea className="textarea" value={text} onChange={(e) => setText(e.target.value)} />
          <div className="row">
            <button className="btn" onClick={reply}>提交</button>
            <button className="btn btn--ghost" onClick={() => setShowReplyPreview((v) => !v)}>
              {showReplyPreview ? "关闭预览" : "预览"}
            </button>
            <button className="btn btn--ghost" onClick={() => setReplying(false)}>取消</button>
          </div>
          {showReplyPreview && (
            <div className="card">
              <Markdown content={text || "预览内容"} />
            </div>
          )}
        </div>
      )}
      {comment.replies.length > 0 && (
        <div className="comment__children">
          {comment.replies.map((r) => (
            <CommentNode key={r.id} comment={r} onChanged={onChanged} />
          ))}
        </div>
      )}
    </div>
  );
}
