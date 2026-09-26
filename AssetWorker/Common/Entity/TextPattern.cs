namespace AssetWorker.Common.Entity
{
    public class TextPattern
    {
        public long Id { get; set; }
        public required string Pattern { get; set; }
        public required string Semantic { get; set; }
        public long? Count {get;set;}
    }
}
