using System;

namespace AssetWorker.Service.Impl;

public class TaskControl
{
    private readonly ManualResetEventSlim _pauseEvent = new(true);

    public bool IsPaused => !_pauseEvent.IsSet;

    public void Pause()
    {
        _pauseEvent.Reset();
    }

    public void Resume()
    {
        _pauseEvent.Set();
    }

    public void WaitIfPaused(CancellationToken cancellationToken)
    {
        _pauseEvent.Wait(cancellationToken);
    }
}
