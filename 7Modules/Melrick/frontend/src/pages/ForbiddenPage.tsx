import { Link } from "react-router-dom";

const ForbiddenPage = () => {
  return (
    <div className="page">
      <header className="page__header">
        <div>
          <p className="eyebrow">Access</p>
          <h1>Forbidden</h1>
          <p className="subtitle">Your current role does not have access to this page.</p>
        </div>
      </header>

      <section className="card">
        <h2>Next Step</h2>
        <p className="hint">Switch role from the sidebar, or return to the login entry page.</p>
        <Link className="inline-link" to="/auth/login">
          Go to Auth Entry
        </Link>
      </section>
    </div>
  );
};

export default ForbiddenPage;
