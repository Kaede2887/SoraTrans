using System.Text.Encodings.Web;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using AssetWorker.Common.Dto;
using AssetWorker.Service;
using AssetWorker.Service.Impl;
using Microsoft.AspNetCore.Mvc;

namespace AssetWorker.Controller
{
    [ApiController]
    [Route("api/[controller]")]
    public class CommandController : ControllerBase
    {
        // camelCase 与普通 JSON 接口保持一致；不转义非 ASCII 字符（资产名含日文）
        private static readonly JsonSerializerOptions SseJsonOptions = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping
        };

        private readonly IUnityAssetsService _unityAssetsService;

        public CommandController(IUnityAssetsService unityAssetsService)
        {
            _unityAssetsService = unityAssetsService;
        }

        [HttpPost("init")]
        public IActionResult Init([FromBody] InitDTO initDTO)
        {
            Console.WriteLine($"接收到前端请求,正在处理初始化");
            return Ok(_unityAssetsService.Init(initDTO));
        }

        /// <summary>
        /// SSE：扫描过程中持续推送 start/progress/asset/bundle/done 事件。
        /// 不返回 IActionResult，直接向 Response.Body 写 SSE 帧；
        /// CancellationToken 参数由框架绑定为 HttpContext.RequestAborted，客户端断开即取消扫描。
        /// </summary>
        [HttpGet("scan/{title}")]
        public async Task Scan([FromRoute] string title, CancellationToken cancellationToken)
        {
            Response.Headers.ContentType = "text/event-stream";
            Response.Headers.CacheControl = "no-cache";
            // 经过 nginx 等反代时禁用响应缓冲，保证事件即时到达
            Response.Headers["X-Accel-Buffering"] = "no";
            Response.Headers["Access-Control-Allow-Origin"] = "*";

            Console.WriteLine($"接收到前端请求,正在处理扫描任务");
            try
            {
                await foreach (var (evt, data) in _unityAssetsService.ScanAsync(title, cancellationToken))
                {
                    cancellationToken.ThrowIfCancellationRequested();
                    await Response.WriteAsync($"event: {evt}\n", cancellationToken);
                    await Response.WriteAsync(
                        $"data: {JsonSerializer.Serialize(data, SseJsonOptions)}\n\n",
                        cancellationToken);
                    await Response.Body.FlushAsync(cancellationToken);
                }

                await Response.WriteAsync("event: done\ndata: {}\n\n", cancellationToken);
                await Response.Body.FlushAsync(cancellationToken);
            }
            catch (OperationCanceledException)
            {
                // 客户端主动断开，正常结束即可
            }
            catch (Exception ex)
            {
                // 此时响应头可能已发出，无法再改状态码，按 SSE 约定补发一个 error 帧
                try
                {
                    var payload = JsonSerializer.Serialize(new { message = ex.Message }, SseJsonOptions);
                    await Response.WriteAsync($"event: scan_error\ndata: {payload}\n\n");
                    await Response.Body.FlushAsync();
                }
                catch
                {
                    // 连接已断开等情况下写帧失败可忽略
                }
            }
        }

        [HttpPost("scan/pause")]
        public IActionResult PauseScan()
        {
            Console.WriteLine($"接收到前端请求,处理扫描暂停");
            _unityAssetsService.PauseScan();
            return Ok();
        }

        [HttpPost("scan/resume")]
        public IActionResult ResumeScan()
        {
            Console.WriteLine($"接收到前端请求,处理扫描恢复");
            _unityAssetsService.ResumeScan();
            return Ok();
        }

        [HttpPost("extract/pause")]
        public IActionResult PauseExtract()
        {
            Console.WriteLine($"接收到前端请求,处理解析暂停");
            _unityAssetsService.PauseExtract();
            return Ok();
        }

        [HttpPost("extract/resume")]
        public IActionResult ResumeExtract()
        {
             Console.WriteLine($"接收到前端请求,处理解析恢复");
            _unityAssetsService.ResumeExtract();
            return Ok();
        }

        [HttpGet("extract")]
        public async Task Extract(CancellationToken cancellationToken)
        {
            Response.Headers.ContentType = "text/event-stream";
            Response.Headers.CacheControl = "no-cache";
            Response.Headers["X-Accel-Buffering"] = "no";
            Response.Headers["Access-Control-Allow-Origin"] = "*";

            try
            {
                Console.WriteLine($"接收到前端请求,正在处理提取任务");
                await foreach (var (evt, data) in _unityAssetsService.ExtractAsync(cancellationToken))
                {
                    cancellationToken.ThrowIfCancellationRequested();
                    await Response.WriteAsync($"event: {evt}\n", cancellationToken);
                    await Response.WriteAsync(
                        $"data: {JsonSerializer.Serialize(data, SseJsonOptions)}\n\n",
                        cancellationToken);
                    await Response.Body.FlushAsync(cancellationToken);
                }

                await Response.WriteAsync("event: done\ndata: {}\n\n", cancellationToken);
                await Response.Body.FlushAsync(cancellationToken);
            }
            catch (OperationCanceledException)
            {
                // 客户端主动断开，正常结束即可
            }
            catch (Exception ex)
            {
                // 此时响应头可能已发出，无法再改状态码，按 SSE 约定补发一个 error 帧
                try
                {
                    var payload = JsonSerializer.Serialize(new { message = ex.Message }, SseJsonOptions);
                    await Response.WriteAsync($"event: extract_error\ndata: {payload}\n\n");
                    await Response.Body.FlushAsync();
                }
                catch
                {
                    // 连接已断开等情况下写帧失败可忽略
                }
            }
        }

