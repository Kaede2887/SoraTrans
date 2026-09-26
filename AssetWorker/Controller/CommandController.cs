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

        [HttpPost("make_patch")]
        public IActionResult MakePatch([FromForm] string dir)
        {
             Console.WriteLine($"接收到前端请求,处理补丁制作");
            _unityAssetsService.MakePatch(dir);
            return Ok();
        }
    }
}
