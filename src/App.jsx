import React, { useState, useEffect } from 'react'
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Link, 
  useParams, 
  useNavigate,
  Navigate 
} from 'react-router-dom'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

const API_BASE = import.meta.env.VITE_API_URL || '/api'
console.log('API基础URL:', API_BASE)  // 添加这行

// 主页组件 - 显示文章列表
function HomePage() {
  const [articles, setArticles] = useState([])
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    console.log('HomePage: 初始化')  // 添加这行
    fetchArticles()
    checkAuth()
  }, [])

  const fetchArticles = async () => {
    try {
      console.log('获取文章中...')  // 添加这行
      const response = await axios.get(`${API_BASE}/articles`)
      console.log('文章数据:', response.data)  // 添加这行
      setArticles(response.data)
    } catch (error) {
      console.error('抓取失败:', error.response || error)
    }
  }

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      console.log('HomePage检查认证，token:', token)  // 添加这行
      if (token) {
        const response = await axios.get(`${API_BASE}/auth/check`, {  // 修复这里
          headers: { Authorization: `Bearer ${token}` }
        })
        console.log('HomePage认证检查响应:', response.data)  // 添加这行
        setIsAuthenticated(response.data.authenticated)
      } else {
        console.log('HomePage: 没有找到token')
      }
    } catch (error) {
      console.error('HomePage认证检查错误:', error.response || error)
      localStorage.removeItem('adminToken')
      setIsAuthenticated(false)
    }
  }

  const handleDelete = async (id) => {
    if (confirm('确定要删除这篇文章吗?')) {
      try {
        const token = localStorage.getItem('adminToken')
        console.log('删除文章，token:', token)  // 添加这行
        await axios.delete(`${API_BASE}/articles/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        fetchArticles()
      } catch (error) {
        console.error('删除失败:', error.response || error)
        alert('删除失败')
      }
    }
  }

  return (
    <div>
      <div className="container">
        <div style={{ marginBottom: '2rem' }}>
          <h2>所有文章</h2>
          <p>当前认证状态: {isAuthenticated ? '已登录' : '未登录'}</p>  {/* 添加这行 */}
        </div>
        <div>
          {articles.map(article => (
            <div key={article._id} className="article">
              <h2>
                <Link to={`/article/${article._id}`} className="article-link">
                  {article.title}
                </Link>
              </h2>
              <div className="article-meta">
                发布于 {new Date(article.createdAt).toLocaleDateString('zh-CN')}
              </div>
              <div className="article-preview">
                <ReactMarkdown
                  remarkPlugins={[remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                >
                  {article.content.length > 200 
                    ? article.content.substring(0, 200) + '...' 
                    : article.content}
                </ReactMarkdown>
              </div>
              <div className="article-footer">
                <Link to={`/article/${article._id}`} className="read-more">
                  阅读全文 →
                </Link>
                {isAuthenticated && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <Link 
                      to={`/edit/${article._id}`}
                      className="btn btn-primary"
                      style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}
                    >
                      编辑
                    </Link>
                    <button 
                      onClick={() => handleDelete(article._id)} 
                      className="btn btn-danger"
                      style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}
                    >
                      删除
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// 单篇文章页面
function ArticlePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [article, setArticle] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('ArticlePage: 文章ID:', id)  // 添加这行
    fetchArticle()
    checkAuth()
  }, [id])

  const fetchArticle = async () => {
    try {
      console.log('获取单篇文章...')  // 添加这行
      const response = await axios.get(`${API_BASE}/articles/${id}`)
      console.log('单篇文章数据:', response.data)  // 添加这行
      setArticle(response.data)
    } catch (error) {
      console.error('抓取文章失败:', error.response || error)
    } finally {
      setLoading(false)
    }
  }

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      console.log('ArticlePage检查认证，token:', token)  // 添加这行
      if (token) {
        const response = await axios.get(`${API_BASE}/auth/check`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        console.log('ArticlePage认证检查响应:', response.data)  // 添加这行
        setIsAuthenticated(response.data.authenticated)
      }
    } catch (error) {
      console.error('ArticlePage认证检查错误:', error.response || error)
      localStorage.removeItem('adminToken')
    }
  }

  const handleDelete = async () => {
    if (confirm('确定要删除这篇文章吗?')) {
      try {
        const token = localStorage.getItem('adminToken')
        console.log('删除单篇文章，token:', token)  // 添加这行
        await axios.delete(`${API_BASE}/articles/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        navigate('/')
      } catch (error) {
        console.error('删除失败:', error.response || error)
        alert('删除失败')
      }
    }
  }

  if (loading) {
    return (
      <div className="container">
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          加载中...
        </div>
      </div>
    )
  }

  if (!article) {
    return (
      <div className="container">
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <h2>文章未找到</h2>
          <Link to="/" className="btn btn-primary" style={{ marginTop: '1rem' }}>
            返回首页
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <article className="article-full">
        <div className="article-header">
          <Link to="/" className="back-link">
            ← 返回所有文章
          </Link>
          <h1>{article.title}</h1>
          <div className="article-meta">
            发布于 {new Date(article.createdAt).toLocaleDateString('zh-CN')}
          </div>
        </div>

        <div className="article-content">
          <ReactMarkdown
            remarkPlugins={[remarkMath]}
            rehypePlugins={[rehypeKatex]}
          >
            {article.content}
          </ReactMarkdown>
        </div>

        {isAuthenticated && (
          <div className="admin-actions" style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #eee' }}>
            <Link 
              to={`/edit/${article._id}`}
              className="btn btn-primary"
            >
              编辑文章
            </Link>
            <button 
              onClick={handleDelete}
              className="btn btn-danger"
              style={{ marginLeft: '1rem' }}
            >
              删除文章
            </button>
          </div>
        )}
      </article>
    </div>
  )
}

// 登录页面
function LoginPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    try {
      console.log('尝试登录，密码:', password)  // 添加这行
      const response = await axios.post(`${API_BASE}/auth/login`, { password })
      console.log('登录响应:', response.data)  // 添加这行
      if (response.data.success) {
        console.log('存储token:', response.data.token)  // 添加这行
        localStorage.setItem('adminToken', response.data.token)
        navigate('/')
      }
    } catch (error) {
      console.error('登录错误:', error.response || error)  // 添加这行
      setError('密码错误')
    }
  }

  return (
    <div className="container">
      <div className="login-container">
        <div className="login-card">
          <h2>输入管理密码</h2>
          <p className="login-description">
            输入管理员密码以访问管理面板
          </p>
          
          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label htmlFor="password">密码</label>
              <input
                id="password"
                type="password"
                placeholder="输入管理密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="form-input"
              />
            </div>
            
            {error && <div className="error-message">{error}</div>}
            
            <button type="submit" className="btn btn-primary btn-block">
              登录
            </button>
          </form>
          
          <div className="login-footer">
            <button 
              onClick={() => navigate('/')} 
              className="btn btn-link"
            >
              ← 返回首页
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// 编辑页面
function EditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({ title: '', content: '' })

  useEffect(() => {
    console.log('EditPage: 文章ID:', id || '新建文章')  // 添加这行
    checkAuth()
    if (id) {
      fetchArticle()
    }
  }, [id])

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      console.log('EditPage检查认证，token:', token)  // 添加这行
      if (token) {
        const response = await axios.get(`${API_BASE}/auth/check`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        console.log('EditPage认证检查响应:', response.data)  // 添加这行
        setIsAuthenticated(response.data.authenticated)
      } else {
        console.log('EditPage: 没有token，跳转到登录页')
        navigate('/login')
      }
    } catch (error) {
      console.error('EditPage认证检查错误:', error.response || error)
      localStorage.removeItem('adminToken')
      navigate('/login')
    } finally {
      setLoading(false)
    }
  }

  const fetchArticle = async () => {
    try {
      const response = await axios.get(`${API_BASE}/articles/${id}`)
      setFormData({
        title: response.data.title,
        content: response.data.content
      })
    } catch (error) {
      console.error('抓取文章失败:', error.response || error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('adminToken')
      console.log('保存文章，token:', token)  // 添加这行
      if (id) {
        console.log('更新文章:', id)  // 添加这行
        await axios.put(`${API_BASE}/articles/${id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        })
      } else {
        console.log('创建新文章')  // 添加这行
        await axios.post(`${API_BASE}/articles`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        })
      }
      navigate('/')
    } catch (error) {
      console.error('保存失败:', error.response || error)
      alert('保存失败')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('adminToken')
    navigate('/login')
  }

  if (loading) {
    return (
      <div className="container">
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          加载中...
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="container">
      <div className="admin-panel">
        <div className="admin-header">
          <h2>{id ? '修改文章' : '新建文章'}</h2>
          <div>
            <Link to="/" className="btn btn-secondary">取消</Link>
            <button onClick={handleLogout} className="btn btn-secondary" style={{ marginLeft: '1rem' }}>
              登出
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="editor">
          <input
            type="text"
            placeholder="标题"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            className="editor-title"
          />
          <textarea
            placeholder="用Markdown编写"
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            required
            className="editor-textarea"
          />
          <div className="editor-actions">
            <button type="submit" className="btn btn-primary btn-large">
              {id ? '更新' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// 头部组件
function Header() {
  const navigate = useNavigate()
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      console.log('Header检查认证，token:', token)  // 添加这行
      if (token) {
        const response = await axios.get(`${API_BASE}/auth/check`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        console.log('Header认证检查响应:', response.data)  // 添加这行
        setIsAuthenticated(response.data.authenticated)
      }
    } catch (error) {
      console.error('Header认证检查错误:', error.response || error)
      localStorage.removeItem('adminToken')
    }
  }

  const handleLogout = () => {
    console.log('用户登出')  // 添加这行
    localStorage.removeItem('adminToken')
    setIsAuthenticated(false)
    navigate('/')
  }

  return (
    <header className="header">
      <div className="container header-container">
        <div className="logo">
          <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>
            <h1>kyleshao的博客</h1>
          </Link>
        </div>
        
        <nav className="nav">
          <Link to="/" className="nav-link">首页</Link>
          {isAuthenticated ? (
            <>
              <Link to="/edit" className="btn btn-primary">新建文章</Link>
              <button onClick={handleLogout} className="btn btn-secondary" style={{ marginLeft: '1rem' }}>
                登出
              </button>
            </>
          ) : (
            <Link to="/login" className="btn btn-primary">管理登录</Link>
          )}
        </nav>
      </div>
    </header>
  )
}

// 主App组件
function App() {
  return (
    <Router>
      <div className="app">
        <Header />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/article/:id" element={<ArticlePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/edit" element={<EditPage />} />
            <Route path="/edit/:id" element={<EditPage />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
