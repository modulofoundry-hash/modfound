import { Link } from "react-router-dom";
import { PROFILES } from "../constants/profiles";

export function ProfileSelect() {
  return (
    <div className="centered-page">
      <h1>Quem é você?</h1>
      <div className="profile-grid">
        {PROFILES.map((profile) => (
          <Link
            key={profile.id}
            to={`/perfis/${profile.id}`}
            className="profile-card"
          >
            {profile.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
