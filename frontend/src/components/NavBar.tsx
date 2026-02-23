import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";

export function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="nav">
      <div className="nav__inner">
        <Link className="logo" to="/">Blog</Link>
        <nav className="nav__links">
          <Link to="/">首页</Link>
          {user && <Link to="/editor">写文章</Link>}
          {user && <Link to="/profile">个人资料</Link>}
          {user?.role === "ADMIN" && <Link to="/admin">管理后台</Link>}
          <a href="https://github.com/Kyleshao1/kyleshao-blog" target="_blank" rel="noreferrer">
            GitHub
          </a>
        </nav>
        <div className="nav__auth">
          {user ? (
            <>
              <span className="nav__user">{user.name}</span>
              <button
                className="btn btn--ghost"
                onClick={() => {
                  logout();
                  navigate("/");
                }}
              >
                退出
              </button>
            </>
          ) : (
            <>
              <Link className="btn btn--ghost" to="/login">登录</Link>
              <Link className="btn" to="/register">注册</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
