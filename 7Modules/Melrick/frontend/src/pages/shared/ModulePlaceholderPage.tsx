type ModulePlaceholderPageProps = {
  title: string;
  description: string;
};

const ModulePlaceholderPage = ({ title, description }: ModulePlaceholderPageProps) => {
  return (
    <div className="page">
      <header className="page__header">
        <div>
          <p className="eyebrow">Integration</p>
          <h1>{title}</h1>
          <p className="subtitle">{description}</p>
        </div>
      </header>
      <section className="card">
        <h2>Pending Merge</h2>
        <p className="hint">
          This route is reserved in the unified shell and will render the full module page once merged.
        </p>
      </section>
    </div>
  );
};

export default ModulePlaceholderPage;
