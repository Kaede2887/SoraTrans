export default function LauncherFooter({className}:{className:string}) {
    const version = "SoraTrans Ver 0.1.0"

    return(
        <div className={className}>
            <span>{version}</span>
        </div>
    )
}