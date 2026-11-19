# MemoFlow 1.3.0

## 本次更新

- 桌宠使用 `images/luoxiaohei_desktop_pet_frames` 中六组共 30 张透明 PNG 动作帧。
- 待机和坐下保持每两秒一轮，睁眼停留后在约 130 毫秒内快速眨眼。
- 保留随机慢走、突然跑动、方向翻转、点击跳跃和拖动。
- 菜单支持坐下、睡觉；点击可以唤醒，重新开启自由活动可以继续移动。
- 图片预加载后开始播放；系统减少动态效果设置继续生效。

## 验证

- `npm run build` 通过，包括 TypeScript 检查和生产资源打包。
- `node --test tests/pet-frames.test.mjs tests/pet-motion.test.mjs tests/desktop-config.test.mjs`：16 项通过。
- 内置浏览器验证六组图片动作、方向翻转、睡觉、点击唤醒和坐下。
- 本机未安装 Rust；Windows 可执行程序和安装包通过 GitHub Actions 构建。
- 本次未启动原生应用进行桌面回归测试。

## 使用

退出托盘中运行的旧版本后，再启动新版 `memoflow.exe`，或运行 `MemoFlow_1.3.0_x64-setup.exe` 安装。
数据位置和应用标识保持不变。
