# WeChat Chat Generator - 后端服务器

跨设备同步后端，永久存储聊天截图/HTML 和回放状态。

## 一键免费部署到 Render.com

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/shiqianghua/wechat-chat)

点击上方按钮 → 授权 GitHub → 点击 **Deploy** 即可。

部署后获得固定域名如 `https://wechat-chat-backend.onrender.com`。

**在网页端使用**：打开 https://shiqianghua.github.io/wechat-chat/generator.html，在顶部栏输入后端地址，所有操作自动跨设备同步。

## 本地运行

```bash
pip install -r requirements.txt
python server.py
# 服务运行在 http://localhost:8767
```

## API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/sync` | 下载所有分组数据（含回放状态） |
| POST | `/api/sync` | 上传所有分组数据 |
| POST | `/api/upload/image` | 上传图片到图床，返回永久 URL |
| POST | `/api/upload/html` | 上传 HTML 聊天文件 |
| GET | `/api/health` | 健康检查 |
| GET | `/static/images/<fn>` | 访问已上传的图片 |

## 注意

- Render 免费计划：15 分钟无请求会休眠，下次请求自动唤醒（约 30 秒）
- 数据存储在 Render 磁盘上，重新部署不会丢失
- 如需更稳定的方案，可升级到 Render Starter 计划（$7/月）
