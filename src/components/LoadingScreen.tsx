export function LoadingScreen({ message = "Finding a cursed local street..." }: { message?: string }) {
  return (
    <div className="screen centered">
      <div className="panel loading-panel">
        <p className="blink">PLEASE WAIT</p>
        <h2>{message}</h2>
      </div>
    </div>
  );
}
