namespace AssetWorker.Common.Entity
{
    public class Segment
    {
        public string? K { get; set; }  // kind: "type-primitive" | "type-complex" | "field" | "middle" | "value" | "string" | "text"
        public string? T { get; set; }  // text 内容
    }
}
