import React from "react";
import { Link } from "react-router-dom";
export default function Home(){return <main className="hero"><div><p className="eyebrow">YOUR CAR. YOUR DRIVER.</p><h1>Book a driver for your own vehicle.</h1><p>DriveMate connects vehicle owners with verified drivers for safe, scheduled trips.</p><div className="actions"><Link className="button" to="/register">Get Started</Link><Link className="button secondary" to="/login">Login</Link></div></div></main>}
