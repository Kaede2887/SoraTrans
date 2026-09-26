using AssetWorker.Service;
using AssetWorker.Service.Impl;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton<IUnityAssetsService, UnityAssetsService>();
builder.Services.AddControllers();
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowSpecificOrigins", policy =>
    {
        policy.WithOrigins("https://example.com")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();
app.UseRouting();
app.UseCors("AllowSpecificOrigins");
app.MapControllers();
app.UseAuthorization();

app.UseHttpsRedirection();

app.Run();