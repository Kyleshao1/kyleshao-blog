import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../api";
import { useAuth } from "../auth";

export function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const data = await apiFetch<{ token: string }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      await login(data.token);
      navigate("/");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <main className="container narrow">
      <h1>注册</h1>
      <form className="form" onSubmit={submit}>
        <input className="input" placeholder="昵称" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="input" placeholder="邮箱" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input
          className="input"
          placeholder="密码（至少 8 位）"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <div className="error">{error}</div>}
        <button className="btn" type="submit">注册</button>
      </form>
      <div className="hint">
        已有账号？<Link to="/login">登录</Link>
      </div>
    </main>
  );
}
