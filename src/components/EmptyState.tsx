export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <section className="glass-card empty-state">
      <h2>{title}</h2>
      <p className="muted">{body}</p>
    </section>
  );
}
