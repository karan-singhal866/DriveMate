import React from "react";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Nav from "./components/Nav";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";

import CustomerDashboard from "./pages/CustomerDashboard";
import MyVehicles from "./pages/MyVehicles";
import BookDriver from "./pages/BookDriver";
import MyBookings from "./pages/MyBookings";

import Notifications from "./pages/Notifications";

import DriverDashboard from "./pages/DriverDashboard";
import DriverProfile from "./pages/DriverProfile";
import DriverBookings from "./pages/DriverBookings";

import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";
import AdminDrivers from "./pages/AdminDrivers";
import AdminBookings from "./pages/AdminBookings";

export default function App() {
    return (
        <AuthProvider>
            <Nav />

            <Routes>

                {/* Public Routes */}
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />


                {/* Customer Routes */}
                <Route element={<ProtectedRoute roles={["customer"]} />}>
                    <Route
                        path="/customer"
                        element={<CustomerDashboard />}
                    />

                    <Route
                        path="/customer/vehicles"
                        element={<MyVehicles />}
                    />

                    <Route
                        path="/customer/book"
                        element={<BookDriver />}
                    />

                    <Route
                        path="/customer/bookings"
                        element={<MyBookings />}
                    />
                </Route>


                {/* Driver Routes */}
                <Route element={<ProtectedRoute roles={["driver"]} />}>
                    <Route
                        path="/driver"
                        element={<DriverDashboard />}
                    />

                    <Route
                        path="/driver/profile"
                        element={<DriverProfile />}
                    />

                    <Route
                        path="/driver/bookings"
                        element={<DriverBookings />}
                    />
                </Route>


                {/* Notifications - Customer + Driver */}
                <Route
                    element={
                        <ProtectedRoute
                            roles={["customer", "driver"]}
                        />
                    }
                >
                    <Route
                        path="/notifications"
                        element={<Notifications />}
                    />
                </Route>


                {/* Admin Routes */}
                <Route element={<ProtectedRoute roles={["admin"]} />}>
                    <Route path="/admin" element={<AdminDashboard />} />
                    <Route path="/admin/users" element={<AdminUsers />} />
                    <Route path="/admin/drivers" element={<AdminDrivers />} />
                    <Route path="/admin/bookings" element={<AdminBookings />} />
                </Route>

            </Routes>
        </AuthProvider>
    );
}