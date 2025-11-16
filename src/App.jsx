import React, { useState, useEffect } from 'react'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

function App() {
  const [articles, setArticles] = useState([])
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [showEditor, setShowEditor] = useState(false)
  const [editingArticle, setEditingArticle] = useState(null)
  const [formData, setFormData] = useState({ title: '', content: '' })

  useEffect(() => {
    fetchArticles()
    checkAuth()
  }, [])

  const fetchArticles = async () => {
    try {
      const response = await axios.get(`${API_BASE}/articles`)
      setArticles(response.data)
    } catch (error) {
      console.error('抓取失败:', error)
    }
  }

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      if (token) {
        const response = await axios.get(`${API_BASE}/auth/login`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setIsAuthenticated(response.data.authenticated)
      }
    } catch (error) {
      localStorage.removeItem('adminToken')
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    try {
      const response = await axios.post(`${API_BASE}/auth/login`, { password })
      if (response.data.success) {
        localStorage.setItem('adminToken', response.data.token)
        setIsAuthenticated(true)
        setPassword('')
      }
    } catch (error) {
      alert('密码错误')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('adminToken')
    setIsAuthenticated(false)
    setShowEditor(false)
    setEditingArticle(null)
  }

  const handleCreate = () => {
    setEditingArticle(null)
    setFormData({ title: '', content: '' })
    setShowEditor(true)
  }

  const handleEdit = (article) => {
    setEditingArticle(article)
    setFormData({ title: article.title, content: article.content })
    setShowEditor(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('adminToken')
      if (editingArticle) {
        await axios.put(`${API_BASE}/articles/${editingArticle._id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        })
      } else {
        await axios.post(`${API_BASE}/articles`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        })
      }
      setShowEditor(false)
      setEditingArticle(null)
      setFormData({ title: '', content: '' })
      fetchArticles()
    } catch (error) {
      alert('保存失败')
    }
  }

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this article?')) {
      try {
        const token = localStorage.getItem('adminToken')
        await axios.delete(`${API_BASE}/articles/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        fetchArticles()
      } catch (error) {
        alert('删除失败')
      }
    }
  }

  return (
    <div>
      <header className="header">
        <div className="container">
          <h1>kyleshao的博客</h1>
          {isAuthenticated && (
            <div style={{ marginTop: '1rem' }}>
              <button onClick={handleCreate} className="btn btn-primary">新建文章</button>
              <button onClick={handleLogout} className="btn btn-secondary" style={{ marginLeft: '1rem' }}>登出</button>
            </div>
          )}
        </div>
      </header>

      <div className="container">
        {!isAuthenticated ? (
          <form onSubmit={handleLogin} className="login-form">
            <h2>输入管理密码</h2>
            <input
              type="password"
              placeholder="输入管理密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="submit">登录</button>
          </form>
        ) : showEditor ? (
          <div className="admin-panel">
            <h2>{editingArticle ? '修改文章' : '新建文章'}</h2>
            <form onSubmit={handleSubmit} className="editor">
              <input
                type="text"
                placeholder="标题"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
              />
              <textarea
                placeholder="用Markdown编写"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                required
              />
              <div className="editor-actions">
                <button type="submit" className="btn btn-primary">
                  {editingArticle ? '更新' : '创建'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditor(false)}>
                  取消
                </button>
              </div>
            </form>
          </div>
        ) : null}

        <div>
          {articles.map(article => (
            <div key={article._id} className="article">
              <h2>{article.title}</h2>
              <div className="article-meta">
                Published on {new Date(article.createdAt).toLocaleDateString()}
              </div>
              <div className="article-content">
                <ReactMarkdown
                  remarkPlugins={[remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                >
                  {article.content}
                </ReactMarkdown>
              </div>
              {isAuthenticated && !showEditor && (
                <div style={{ marginTop: '1rem' }}>
                  <button onClick={() => handleEdit(article)} className="btn btn-primary">编辑</button>
                  <button onClick={() => handleDelete(article._id)} className="btn btn-danger" style={{ marginLeft: '0.5rem' }}>删除</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default App
