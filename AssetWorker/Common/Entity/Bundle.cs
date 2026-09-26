namespace AssetWorker.Common.Entity
{
    public class Bundle
    {
        public long Id { get; set; }
        public string? Name { get; set; }
        public string? Size { get; set; }
        public string? Path { get; set; }
        public string? ParentBundleName { get; set; }
    }
}