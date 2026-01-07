import { useParams, Link } from "react-router-dom";

export default function CarDetail() {
  const { id } = useParams();

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <Link to="/collection" className="underline opacity-80">
        ← Terug naar collectie
      </Link>

      <h1 className="mt-6 text-3xl font-semibold">Car detail page</h1>
      <p className="mt-2 opacity-80">ID uit URL: <b>{id}</b></p>
    </div>
  );
}
