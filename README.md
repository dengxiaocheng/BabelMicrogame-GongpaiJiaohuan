# 工牌交换

Babel microgame — 玩家交换工牌躲避危险岗位，但身份、脸、记录和证词必须保持一致。

## 在线试玩

https://dengxiaocheng.github.io/BabelMicrogame-GongpaiJiaohuan/

## 本地运行

克隆仓库后，用任意静态服务器打开 `index.html`（ES Module 需要 HTTP 协议）：

```bash
git clone https://github.com/dengxiaocheng/BabelMicrogame-GongpaiJiaohuan.git
cd BabelMicrogame-GongpaiJiaohuan
python3 -m http.server 8080
# 或 npx serve .
```

浏览器打开 `http://localhost:8080`。

## 测试

```bash
npm test
```

## 核心循环

查看岗位 → 交换工牌 → 调整证词 → 接受审查 → 结算危险和疑点
