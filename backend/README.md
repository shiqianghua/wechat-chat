# WeChat Chat Generator - Backend Server

跨设备同步后端，永久存储聊天截图和回放状态。

## 本地运行

```bash
pip install -r requirements.txt
python server.py
# 服务运行在 http://localhost:8767
```

网页端在顶部输入后端地址 `http://localhost:8767` 即可同步。

## 免费部署到 Render.com

1. 注册 https://render.com（GitHub 登录）
2. 点击 New → Web Service
3. 连接 GitHub 仓库 `shiqianghua/wechat-chat`
4. 设置：
   - **Root Directory**: `backend`
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn server:app --bind 0.0.0.0:$PORT`
5. 点击 Deploy

部署后获得固定域名如 `https://wechat-chat-backend.onrender.com`，在网页端填入即可实现跨设备同步。

## API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/sync` | 下载所有分组数据 |
| POST | `/api/sync` | 上传所有分组数据 |
| GET | `/api/health` | 健康检查 |
