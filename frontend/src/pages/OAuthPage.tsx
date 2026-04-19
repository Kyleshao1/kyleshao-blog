import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth";

export function OAuthPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const token = params.get("token");
    const merged = params.get("merge") === "1";
    if (token) {
      login(token).then(() => {
        if (merged) {
          alert("检测到同名账号，已自动合并。");
        }
        navigate("/");
      });
    } else {
      navigate("/login");
    }
  }, [params, login, navigate]);

  return <main className="container">授权中...</main>;
}
