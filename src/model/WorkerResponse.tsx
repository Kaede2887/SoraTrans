export default interface WorkerResponse{
    Type: string,
    // scan 时是 string（计数），extract_log/extract_filelog 时是嵌套对象
    Message: unknown
}
