namespace AssetWorker.Common.Entity;

public class MakePatchInfo
{
    public required string TransText {get;set;}
    public required string FieldPath {get;set;}
    public long ObjectPathId {get;set;}
    public required string AssetName {get;set;}
    public required string AssetPath {get;set;}
    public required string BundleName {get;set;}
    public required string BundlePath {get;set;}
}
