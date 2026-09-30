
import React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function Register() {
    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
        phone: "",
        role: "customer"
    });

    const [error, setError] = useState("");
    const navigate = useNavigate();

    async function submit(e) {
        e.preventDefault();
        setError("");

        try {
            await api.post("/auth/register", form);
            navigate("/login");
        } catch (err) {
            setError(
                err.response?.data?.message || "Registration failed."
            );
        }
    }

    return (
        <div className="auth">
            <form className="card" onSubmit={submit}>
                <h1>Create account</h1>

                <input
                    placeholder="Name"
                    type="text"
                    value={form.name}
                    onChange={e =>
                        setForm({ ...form, name: e.target.value })
                    }
                    required
                />

                <input
                    placeholder="Email"
                    type="email"
                    value={form.email}
                    onChange={e =>
                        setForm({ ...form, email: e.target.value })
                    }
                    required
                />

                <input
                    placeholder="Password"
                    type="password"
                    value={form.password}
                    onChange={e =>
                        setForm({ ...form, password: e.target.value })
                    }
                    required
                />

                <input
                    placeholder="Phone"
                    type="text"
                    value={form.phone}
                    onChange={e =>
                        setForm({ ...form, phone: e.target.value })
                    }
                    required
                />

                <select
                    value={form.role}
                    onChange={e =>
                        setForm({ ...form, role: e.target.value })
                    }
                    required
                >
                    <option value="customer">Customer</option>
                    <option value="driver">Driver</option>
                </select>

                <button type="submit">Register</button>

                {error && <p className="error">{error}</p>}

                <p>
                    Already registered? <a href="/login">Login</a>
                </p>
            </form>
        </div>
    );
}

