import { fetch } from '@tauri-apps/plugin-http';
import { writeFile, readFile } from '@tauri-apps/plugin-fs';
import runSSE from './SSEHandler';

// 统一维护 AssetWorker (dotnet) 后端的全部 HTTP/SSE 请求，
// 避免在各个组件里硬编码 http://localhost:5089/api/command/...
const BASE_URL = 'http://localhost:5089';
const API_PREFIX = `${BASE_URL}/api/command`;

export interface InitPayload {
    Path: string;
    DbPath: string;
    // 游戏可执行文件名（不含扩展名），用于精确匹配 {Title}_Data 目录
    Title?: string;
}

class AssetApi {
    private readonly prefix = API_PREFIX;

    // POST /init —— 初始化资源管理器（加载 classdata、识别 Mono/IL2CPP）
    async init(payload: InitPayload): Promise<void> {
        await fetch(`${this.prefix}/init`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
    }

    // SSE GET /scan/{title} —— 扫描游戏资源，流式推送进度
    scan(title: string): Promise<void> {
        return runSSE(`${this.prefix}/scan/${encodeURIComponent(title)}`);
    }

    // SSE GET /extract —— 提取文本数据，流式推送进度
    extract(): Promise<void> {
        return runSSE(`${this.prefix}/extract`);
    }

    // SSE GET /view/{id} —— 查看单个资源对象的字段树
    view(id: number): Promise<void> {
        return runSSE(`${this.prefix}/view/${id}`);
    }

    // 拉取解码后的 PNG 并转成 blob URL；失败时抛出后端返回的中文原因
    // GET /texture/{id}
    async fetchTexturePreview(id: number): Promise<{ blobUrl: string; width: number; height: number }> {
        const res = await fetch(`${this.prefix}/texture/${id}`, { method: 'GET' });
        if (!res.ok) {
            const msg = await res.text().catch(() => "");
            throw new Error(msg || `服务返回状态 ${res.status}`);
        }
        const blob = await res.blob();
        return {
            blobUrl: URL.createObjectURL(blob),
            width: Number(res.headers.get('X-Texture-Width') ?? 0),
            height: Number(res.headers.get('X-Texture-Height') ?? 0),
        };
    }

    // 导出纹理：复用 GET /texture/{id} 解码 PNG，写入用户选择的本地路径
    async exportTexture(id: number, savePath: string): Promise<{ width: number; height: number }> {
        const res = await fetch(`${this.prefix}/texture/${id}`, { method: 'GET' });
        if (!res.ok) {
            const msg = await res.text().catch(() => "");
            throw new Error(msg || `服务返回状态 ${res.status}`);
        }
        const buf = await res.arrayBuffer();
        await writeFile(savePath, new Uint8Array(buf));
        return {
            width: Number(res.headers.get('X-Texture-Width') ?? 0),
            height: Number(res.headers.get('X-Texture-Height') ?? 0),
        };
    }

    // 导入纹理：读取本地 PNG，按原 Texture2D 格式重新编码后存入 texture_patch 表。
    // 不写文件——制作补丁时（makePatch）与文本修改一起打包到 SoraTransOutput。
    // POST /texture/import/{id} (multipart: png)
    async importTexture(
        id: number,
        pngPath: string,
    ): Promise<{ width: number; height: number; textureFormat: number }> {
        const pngData = await readFile(pngPath);
        const form = new FormData();
        form.append('png', new Blob([pngData], { type: 'image/png' }), 'texture.png');
        const res = await fetch(`${this.prefix}/texture/import/${id}`, {
            method: 'POST',
            body: form,
        });
        if (!res.ok) {
            const msg = await res.text().catch(() => "");
            throw new Error(msg || `服务返回状态 ${res.status}`);
        }
        return await res.json();
    }

    // POST /scan/pause
    async pauseScan(): Promise<void> {
        await fetch(`${this.prefix}/scan/pause`, { method: 'POST' });
    }

    // POST /scan/resume
    async resumeScan(): Promise<void> {
        await fetch(`${this.prefix}/scan/resume`, { method: 'POST' });
    }

    // POST /extract/pause
    async pauseExtract(): Promise<void> {
        await fetch(`${this.prefix}/extract/pause`, { method: 'POST' });
    }

    // POST /extract/resume
    async resumeExtract(): Promise<void> {
        await fetch(`${this.prefix}/extract/resume`, { method: 'POST' });
    }

    // POST /make_patch —— form-urlencoded 传入导出目录
    async makePatch(dir: string): Promise<void> {
        const formData = new URLSearchParams();
        formData.append('dir', dir);
        const res = await fetch(`${this.prefix}/make_patch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData,
        });
        if (!res.ok) throw new Error(`服务返回状态 ${res.status}`);
    }
}

export const assetApi = new AssetApi();
