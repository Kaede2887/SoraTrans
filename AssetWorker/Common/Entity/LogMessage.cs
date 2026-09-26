namespace AssetWorker.Common.Entity
{
    public class LogMessage<T>
    {
        public string? Type { get; set; }
        public string? Time { get; set; }
        public T? Log { get; set; }
    }
}