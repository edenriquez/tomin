/** Three drifting radial gradients plus grain. Presentational only. */
export function MeshGradient() {
    return (
        <div aria-hidden className="grain absolute inset-0 overflow-hidden">
            <div className="mesh mesh-a" />
            <div className="mesh mesh-b" />
            <div className="mesh mesh-c" />
            <div className="mesh-fade" />
        </div>
    );
}