        [HttpGet("view/{id}")]
        public async Task ViewData([FromRoute] int id, CancellationToken cancellationToken)
        {
            Response.Headers.ContentType = "text/event-stream";
            Response.Headers.CacheControl = "no-cache";
            Response.Headers["X-Accel-Buffering"] = "no";
            Response.Headers["Access-Control-Allow-Origin"] = "*";
            try
            {
                Console.WriteLine($"接收到前端请求,正在处理数据查看");
                await foreach (var (evt, data) in _unityAssetsService.ViewDataAsync(id, cancellationToken))
                {
                    cancellationToken.ThrowIfCancellationRequested();
                    await Response.WriteAsync($"event: {evt}\n", cancellationToken);
                    await Response.WriteAsync(
                        $"data: {JsonSerializer.Serialize(data, SseJsonOptions)}\n\n",
                        cancellationToken);
                    await Response.Body.FlushAsync(cancellationToken);
                }

                await Response.WriteAsync("event: done\ndata: {}\n\n", cancellationToken);
                await Response.Body.FlushAsync(cancellationToken);
            }
            catch (OperationCanceledException)
            {
                // 客户端主动断开，正常结束即可
            }
            catch (Exception ex)
            {
                // 此时响应头可能已发出，无法再改状态码，按 SSE 约定补发一个 error 帧
                try
                {
                    var payload = JsonSerializer.Serialize(new { message = ex.Message }, SseJsonOptions);
                    await Response.WriteAsync($"event: view_error\ndata: {payload}\n\n");
                    await Response.Body.FlushAsync();
                }
                catch
                {
                    // 连接已断开等情况下写帧失败可忽略
                }
            }
        }

        /// <summary>
        /// GET /texture/{id} —— 解码 Texture2D 并直接返回 PNG，前端用 &lt;img&gt; 加载。
        /// 业务错误（对象不存在/非 Texture2D/格式不支持）返回 400 + 纯文本原因。
        /// </summary>
        [HttpGet("texture/{id}")]
        public async Task<IActionResult> TexturePreview([FromRoute] int id, CancellationToken cancellationToken)
        {
            Console.WriteLine($"接收到前端请求,正在处理纹理预览: {id}");
            try
            {
                var preview = await _unityAssetsService.GetTexturePreviewAsync(id, cancellationToken);

                Response.Headers["Access-Control-Allow-Origin"] = "*";
                // 纹理可能很大（数 MB），且资源数据在编辑后会变化，不放长缓存
                Response.Headers.CacheControl = "no-cache";
                Response.Headers["X-Texture-Width"] = preview.Width.ToString();
                Response.Headers["X-Texture-Height"] = preview.Height.ToString();
                Response.Headers["X-Texture-Format"] = preview.TextureFormat.ToString();
                return File(preview.Png, "image/png");
            }
            catch (OperationCanceledException)
            {
                return StatusCode(StatusCodes.Status499ClientClosedRequest);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"纹理预览失败 id={id}: {ex.Message}");
                return BadRequest(ex.Message);
            }
        }

        /// <summary>
        /// POST /texture/import/{id} —— 接收用户上传的 PNG，按原 Texture2D 格式重新编码后
        /// 存入 texture_patch 表（不写文件）。制作补丁时（make_patch）与文本修改一起打包。
        /// multipart/form-data：
        ///   - png: 上传的 PNG 文件
        /// 返回 JSON：{ width, height, textureFormat }。
        /// 业务错误（非 Texture2D / 格式不支持导入 / 存库失败）返回 400 + 纯文本原因。
        /// </summary>
        [HttpPost("texture/import/{id}")]
        [RequestSizeLimit(200_000_000)] // 单张纹理 PNG 上限 200MB，覆盖大尺寸 RGBA32
        public async Task<IActionResult> ImportTexture(
            [FromRoute] int id,
            IFormFile png,
            CancellationToken cancellationToken)
        {
            Console.WriteLine($"接收到前端请求,正在处理纹理导入: {id}");
            try
            {
                if (png == null || png.Length == 0)
                {
                    return BadRequest("未接收到 PNG 文件");
                }

                using var ms = new MemoryStream();
                await png.CopyToAsync(ms, cancellationToken);
                var result = await _unityAssetsService.ImportTextureAsync(
                    id, ms.ToArray(), cancellationToken);

                Response.Headers["Access-Control-Allow-Origin"] = "*";
                return Ok(new
                {
                    width = result.Width,
                    height = result.Height,
                    textureFormat = result.TextureFormat
                });
            }
            catch (OperationCanceledException)
            {
                return StatusCode(StatusCodes.Status499ClientClosedRequest);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"纹理导入失败 id={id}: {ex}");
                return BadRequest(ex.Message);
            }
        }

        [HttpPost("make_patch")]
        public IActionResult MakePatch([FromForm] string dir)
        {
             Console.WriteLine($"接收到前端请求,处理补丁制作");
            _unityAssetsService.MakePatch(dir);
            return Ok();
        }
    }
}
