# Lifestyle Migration：上传与文件说明

本版日期：2026 年 11 月 24 日，v18。

## 上传 GitHub Pages

1. 解压 Lifestyle_Migration_GitHub_2026-11-24_v18.zip。解压后应直接看到 index.html、assets、downloads、papers 和 .nojekyll。
2. 把解压出来的全部文件和文件夹上传到 GitHub 仓库根目录，包括 .nojekyll。上传网站文件，不是把 ZIP 本身作为网站上传；也不要在根目录外面再套一层 website 文件夹。
3. 在仓库 Settings → Pages 中，Source 选 Deploy from a branch，选择你上传文件的分支（通常是 main），文件夹选 /(root)，保存。部署完成后打开 GitHub 显示的网站地址。

网站无需 npm、Node 或构建命令。图片、模型汇总数据、地图和文档均随包提供，链接支持 GitHub 项目子路径。

## 网站顺序

01 Overview；02 Research Blog；03 Lifestyle Patterns；04 Compare Your Day；05 Lifestyle Profiles；06 Move for a New Lifestyle；07 Lifestyle Migration；A1 Data & Models；A2 Predictive Validation；10 Copyright。

Blog 正式列为第二页。07 迁移页为年龄、教育、个人收入三张交互折线图，每张可选六条活动线；完整主结果仍可展开或下载。整站页面链接使用同一版本号。

## 两个稿件文件

- Moving_for_a_New_Lifestyle_2026-11-24.docx：可编辑 Word。
- Moving_for_a_New_Lifestyle_2026-11-24.pdf：18 页 PDF。

已清除 For coauthor review、Working draft 等封面、页脚、版权和文件属性标记。论文内容、研究估计、图表和参考文献保留。网页论文下载和封面已同步；网站内文件位于 papers。

## 本地预览及研究贡献

可以直接打开 index.html；也可以在解压目录运行 python3 preview_server.py，用本地服务器预览。GitHub Pages 是静态网站，不会运行 Python 接收程序。各 Explore 的自愿研究贡献在无接收服务时只下载到访问者设备，不会发送到研究团队。

GitHub 包仅含网站及公开汇总材料，不含原始个体日记、逐人预测或私有研究提交。完整交付包另有 paper、website 和 reproducibility；上传网站时只用 GitHub 包，或上传完整包中 website 内的内容。
