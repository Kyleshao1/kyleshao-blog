import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../api";
import { useAuth } from "../auth";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const data = await apiFetch<{ token: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      await login(data.token);
      navigate("/");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const apiBase = import.meta.env.VITE_API_BASE || "";

  return (
    <main className="container narrow">
      <h1>登录</h1>
      <form className="form" onSubmit={submit}>
        <input className="input" placeholder="邮箱" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input
          className="input"
          placeholder="密码"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <div className="error">{error}</div>}
        <button className="btn" type="submit">登录</button>
      </form>
      <div className="hint">
        还没有账号？<Link to="/register">注册</Link>
      </div>
      <div className="divider" />
      <a className="btn btn--ghost" href={`${apiBase}/api/auth/github`}>GitHub 登录</a>
    </main>
  );
}
