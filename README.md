# Goods Insight Web

亚马逊评论分析平台前端 - React 18 + Vite + Ant Design 5

## 启动

```bash
npm install
npm run dev      # 开发模式，默认 http://localhost:5173
npm run build    # 生产构建
npm run preview  # 预览构建产物
```

## 后端

默认代理到 `http://localhost:8080`（参见 `vite.config.js`）。
启动后端：`goods-insight` 目录下 `mvn spring-boot:run`。

## 目录

```
src/
  api/          axios 封装
  layouts/      全局布局
  pages/        6 个业务页面
  router/       路由
  utils/        工具方法
  App.jsx
  main.jsx
```

## 页面

| 路径 | 页面 |
|------|------|
| `/` | Dashboard - 概览 + 近期任务 |
| `/analysis/new` | 新建分析 - 输入 ASIN |
| `/product/:id` | 产品详情 - 评分/关键词/差评 |
| `/compare` | 竞品对比 |
| `/category` | 类目扫描 |
| `/jobs` | 任务中心 |