SoraTrans

SoraTrans 是一款基于 Tauri、React、Rust 和 C#/.NET 开发的 Unity 游戏本地化工具，提供 Unity 游戏资源扫描、文本提取、翻译导入、资源修改以及 AssetBundle 重新打包等功能。

Features
Unity 游戏扫描
自动识别 Unity 游戏目录及相关资源
扫描游戏中的 AssetBundle、Assets 等资源文件
建立游戏资源索引
Unity 资源解析
基于 AssetsTools.NET 解析 Unity 资源
支持 Unity Asset 对象及字段数据读取
支持通过字段路径定位目标数据
文本提取
从 Unity Asset 中提取文本数据
保存文本所在的资源、对象及字段路径
支持对文本内容进行进一步筛选和分析
文本导入
支持将翻译后的文本重新导入资源
支持同一 Asset 中多个字段批量修改
保留原文与资源位置之间的关联关系
AssetBundle 修改
支持修改 AssetBundle 内部的 Assets 文件
支持修改后的资源重新写入 Bundle
支持批量处理多个资源文件
项目管理
管理多个 Unity 游戏项目
使用 SQLite 保存项目及资源数据
提供资源、文本及项目相关信息管理
Tech Stack
Frontend
React
TypeScript
Vite
Tailwind CSS
shadcn/ui
Desktop Application
Tauri 2
Rust

Rust 负责桌面应用的核心逻辑、数据库管理、项目管理以及与资源处理服务之间的通信。

Unity Resource Processing
.NET 8
AssetsTools.NET
Cpp2IL
LibCpp2IL
Mono.Cecil
Dapper
Microsoft.Data.Sqlite

C#/.NET 资源处理服务负责 Unity 游戏资源的扫描、解析、文本提取和资源修改。

Architecture

SoraTrans 采用桌面应用与 Unity 资源处理服务分离的架构。

┌─────────────────────────────────────────┐
│                SoraTrans                │
│                                         │
│  React / TypeScript                     │
│            │                            │
│            ▼                            │
│       Tauri / Rust                      │
│            │                            │
│            ├── SQLite                   │
│            │                            │
│            └── Task Management          │
│                                         │
└────────────────┬────────────────────────┘
                 │
                 │ HTTP / SSE
                 ▼
┌─────────────────────────────────────────┐
│              AssetWorker                │
│                                         │
│  C# / .NET 8                            │
│            │                            │
│            ├── Unity Resource Scanner   │
│            ├── Asset Parser             │
│            ├── Text Extraction          │
│            └── Asset Patching           │
│                                         │
└─────────────────────────────────────────┘
Workflow

SoraTrans 的基本工作流程如下：

Unity Game
    │
    ▼
Resource Scanning
    │
    ▼
Asset Analysis
    │
    ▼
Text Extraction
    │
    ▼
Translation Import
    │
    ▼
Asset Patching
    │
    ▼
AssetBundle Repacking
    │
    ▼
Localized Game
Text Localization

Unity 游戏中的字符串并不一定都是可以直接修改的本地化文本。

某些字符串可能同时承担资源名称、Dictionary Key、资源查找参数、内部 ID 等作用。直接修改这些字符串可能导致游戏无法正常加载资源或运行。

因此，SoraTrans 在文本提取过程中不仅关注字符串本身的语言特征，也会结合：

Unity Asset 类型
字段路径
字段名称
资源结构
字符串出现位置
运行时引用关系

对文本进行分析，以降低修改运行时关键字符串所产生的问题。

Project Status

SoraTrans 目前处于开发阶段。

当前主要工作集中在：

Unity 游戏资源扫描
Unity Asset 解析
文本提取
翻译数据导入
Unity Asset 修改
AssetBundle 重新打包
可本地化文本识别
Unity 游戏兼容性

由于不同 Unity 游戏在资源结构和运行时实现上存在较大差异，SoraTrans 对不同游戏的支持程度可能有所不同。

Requirements

开发环境：

Windows
Rust
Node.js
.NET 8 SDK

具体版本要求会随着项目开发逐步确定。

Building

项目目前主要面向 Windows 开发和运行。

克隆项目：

git clone https://github.com/Kaede2887/SoraTrans.git
cd SoraTrans

安装前端依赖：

npm install

运行开发环境：

npm run tauri dev

具体构建方式及 AssetWorker 配置将在项目 API 和目录结构稳定后进一步完善。

Disclaimer

SoraTrans 主要用于 Unity 游戏本地化、资源格式研究以及相关技术学习。

请在使用本项目时遵守相关软件的用户协议、版权许可及适用法律法规。

修改游戏资源前建议备份原始文件，并在独立的游戏副本上进行测试。

License

SoraTrans is licensed under the MIT License.

Copyright © 2026 SoraTrans.
