import React, { useEffect, useState } from "react";
import api from "../services/api";
import BackButton from "../components/BackButton";

export default function MyVehicles() {
  const [vehicles, setVehicles] = useState([]);

  const [form, setForm] = useState({
    vehicleNumber: "",
    vehicleType: "",
    brand: "",
    model: "",
    fuelType: "petrol",
  });

  const [error, setError] = useState("");

  // Load user's vehicles
  const load = async () => {
    try {
      const response = await api.get("/vehicles/my");

      setVehicles(response.data.vehicles || []);
    } catch (error) {
      console.error(
        "Failed to load vehicles:",
        error.response?.data || error.message
      );

      setError(
        error.response?.data?.message ||
          "Failed to load vehicles."
      );
    }
  };

  // Initial load
  useEffect(() => {
    load();
  }, []);

  // Add vehicle
  async function submit(e) {
    e.preventDefault();

    setError("");

    try {
      const response = await api.post(
        "/vehicles/create",
        form
      );

      /*
        If the backend returns the newly created vehicle,
        add it directly to the current list.
      */
      if (response.data.vehicle) {
        setVehicles((prevVehicles) => [
          ...prevVehicles,
          response.data.vehicle,
        ]);
      } else {
        /*
          Fallback for the current backend response if it
          doesn't return the created vehicle.
        */
        await load();
      }

      // Reset form
      setForm({
        vehicleNumber: "",
        vehicleType: "",
        brand: "",
        model: "",
        fuelType: "petrol",
      });
    } catch (error) {
      console.error(
        "Vehicle creation failed:",
        error.response?.data || error.message
      );

      setError(
        error.response?.data?.message ||
          "Failed to add vehicle."
      );
    }
  }

  return (
    <main className="container">
      <BackButton />

      <h1>My Vehicles</h1>

      <form
        className="card formgrid"
        onSubmit={submit}
      >
        {[
          "vehicleNumber",
          "vehicleType",
          "brand",
          "model",
        ].map((key) => (
          <input
            key={key}
            placeholder={key}
            value={form[key]}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                [key]: e.target.value,
              }))
            }
            required
          />
        ))}

        <select
          value={form.fuelType}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              fuelType: e.target.value,
            }))
          }
        >
          {[
            "petrol",
            "diesel",
            "cng",
            "electric",
            "hybrid",
          ].map((fuelType) => (
            <option
              key={fuelType}
              value={fuelType}
            >
              {fuelType}
            </option>
          ))}
        </select>

        <button type="submit">
          Add Vehicle
        </button>
      </form>

      {error && (
        <p className="error">
          {error}
        </p>
      )}

      <div className="list">
        {vehicles.map((vehicle) => (
          <div
            className="card"
            key={vehicle._id}
          >
            <b>{vehicle.vehicleNumber}</b>

            <p>
              {vehicle.brand} {vehicle.model} ·{" "}
              {vehicle.vehicleType} ·{" "}
              {vehicle.fuelType}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}