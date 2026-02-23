import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../api";
import { Markdown } from "../components/Markdown";

export function EditorPage() {
  const { id } = useParams();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [groupId, setGroupId] = useState<string | null>(null);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    apiFetch<{ post: any }>(`/api/posts/${id}`).then((data) => {
      setTitle(data.post.title);
      setContent(data.post.contentMd);
      setGroupId(data.post.group?.id || null);
    });
  }, [id]);

  useEffect(() => {
    apiFetch<{ groups: { id: string; name: string }[] }>("/api/groups").then((data) => {
      setGroups(data.groups);
    });
  }, []);

  const save = async () => {
    if (!title.trim() || !content.trim()) return;
    setLoading(true);
    if (id) {
      await apiFetch(`/api/posts/${id}`, {
        method: "PUT",
        body: JSON.stringify({ title, contentMd: content, groupId }),
      });
      navigate(`/posts/${id}`);
    } else {
      const data = await apiFetch<{ post: any }>("/api/posts", {
        method: "POST",
        body: JSON.stringify({ title, contentMd: content, groupId }),
      });
      navigate(`/posts/${data.post.id}`);
    }
  };

  return (
    <main className="container">
      <h1>{id ? "编辑文章" : "新建文章"}</h1>
      <div className="editor">
        <div className="editor__form">
          <input className="input" placeholder="标题" value={title} onChange={(e) => setTitle(e.target.value)} />
          <select className="input" value={groupId || ""} onChange={(e) => setGroupId(e.target.value || null)}>
            <option value="">未分组</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          <textarea className="textarea" value={content} onChange={(e) => setContent(e.target.value)} />
          <button className="btn" onClick={save} disabled={loading}>保存</button>
        </div>
        <div className="editor__preview">
          <div className="preview__title">预览</div>
          <Markdown content={content || "预览内容"} />
        </div>
      </div>
    </main>
  );
}
