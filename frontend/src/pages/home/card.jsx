import { useMemo, useState } from "react";
import {
  HiOutlineCheckCircle,
  HiOutlineKey,
  HiOutlinePhotograph,
  HiOutlineUserAdd,
} from "react-icons/hi";

const empty = {
  name: "",
  email: "",
  department: "",
  role: "Member",
  status: "active",
  password: "",
};
export default function AddUsers() {
  const [form, setForm] = useState(empty),
    [file, setFile] = useState(null),
    [saving, setSaving] = useState(false),
    [success, setSuccess] = useState(false),
    [error, setError] = useState("");
  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  const permissions = useMemo(
    () =>
      form.role === "Administrator"
        ? ["Manage people", "Manage settings", "View all activity"]
        : form.role === "Manager"
          ? ["Manage team members", "View reports", "Invite collaborators"]
          : ["Participate in conversations", "Manage own profile"],
    [form.role],
  );
  const update = (event) =>
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  const generatePassword = () =>
    setForm((current) => ({
      ...current,
      password: `${crypto.randomUUID().slice(0, 8)}!A9`,
    }));
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!form.name || !form.email || form.password.length < 8)
      return setError(
        "Please complete the required fields and use a password of at least 8 characters.",
      );
    setSaving(true);
    try {
      const data = new FormData();
      Object.entries(form).forEach(([key, value]) => data.append(key, value));
      if (file) data.append("picture", file);
      const response = await fetch(`${baseUrl}/api/users`, {
        method: "POST",
        credentials: "include",
        body: data,
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Unable to add this user");
      setSuccess(true);
      setForm(empty);
      setFile(null);
    } catch (reason) {
      setError(reason.message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <section className="workspace-page add-user-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">WORKSPACE</p>
          <h1>Add a user</h1>
          <p>Invite a collaborator with the right access from the start.</p>
        </div>
      </header>
      <form className="add-user-layout" onSubmit={submit}>
        <div className="surface-card form-card">
          <div className="form-section">
            <h2>Personal information</h2>
            <p>These details appear on the person’s profile.</p>
            <label className="avatar-uploader">
              <span>
                {file ? (
                  <img src={URL.createObjectURL(file)} alt="Avatar preview" />
                ) : (
                  <HiOutlinePhotograph />
                )}
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
              />
              <b>Upload profile image</b>
              <small>PNG, JPG, or GIF</small>
            </label>
            <div className="form-grid">
              <label>
                Full name
                <input
                  name="name"
                  value={form.name}
                  onChange={update}
                  required
                  placeholder="Alex Morgan"
                />
              </label>
              <label>
                Email address
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={update}
                  required
                  placeholder="alex@company.com"
                />
              </label>
              <label>
                Department
                <input
                  name="department"
                  value={form.department}
                  onChange={update}
                  placeholder="Customer success"
                />
              </label>
              <label>
                Role
                <select name="role" value={form.role} onChange={update}>
                  <option>Member</option>
                  <option>Manager</option>
                  <option>Administrator</option>
                </select>
              </label>
              <label>
                Status
                <select name="status" value={form.status} onChange={update}>
                  <option value="active">Active</option>
                  <option value="invited">Invite pending</option>
                </select>
              </label>
              <label>
                Password
                <div className="password-field">
                  <input
                    type="text"
                    name="password"
                    value={form.password}
                    onChange={update}
                    required
                    minLength="8"
                    placeholder="Create a secure password"
                  />
                  <button
                    type="button"
                    onClick={generatePassword}
                    aria-label="Generate password"
                  >
                    <HiOutlineKey />
                  </button>
                </div>
              </label>
            </div>
          </div>
          {error && <p className="form-error">{error}</p>}
          <div className="form-actions">
            <button
              type="button"
              className="button-secondary"
              onClick={() => {
                setForm(empty);
                setFile(null);
                setError("");
              }}
            >
              Discard
            </button>
            <button className="button-primary" disabled={saving}>
              <HiOutlineUserAdd />
              {saving ? "Adding user…" : "Add user"}
            </button>
          </div>
        </div>
        <aside className="surface-card permission-preview">
          <p className="eyebrow">ACCESS PREVIEW</p>
          <h2>{form.role} permissions</h2>
          <p>Access is based on the role selected above.</p>
          <ul>
            {permissions.map((permission) => (
              <li key={permission}>
                <HiOutlineCheckCircle />
                {permission}
              </li>
            ))}
          </ul>
        </aside>
      </form>
      {success && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="surface-card success-dialog">
            <HiOutlineCheckCircle />
            <h2>User added</h2>
            <p>
              The new user can now sign in with the account details you created.
            </p>
            <button
              className="button-primary"
              onClick={() => setSuccess(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
